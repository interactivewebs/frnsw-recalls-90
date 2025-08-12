const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure they still exist and are verified
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE id = ? AND email_verified = TRUE',
      [decoded.userId]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'User not found or not verified' });
    }
    
    req.user = rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Verify admin privileges
const requireAdmin = async (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
};

// Verify host admin privileges
const requireHostAdmin = async (req, res, next) => {
  if (!req.user || !req.user.is_host_admin) {
    return res.status(403).json({ error: 'Host admin privileges required' });
  }
  next();
};

// Optional auth - continues if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE id = ? AND email_verified = TRUE',
        [decoded.userId]
      );
      
      if (rows.length > 0) {
        req.user = rows[0];
      }
    }
    
    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

module.exports = {
  verifyToken,
  requireAdmin,
  requireHostAdmin,
  optionalAuth
};