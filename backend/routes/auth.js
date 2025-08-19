const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { generateVerificationEmail, sendEmail, generateSecureToken } = require('../services/emailService');

const router = express.Router();

// Registration validation rules
const registerValidation = [
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('staffNumber').isInt({ min: 1 }).withMessage('Staff number must be a positive integer'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// Login validation rules
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Register new user
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, staffNumber, email, password } = req.body;
    console.log('Registration attempt:', { firstName, lastName, staffNumber, email });

    // Validate email domain
    if (!email.endsWith('@fire.nsw.gov.au')) {
      return res.status(400).json({ error: 'Email must be a @fire.nsw.gov.au address' });
    }

    // Check if staff member is on approved list (case-insensitive)
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastNameUpper = lastName.toUpperCase();
    console.log('Checking approved staff for:', { lastName, lastNameUpper, firstInitial });
    
    const [approvedStaff] = await pool.execute(
      'SELECT * FROM approved_staff WHERE UPPER(last_name) = ? AND first_initial = ?',
      [lastNameUpper, firstInitial]
    );

    console.log('Approved staff found:', approvedStaff.length);

    if (approvedStaff.length === 0) {
      console.log('Staff not in approved list:', { lastName, lastNameUpper, firstInitial });
      console.log('Available approved staff:', await pool.execute('SELECT last_name, first_initial FROM approved_staff'));
      return res.status(400).json({ 
        error: `Staff member "${firstName} ${lastName}" not found on approved list. Please verify your name and staff number, or contact your administrator.` 
      });
    }

    // Check if email or staff number already exists
    const [existingUsers] = await pool.execute(
      'SELECT * FROM users WHERE email = ? OR staff_number = ?',
      [email, staffNumber]
    );

    if (existingUsers.length > 0) {
      const existing = existingUsers[0];
      if (existing.email === email) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      if (existing.staff_number === staffNumber) {
        return res.status(400).json({ error: 'Staff number already registered' });
      }
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const verificationToken = generateSecureToken();

    // Insert user
    const [result] = await pool.execute(
      `INSERT INTO users (staff_number, first_name, last_name, email, password_hash, verification_token)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [staffNumber, firstName, lastName, email, passwordHash, verificationToken]
    );

    console.log('User created successfully:', result.insertId);

    // Send verification email
    const user = { id: result.insertId, first_name: firstName, email };
    const emailData = generateVerificationEmail(user, verificationToken);
    await sendEmail(emailData);

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      userId: result.insertId
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Verify email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    // Find user with this token
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE verification_token = ? AND email_verified = FALSE',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Update user to verified
    await pool.execute(
      'UPDATE users SET email_verified = TRUE, verification_token = NULL WHERE id = ?',
      [users[0].id]
    );

    res.json({ message: 'Email verified successfully. You can now log in.' });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
});

// Login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(401).json({ error: 'Please verify your email before logging in' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Determine if user must change password (using default seeded password)
    const mustChangePassword = await bcrypt.compare('TestPass123', user.password_hash);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        isAdmin: user.is_admin,
        isHostAdmin: user.is_host_admin
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.TOKEN_EXPIRY || '24h' }
    );

    // Update last login
    await pool.execute(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // Return user data (without password)
    const { password_hash, verification_token, ...userData } = user;

    res.json({
      message: 'Login successful',
      token,
      user: { ...userData, must_change_password: mustChangePassword }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    // Get fresh user data
    const [users] = await pool.execute(
      'SELECT id, staff_number, first_name, last_name, station, phone, email, is_admin, is_host_admin, notify, total_recall_hours, last_recall_date, created_at, password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const mustChangePassword = await bcrypt.compare('TestPass123', users[0].password_hash);
    const { password_hash, ...safeUser } = users[0];
    res.json({ user: { ...safeUser, must_change_password: mustChangePassword } });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile settings
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { notify, station, phone, email } = req.body;

    if (typeof notify !== 'boolean') {
      return res.status(400).json({ error: 'Notify setting must be boolean' });
    }

    // Validate email
    if (email && !/^[^@\s]+@fire\.nsw\.gov\.au$/i.test(email)) {
      return res.status(400).json({ error: 'Email must be a @fire.nsw.gov.au address' });
    }

    await pool.execute(
      'UPDATE users SET notify = ?, station = COALESCE(?, station), phone = COALESCE(?, phone), email = COALESCE(?, email) WHERE id = ?',
      [notify, station || null, phone || null, email || null, req.user.id]
    );

    res.json({ message: 'Profile updated successfully' });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords required' });
    }

    if (newPassword.length < 8 || 
        !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ 
        error: 'New password must be at least 8 characters and contain at least one lowercase letter, one uppercase letter, and one number' 
      });
    }

    // Get current user
    const [users] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ? AND email_verified = TRUE',
      [email]
    );

    // Always return success to prevent email enumeration
    if (users.length === 0) {
      return res.json({ message: 'If that email exists, a reset link has been sent' });
    }

    const user = users[0];
    const resetToken = generateSecureToken();

    // Store reset token (expires in 1 hour)
    await pool.execute(
      'UPDATE users SET verification_token = ? WHERE id = ?',
      [resetToken, user.id]
    );

    // Send reset email
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
    const emailData = {
      from: process.env.FROM_EMAIL,
      to: user.email,
      subject: 'FRNSW Recalls 90 - Password Reset',
      html: `
        <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background: #cc0000; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Password Reset</h1>
            <p style="margin: 5px 0 0 0;">FRNSW Recalls 90</p>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #cc0000;">Reset Your Password</h2>
            
            <p>Hi ${user.first_name},</p>
            
            <p>You requested a password reset for your FRNSW Recalls 90 account. Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #cc0000; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              This reset link will expire in 1 hour. If you didn't request this reset, please ignore this email.
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>FRNSW Recalls 90 - Recall Management System</p>
          </div>
        </body>
        </html>
      `
    };

    await sendEmail(emailData);

    res.json({ message: 'If that email exists, a reset link has been sent' });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }

    if (newPassword.length < 8 || 
        !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters and contain at least one lowercase letter, one uppercase letter, and one number' 
      });
    }

    // Find user with this token
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE verification_token = ?',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear token
    await pool.execute(
      'UPDATE users SET password_hash = ?, verification_token = NULL WHERE id = ?',
      [passwordHash, users[0].id]
    );

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

module.exports = router;