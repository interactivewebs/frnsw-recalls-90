const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

// Import database and services
const { testConnection, initializeDatabase } = require('./config/database');
const { verifyToken } = require('./middleware/auth');
// const { startCronJobs } = require('./scripts/cronJobs');

// Import routes (tolerate missing route files during initial bootstrap)
const authRoutes = require('./routes/auth');
const safeRequire = (p) => { try { return require(p); } catch (e) { console.warn(`Route not found, skipping: ${p}`); return null; } };
const recallRoutes = safeRequire('./routes/recalls');
const adminRoutes = safeRequire('./routes/admin');
const reportsRoutes = safeRequire('./routes/reports');
// const pushRoutes = safeRequire('./routes/push');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["https://interactivewebs.com", "https://www.interactivewebs.com"]
      : ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Auth rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // limit each IP to 5 auth requests per windowMs
  skipSuccessfulRequests: true
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ["https://interactivewebs.com", "https://www.interactivewebs.com"]
    : ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic API status endpoint for monitoring
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'FRNSW Recalls 90 API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
if (recallRoutes) app.use('/api/recalls', recallRoutes);
if (adminRoutes) app.use('/api/admin', adminRoutes);
if (reportsRoutes) app.use('/api/reports', reportsRoutes);
// app.use('/api/push', pushRoutes);

// Serve static files from React build (production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  // Handle React routing - return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Mock req object for auth middleware
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    
    await new Promise((resolve, reject) => {
      verifyToken(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    socket.user = req.user;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.user.first_name} ${socket.user.last_name} (${socket.user.email})`);
  
  // Join user to their personal room for targeted notifications
  socket.join(`user_${socket.user.id}`);
  
  // Join admin room if user is admin
  if (socket.user.is_admin) {
    socket.join('admins');
  }

  // Handle recall response updates
  socket.on('recall_response', (data) => {
    // Broadcast to all connected clients
    socket.broadcast.emit('recall_updated', {
      recallId: data.recallId,
      userId: socket.user.id,
      userName: `${socket.user.first_name} ${socket.user.last_name}`,
      response: data.response,
      timestamp: new Date().toISOString()
    });
  });

  // Handle assignment updates (admin only)
  socket.on('recall_assignment', (data) => {
    if (socket.user.is_admin) {
      socket.broadcast.emit('assignment_updated', {
        recallId: data.recallId,
        assignedUserId: data.assignedUserId,
        assignedByName: `${socket.user.first_name} ${socket.user.last_name}`,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.user.first_name} ${socket.user.last_name}`);
  });
});

// Broadcast functions for use in routes
const broadcastToUsers = (eventName, data) => {
  io.emit(eventName, data);
};

const broadcastToAdmins = (eventName, data) => {
  io.to('admins').emit(eventName, data);
};

const broadcastToUser = (userId, eventName, data) => {
  io.to(`user_${userId}`).emit(eventName, data);
};

// Make broadcast functions available globally
global.socketBroadcast = {
  toUsers: broadcastToUsers,
  toAdmins: broadcastToAdmins,
  toUser: broadcastToUser
};

// Initialize server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Initialize database with seed data
    await initializeDatabase();

    // Start cron jobs for maintenance
    // startCronJobs();

    // Start server
    server.listen(PORT, () => {
      console.log(`
🚒 FRNSW Recalls 90 Server Started
======================================
🌐 Port: ${PORT}
🔧 Environment: ${process.env.NODE_ENV || 'development'}
📧 Email: ${process.env.FROM_EMAIL || 'Not configured'}
🔗 URL: ${process.env.APP_URL || `http://localhost:${PORT}`}
======================================
      `);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

module.exports = { app, server, io };