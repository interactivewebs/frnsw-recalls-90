const { pool } = require('../config/database');

/**
 * Fairness Algorithm for Recall Assignment
 * 1. Users with no prior recalls → highest priority
 * 2. Then by lowest total recall hours (24 months)
 * 3. Then by longest since last recall
 * 4. Tie-breaker: lowest staff number
 */

// Calculate recall hours between two dates
function calculateHours(startDate, startTime, endDate, endTime) {
  const start = new Date(`${startDate} ${startTime}`);
  const end = new Date(`${endDate} ${endTime}`);
  return (end - start) / (1000 * 60 * 60); // Convert milliseconds to hours
}

// Check if two time periods overlap
function hasTimeOverlap(date1, start1, end1, date2, start2, end2) {
  if (date1 !== date2) return false;
  
  const startTime1 = new Date(`${date1} ${start1}`);
  const endTime1 = new Date(`${date1} ${end1}`);
  const startTime2 = new Date(`${date2} ${start2}`);
  const endTime2 = new Date(`${date2} ${end2}`);
  
  return startTime1 < endTime2 && startTime2 < endTime1;
}

// Get users sorted by fairness algorithm
async function getUsersByFairness(recallDate, recallStartTime, recallEndTime) {
  try {
    // Get all verified users with their recall statistics
    const [users] = await pool.execute(`
      SELECT 
        u.id,
        u.staff_number,
        u.first_name,
        u.last_name,
        u.email,
        u.total_recall_hours,
        u.last_recall_date,
        COALESCE(
          (SELECT COUNT(*) FROM recall_assignments ra 
           JOIN recalls r ON ra.recall_id = r.id 
           WHERE ra.user_id = u.id 
           AND r.date >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
           AND r.status != 'cancelled'), 0
        ) as total_recalls_24m,
        COALESCE(
          DATEDIFF(CURDATE(), u.last_recall_date), 999999
        ) as days_since_last_recall
      FROM users u
      WHERE u.email_verified = TRUE
      ORDER BY 
        total_recalls_24m ASC,           -- Users with no recalls first
        u.total_recall_hours ASC,        -- Then by lowest hours
        days_since_last_recall DESC,     -- Then by longest since last
        u.staff_number ASC               -- Tie-breaker
    `);

    // Check for conflicts with existing recalls
    const usersWithAvailability = await Promise.all(
      users.map(async (user) => {
        const [conflicts] = await pool.execute(`
          SELECT r.id, r.date, r.start_time, r.end_time, r.suburb
          FROM recalls r
          JOIN recall_assignments ra ON r.id = ra.recall_id
          WHERE ra.user_id = ? 
          AND r.status = 'active'
          AND r.date = ?
        `, [user.id, recallDate]);

        const hasConflict = conflicts.some(conflict =>
          hasTimeOverlap(
            recallDate, recallStartTime, recallEndTime,
            conflict.date, conflict.start_time, conflict.end_time
          )
        );

        return {
          ...user,
          hasConflict,
          conflicts: hasConflict ? conflicts : []
        };
      })
    );

    return usersWithAvailability;

  } catch (error) {
    console.error('Error getting users by fairness:', error);
    throw error;
  }
}

// Get users who responded as available for a recall
async function getAvailableUsers(recallId) {
  try {
    const [availableUsers] = await pool.execute(`
      SELECT 
        u.id,
        u.staff_number,
        u.first_name,
        u.last_name,
        u.email,
        u.total_recall_hours,
        u.last_recall_date,
        rr.response_time,
        COALESCE(
          (SELECT COUNT(*) FROM recall_assignments ra 
           JOIN recalls r ON ra.recall_id = r.id 
           WHERE ra.user_id = u.id 
           AND r.date >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
           AND r.status != 'cancelled'), 0
        ) as total_recalls_24m,
        COALESCE(
          DATEDIFF(CURDATE(), u.last_recall_date), 999999
        ) as days_since_last_recall
      FROM users u
      JOIN recall_responses rr ON u.id = rr.user_id
      WHERE rr.recall_id = ? 
      AND rr.response = 'available'
      AND u.email_verified = TRUE
      ORDER BY 
        total_recalls_24m ASC,
        u.total_recall_hours ASC,
        days_since_last_recall DESC,
        u.staff_number ASC
    `, [recallId]);

    return availableUsers;

  } catch (error) {
    console.error('Error getting available users:', error);
    throw error;
  }
}

// Determine if assignment is manual (bypasses fairness algorithm)
async function isManualAssignment(recallId, assignedUserId) {
  try {
    const availableUsers = await getAvailableUsers(recallId);
    
    if (availableUsers.length === 0) {
      return true; // Manual if no one is available
    }
    
    // Check if assigned user is the top candidate
    const topCandidate = availableUsers[0];
    return topCandidate.id !== assignedUserId;

  } catch (error) {
    console.error('Error checking manual assignment:', error);
    throw error;
  }
}

// Update user's total recall hours
async function updateUserRecallHours(userId) {
  try {
    const [result] = await pool.execute(`
      UPDATE users 
      SET total_recall_hours = (
        SELECT COALESCE(SUM(ra.hours), 0)
        FROM recall_assignments ra
        JOIN recalls r ON ra.recall_id = r.id
        WHERE ra.user_id = ?
        AND r.date >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
        AND r.status != 'cancelled'
      ),
      last_recall_date = (
        SELECT MAX(r.date)
        FROM recall_assignments ra
        JOIN recalls r ON ra.recall_id = r.id
        WHERE ra.user_id = ?
        AND r.status != 'cancelled'
      )
      WHERE id = ?
    `, [userId, userId, userId]);

    return result.affectedRows > 0;

  } catch (error) {
    console.error('Error updating user recall hours:', error);
    throw error;
  }
}

// Recalculate all users' recall hours (for cron job)
async function recalculateAllUserHours() {
  try {
    console.log('Starting recalculation of all user recall hours...');
    
    const [users] = await pool.execute('SELECT id FROM users WHERE email_verified = TRUE');
    
    let updated = 0;
    for (const user of users) {
      const success = await updateUserRecallHours(user.id);
      if (success) updated++;
    }
    
    console.log(`✅ Recalculated recall hours for ${updated} users`);
    return updated;

  } catch (error) {
    console.error('Error recalculating all user hours:', error);
    throw error;
  }
}

// Get fairness statistics for reports
async function getFairnessStatistics(startDate = null, endDate = null) {
  try {
    let dateFilter = '';
    let params = [];
    
    if (startDate && endDate) {
      dateFilter = 'AND r.date BETWEEN ? AND ?';
      params = [startDate, endDate];
    } else {
      dateFilter = 'AND r.date >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)';
    }

    const [stats] = await pool.execute(`
      SELECT 
        u.id,
        u.staff_number,
        u.first_name,
        u.last_name,
        COALESCE(COUNT(ra.id), 0) as total_recalls,
        COALESCE(SUM(ra.hours), 0) as total_hours,
        COALESCE(AVG(ra.hours), 0) as avg_hours_per_recall,
        MAX(r.date) as last_recall_date,
        COALESCE(
          SUM(CASE WHEN ra.is_manual_assignment = TRUE THEN 1 ELSE 0 END), 0
        ) as manual_assignments,
        COALESCE(
          DATEDIFF(CURDATE(), MAX(r.date)), NULL
        ) as days_since_last_recall
      FROM users u
      LEFT JOIN recall_assignments ra ON u.id = ra.user_id
      LEFT JOIN recalls r ON ra.recall_id = r.id AND r.status != 'cancelled' ${dateFilter}
      WHERE u.email_verified = TRUE
      GROUP BY u.id, u.staff_number, u.first_name, u.last_name
      ORDER BY total_recalls ASC, total_hours ASC, u.staff_number ASC
    `, params);

    return stats;

  } catch (error) {
    console.error('Error getting fairness statistics:', error);
    throw error;
  }
}

// Check for potential conflicts when user responds available
async function checkUserConflicts(userId, recallId) {
  try {
    const [recall] = await pool.execute(
      'SELECT date, start_time, end_time FROM recalls WHERE id = ?',
      [recallId]
    );

    if (recall.length === 0) {
      throw new Error('Recall not found');
    }

    const { date, start_time, end_time } = recall[0];

    const [conflicts] = await pool.execute(`
      SELECT r.id, r.date, r.start_time, r.end_time, r.suburb
      FROM recalls r
      JOIN recall_assignments ra ON r.id = ra.recall_id
      WHERE ra.user_id = ? 
      AND r.status = 'active'
      AND r.date = ?
      AND r.id != ?
    `, [userId, date, recallId]);

    const overlappingConflicts = conflicts.filter(conflict =>
      hasTimeOverlap(
        date, start_time, end_time,
        conflict.date, conflict.start_time, conflict.end_time
      )
    );

    return overlappingConflicts;

  } catch (error) {
    console.error('Error checking user conflicts:', error);
    throw error;
  }
}

module.exports = {
  calculateHours,
  hasTimeOverlap,
  getUsersByFairness,
  getAvailableUsers,
  isManualAssignment,
  updateUserRecallHours,
  recalculateAllUserHours,
  getFairnessStatistics,
  checkUserConflicts
};