const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

// ──────────────────────────────────────────────────────────────
// IMPORTANT: static paths (/history/*,  /date/*) MUST come
// before the /:id wildcard, otherwise Express matches "history"
// as an id and returns 404.
// ──────────────────────────────────────────────────────────────

// Get past bids history
router.get('/history/past-bids', verifyToken, async (req, res) => {
  try {
    const [history] = await pool.execute(`
      SELECT 
        r.id as recall_id,
        r.date,
        r.start_time,
        r.end_time,
        r.suburb,
        r.station,
        r.description,
        r.status as recall_status,
        u.staff_number,
        u.first_name,
        u.last_name,
        rr.response,
        rr.response_time,
        ra.user_id as assigned_user_id,
        ra.status as assignment_status,
        ra.assigned_at,
        ra.hours,
        a.first_name as assigned_by_first_name,
        a.last_name as assigned_by_last_name
      FROM recalls r
      LEFT JOIN recall_responses rr ON r.id = rr.recall_id
      LEFT JOIN users u ON rr.user_id = u.id
      LEFT JOIN recall_assignments ra ON r.id = ra.recall_id
      LEFT JOIN users a ON ra.assigned_by = a.id
      WHERE r.date < CURDATE()
      ORDER BY r.date DESC, r.start_time DESC, u.last_name ASC
    `);

    res.json({ history });
  } catch (error) {
    console.error('Error fetching past bids:', error);
    res.status(500).json({ error: 'Failed to fetch past bids' });
  }
});

// Get user's bidding history
router.get('/history/my-bids', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [history] = await pool.execute(`
      SELECT 
        r.id as recall_id,
        r.date,
        r.start_time,
        r.end_time,
        r.suburb,
        r.station,
        r.description,
        r.status as recall_status,
        rr.response,
        rr.response_time,
        ra.user_id as assigned_user_id,
        ra.status as assignment_status,
        ra.assigned_at,
        ra.hours
      FROM recalls r
      INNER JOIN recall_responses rr ON r.id = rr.recall_id AND rr.user_id = ?
      LEFT JOIN recall_assignments ra ON r.id = ra.recall_id
      ORDER BY r.date DESC, r.start_time DESC
    `, [userId]);

    res.json({ history });
  } catch (error) {
    console.error('Error fetching user bidding history:', error);
    res.status(500).json({ error: 'Failed to fetch bidding history' });
  }
});

// Get recalls for a specific date
router.get('/date/:date', verifyToken, async (req, res) => {
  try {
    const { date } = req.params;
    
    const [recalls] = await pool.execute(`
      SELECT 
        r.*,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        COUNT(rr.id) as total_responses,
        COUNT(CASE WHEN rr.response = 'bid' THEN 1 END) as total_bids,
        (SELECT ra2.user_id FROM recall_assignments ra2 WHERE ra2.recall_id = r.id LIMIT 1) as assigned_user_id,
        (SELECT ra2.status  FROM recall_assignments ra2 WHERE ra2.recall_id = r.id LIMIT 1) as assignment_status
      FROM recalls r
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN recall_responses rr ON r.id = rr.recall_id
      WHERE r.date = ?
      GROUP BY r.id
      ORDER BY r.start_time ASC
    `, [date]);

    res.json({ recalls });
  } catch (error) {
    console.error('Error fetching recalls for date:', error);
    res.status(500).json({ error: 'Failed to fetch recalls for date' });
  }
});

// Get all recalls with bidding information
router.get('/', verifyToken, async (req, res) => {
  try {
    const [recalls] = await pool.execute(`
      SELECT 
        r.*,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        COUNT(rr.id) as total_responses,
        COUNT(CASE WHEN rr.response = 'bid' THEN 1 END) as total_bids,
        (SELECT ra2.user_id FROM recall_assignments ra2 WHERE ra2.recall_id = r.id LIMIT 1) as assigned_user_id,
        (SELECT ra2.status  FROM recall_assignments ra2 WHERE ra2.recall_id = r.id LIMIT 1) as assignment_status
      FROM recalls r
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN recall_responses rr ON r.id = rr.recall_id
      GROUP BY r.id
      ORDER BY r.date ASC, r.start_time ASC
    `);

    res.json({ recalls });
  } catch (error) {
    console.error('Error fetching recalls:', error);
    res.status(500).json({ error: 'Failed to fetch recalls' });
  }
});

// Get recall details with bidding information
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get recall details
    const [recalls] = await pool.execute(`
      SELECT 
        r.*,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
      FROM recalls r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.id = ?
    `, [id]);

    if (recalls.length === 0) {
      return res.status(404).json({ error: 'Recall not found' });
    }

    const recall = recalls[0];

    // Get all users with their bidding status
    // NOTE: get_days_since_last_recall() is a DB function; if it doesn't
    //       exist yet fall back to a large constant so the query still works.
    let users;
    try {
      const [rows] = await pool.execute(`
        SELECT 
          u.id,
          u.staff_number,
          u.first_name,
          u.last_name,
          u.station,
          u.phone,
          u.email,
          COALESCE(rr.response, 'not_bid') as bid_status,
          rr.response_time,
          get_days_since_last_recall(u.id) as days_since_last_recall
        FROM users u
        LEFT JOIN recall_responses rr ON u.id = rr.user_id AND rr.recall_id = ?
        WHERE u.email_verified = 1
        ORDER BY days_since_last_recall DESC, u.last_name ASC, u.first_name ASC
      `, [id]);
      users = rows;
    } catch (fnErr) {
      // Function might not exist yet — return users without ranking
      console.warn('get_days_since_last_recall not available, returning users without ranking');
      const [rows] = await pool.execute(`
        SELECT 
          u.id,
          u.staff_number,
          u.first_name,
          u.last_name,
          u.station,
          u.phone,
          u.email,
          COALESCE(rr.response, 'not_bid') as bid_status,
          rr.response_time,
          9999 as days_since_last_recall
        FROM users u
        LEFT JOIN recall_responses rr ON u.id = rr.user_id AND rr.recall_id = ?
        WHERE u.email_verified = 1
        ORDER BY u.last_name ASC, u.first_name ASC
      `, [id]);
      users = rows;
    }

    // Get assignment if exists
    const [assignments] = await pool.execute(`
      SELECT 
        ra.*,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name,
        a.first_name as assigned_by_first_name,
        a.last_name as assigned_by_last_name
      FROM recall_assignments ra
      LEFT JOIN users u ON ra.user_id = u.id
      LEFT JOIN users a ON ra.assigned_by = a.id
      WHERE ra.recall_id = ?
    `, [id]);

    res.json({
      recall,
      users,
      assignment: assignments.length > 0 ? assignments[0] : null
    });
  } catch (error) {
    console.error('Error fetching recall details:', error);
    res.status(500).json({ error: 'Failed to fetch recall details' });
  }
});

// Submit a bid response
router.post('/:id/bid', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;
    const userId = req.user.id;

    if (!['bid', 'not_available', 'not_bid'].includes(response)) {
      return res.status(400).json({ error: 'Invalid response type' });
    }

    const [recalls] = await pool.execute(
      'SELECT * FROM recalls WHERE id = ? AND status = "active"',
      [id]
    );

    if (recalls.length === 0) {
      return res.status(404).json({ error: 'Recall not found or not active' });
    }

    const [assignments] = await pool.execute(
      'SELECT * FROM recall_assignments WHERE recall_id = ?',
      [id]
    );

    if (assignments.length > 0) {
      return res.status(400).json({ error: 'Recall is already assigned' });
    }

    await pool.execute(`
      INSERT INTO recall_responses (recall_id, user_id, response, response_time)
      VALUES (?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE 
        response = VALUES(response),
        response_time = NOW()
    `, [id, userId, response]);

    res.json({ message: 'Bid response submitted successfully' });
  } catch (error) {
    console.error('Error submitting bid:', error);
    res.status(500).json({ error: 'Failed to submit bid' });
  }
});

// Award recall to a user (admin only)
router.post('/:id/award', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, hours, note } = req.body;
    const adminId = req.user.id;

    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [recalls] = await pool.execute(
      'SELECT * FROM recalls WHERE id = ? AND status = "active"',
      [id]
    );

    if (recalls.length === 0) {
      return res.status(404).json({ error: 'Recall not found or not active' });
    }

    const [assignments] = await pool.execute(
      'SELECT * FROM recall_assignments WHERE recall_id = ?',
      [id]
    );

    if (assignments.length > 0) {
      return res.status(400).json({ error: 'Recall is already assigned' });
    }

    const [responses] = await pool.execute(
      'SELECT * FROM recall_responses WHERE recall_id = ? AND user_id = ? AND response = "bid"',
      [id, user_id]
    );

    if (responses.length === 0) {
      return res.status(400).json({ error: 'User has not bid on this recall' });
    }

    const recall = recalls[0];
    const startTime = new Date(`2000-01-01 ${recall.start_time}`);
    const endTime = new Date(`2000-01-01 ${recall.end_time}`);
    const calculatedHours = (endTime - startTime) / (1000 * 60 * 60);

    await pool.execute(`
      INSERT INTO recall_assignments (recall_id, user_id, assigned_by, hours, assignment_note)
      VALUES (?, ?, ?, ?, ?)
    `, [id, user_id, adminId, hours || calculatedHours, note || null]);

    res.json({ message: 'Recall awarded successfully' });
  } catch (error) {
    console.error('Error awarding recall:', error);
    res.status(500).json({ error: 'Failed to award recall' });
  }
});

module.exports = router;
