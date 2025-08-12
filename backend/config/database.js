const mysql = require('mysql2/promise');
require('dotenv').config();

// Create database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Initialize database with seed data if needed
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Check if approved_staff table has data
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM approved_staff');
    
    if (rows[0].count === 0) {
      console.log('Seeding approved_staff table...');
      await connection.execute(`
        INSERT INTO approved_staff (last_name, first_initial) VALUES
        ('White', 'C'),
        ('Clarke', 'B'),
        ('Miller', 'B'),
        ('Finley', 'D')
      `);
      console.log('✅ Approved staff seeded successfully');
    }
    
    connection.release();
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
  }
}

module.exports = {
  pool,
  testConnection,
  initializeDatabase
};