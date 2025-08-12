const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

// Create SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 25),
  secure: false,
  ignoreTLS: true,
  tls: { rejectUnauthorized: false },
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : undefined
});

// Generate secure token for recall responses
function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Email verification template
function generateVerificationEmail(user, token) {
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
  
  return {
    from: process.env.FROM_EMAIL,
    to: user.email,
    subject: 'FRNSW Recalls 90 - Email Verification Required',
    html: `
      <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: #cc0000; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">FRNSW Recalls 90</h1>
          <p style="margin: 5px 0 0 0;">Fire and Rescue NSW - Menai Station 90</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #cc0000;">Welcome ${user.first_name}!</h2>
          
          <p>Your account has been created successfully. Please verify your email address to activate your account.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: #cc0000; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              ✅ Verify Email Address
            </a>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            This verification link will expire in 24 hours. If you didn't create this account, please ignore this email.
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>FRNSW Recalls 90 - Recall Management System<br>
          Fire and Rescue NSW - Menai Station 90</p>
        </div>
      </body>
      </html>
    `
  };
}

// New recall notification template
function generateRecallNotificationEmail(recall, user, availableToken, notAvailableToken) {
  const availableUrl = `${process.env.APP_URL}/api/recalls/${recall.id}/respond?token=${availableToken}&response=available`;
  const notAvailableUrl = `${process.env.APP_URL}/api/recalls/${recall.id}/respond?token=${notAvailableToken}&response=not_available`;
  const recallUrl = `${process.env.APP_URL}/recalls/${recall.id}`;
  
  const startTime = new Date(`${recall.date} ${recall.start_time}`).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const endTime = new Date(`${recall.date} ${recall.end_time}`).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const recallDate = new Date(recall.date).toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return {
    from: process.env.FROM_EMAIL,
    to: user.email,
    subject: `🚨 New Recall - ${recall.suburb} - ${recallDate}`,
    html: `
      <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: #cc0000; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🚨 NEW RECALL NOTIFICATION</h1>
          <p style="margin: 5px 0 0 0;">FRNSW Menai Station 90</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #cc0000; margin-top: 0;">Recall Details</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold; width: 30%;">Station:</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">90 Menai</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Date:</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${recallDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Time:</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${startTime} – ${endTime}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Suburb:</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${recall.suburb}</td>
            </tr>
            ${recall.description ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Details:</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${recall.description}</td>
            </tr>
            ` : ''}
          </table>
          
          <h3 style="color: #cc0000;">Please indicate your availability:</h3>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${availableUrl}" 
               style="background: #28a745; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px; font-weight: bold;">
              ✅ AVAILABLE
            </a>
            <a href="${notAvailableUrl}" 
               style="background: #dc3545; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px; font-weight: bold;">
              ❌ NOT AVAILABLE
            </a>
          </div>
          
          <p style="text-align: center; margin: 20px 0;">
            <a href="${recallUrl}" style="color: #cc0000; text-decoration: none;">
              📱 View in App
            </a>
          </p>
          
          <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
            Please respond as soon as possible to assist with fair assignment of recalls.
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>FRNSW Recalls 90 - Recall Management System<br>
          Fire and Rescue NSW - Menai Station 90</p>
        </div>
      </body>
      </html>
    `
  };
}

// Recall assignment notification template
function generateAssignmentNotificationEmail(recall, assignedUser, assignedBy, isManual, note) {
  const recallUrl = `${process.env.APP_URL}/recalls/${recall.id}`;
  
  const startTime = new Date(`${recall.date} ${recall.start_time}`).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const endTime = new Date(`${recall.date} ${recall.end_time}`).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const recallDate = new Date(recall.date).toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return {
    from: process.env.FROM_EMAIL,
    to: assignedUser.email,
    subject: `📋 Recall Assignment - ${recall.suburb} - ${recallDate}`,
    html: `
      <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: #28a745; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">📋 RECALL ASSIGNMENT</h1>
          <p style="margin: 5px 0 0 0;">FRNSW Menai Station 90</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #28a745; margin-top: 0;">You have been assigned to this recall</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold; width: 30%;">Station:</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">90 Menai</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Date:</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${recallDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Time:</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${startTime} – ${endTime}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Suburb:</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${recall.suburb}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Assigned by:</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${assignedBy.first_name} ${assignedBy.last_name}</td>
            </tr>
            ${isManual ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Assignment Type:</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #ffc107;">Manual Assignment</td>
            </tr>
            ` : ''}
            ${note ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Note:</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${note}</td>
            </tr>
            ` : ''}
          </table>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${recallUrl}" 
               style="background: #cc0000; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              📱 View Recall Details
            </a>
          </div>
          
          <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
            Please ensure you are available for this recall. If you have any conflicts, contact your supervisor immediately.
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>FRNSW Recalls 90 - Recall Management System<br>
          Fire and Rescue NSW - Menai Station 90</p>
        </div>
      </body>
      </html>
    `
  };
}

// Recall cancellation notification template
function generateCancellationNotificationEmail(recall, reason) {
  const recallDate = new Date(recall.date).toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return {
    subject: `❌ Recall Cancelled - ${recall.suburb} - ${recallDate}`,
    html: `
      <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">❌ RECALL CANCELLED</h1>
          <p style="margin: 5px 0 0 0;">FRNSW Menai Station 90</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #dc3545; margin-top: 0;">The following recall has been cancelled</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold; width: 30%;">Date:</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${recallDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Suburb:</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${recall.suburb}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Reason:</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${reason}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>FRNSW Recalls 90 - Recall Management System<br>
          Fire and Rescue NSW - Menai Station 90</p>
        </div>
      </body>
      </html>
    `
  };
}

// Send email function
async function sendEmail(emailData) {
  try {
    const info = await transporter.sendMail(emailData);
    console.log('✅ Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    return false;
  }
}

module.exports = {
  generateSecureToken,
  generateVerificationEmail,
  generateRecallNotificationEmail,
  generateAssignmentNotificationEmail,
  generateCancellationNotificationEmail,
  sendEmail
};