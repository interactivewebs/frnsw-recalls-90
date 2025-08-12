const cron = require('cron');
const { pool } = require('../config/database');
const { recalculateAllUserHours } = require('../services/fairnessService');

// Daily job: Recalculate user recall hours
const dailyRecalculation = new cron.CronJob(
  '0 2 * * *', // Every day at 2:00 AM
  async () => {
    try {
      console.log('🔄 Starting daily recall hours recalculation...');
      const updatedCount = await recalculateAllUserHours();
      console.log(`✅ Daily recalculation completed. Updated ${updatedCount} users.`);
    } catch (error) {
      console.error('❌ Daily recalculation failed:', error);
    }
  },
  null,
  false, // Don't start immediately
  'Australia/Sydney'
);

// Monthly job: Archive old data
const monthlyArchive = new cron.CronJob(
  '0 3 1 * *', // First day of every month at 3:00 AM
  async () => {
    try {
      console.log('📦 Starting monthly data archival...');
      
      // Archive recalls older than 24 months
      const archiveCutoff = new Date();
      archiveCutoff.setMonth(archiveCutoff.getMonth() - 24);
      
      // Insert old recalls into archive
      const [recallsArchived] = await pool.execute(`
        INSERT INTO recalls_archive 
        (original_id, date, start_time, end_time, suburb, station, description, status, cancellation_reason, created_by, created_at, updated_at)
        SELECT id, date, start_time, end_time, suburb, station, description, status, cancellation_reason, created_by, created_at, updated_at
        FROM recalls 
        WHERE date < ?
      `, [archiveCutoff.toISOString().split('T')[0]]);
      
      // Insert old assignments into archive
      const [assignmentsArchived] = await pool.execute(`
        INSERT INTO recall_assignments_archive 
        (original_id, recall_id, user_id, assigned_by, assigned_at, is_manual_assignment, assignment_note, conflict_override, hours)
        SELECT ra.id, ra.recall_id, ra.user_id, ra.assigned_by, ra.assigned_at, ra.is_manual_assignment, ra.assignment_note, ra.conflict_override, ra.hours
        FROM recall_assignments ra
        JOIN recalls r ON ra.recall_id = r.id
        WHERE r.date < ?
      `, [archiveCutoff.toISOString().split('T')[0]]);
      
      // Delete old assignments first (foreign key constraint)
      const [assignmentsDeleted] = await pool.execute(`
        DELETE ra FROM recall_assignments ra
        JOIN recalls r ON ra.recall_id = r.id
        WHERE r.date < ?
      `, [archiveCutoff.toISOString().split('T')[0]]);
      
      // Delete old recall responses
      const [responsesDeleted] = await pool.execute(`
        DELETE rr FROM recall_responses rr
        JOIN recalls r ON rr.recall_id = r.id
        WHERE r.date < ?
      `, [archiveCutoff.toISOString().split('T')[0]]);
      
      // Delete old recall edits
      const [editsDeleted] = await pool.execute(`
        DELETE re FROM recall_edits re
        JOIN recalls r ON re.recall_id = r.id
        WHERE r.date < ?
      `, [archiveCutoff.toISOString().split('T')[0]]);
      
      // Delete old recalls
      const [recallsDeleted] = await pool.execute(`
        DELETE FROM recalls WHERE date < ?
      `, [archiveCutoff.toISOString().split('T')[0]]);
      
      console.log(`✅ Monthly archival completed:`);
      console.log(`   - Recalls archived: ${recallsArchived.affectedRows}`);
      console.log(`   - Assignments archived: ${assignmentsArchived.affectedRows}`);
      console.log(`   - Assignments deleted: ${assignmentsDeleted.affectedRows}`);
      console.log(`   - Responses deleted: ${responsesDeleted.affectedRows}`);
      console.log(`   - Edits deleted: ${editsDeleted.affectedRows}`);
      console.log(`   - Recalls deleted: ${recallsDeleted.affectedRows}`);
      
      // Recalculate user hours after archival
      await recalculateAllUserHours();
      
    } catch (error) {
      console.error('❌ Monthly archival failed:', error);
    }
  },
  null,
  false, // Don't start immediately
  'Australia/Sydney'
);

// Weekly job: Clean up old push subscriptions and audit logs
const weeklyCleanup = new cron.CronJob(
  '0 4 * * 0', // Every Sunday at 4:00 AM
  async () => {
    try {
      console.log('🧹 Starting weekly cleanup...');
      
      // Clean up audit logs older than 12 months
      const auditCutoff = new Date();
      auditCutoff.setMonth(auditCutoff.getMonth() - 12);
      
      const [auditDeleted] = await pool.execute(`
        DELETE FROM admin_audit_log WHERE created_at < ?
      `, [auditCutoff.toISOString()]);
      
      // Clean up old verification tokens (older than 7 days)
      const tokenCutoff = new Date();
      tokenCutoff.setDate(tokenCutoff.getDate() - 7);
      
      const [tokensCleared] = await pool.execute(`
        UPDATE users 
        SET verification_token = NULL 
        WHERE verification_token IS NOT NULL 
        AND updated_at < ?
      `, [tokenCutoff.toISOString()]);
      
      console.log(`✅ Weekly cleanup completed:`);
      console.log(`   - Audit logs deleted: ${auditDeleted.affectedRows}`);
      console.log(`   - Verification tokens cleared: ${tokensCleared.affectedRows}`);
      
    } catch (error) {
      console.error('❌ Weekly cleanup failed:', error);
    }
  },
  null,
  false, // Don't start immediately
  'Australia/Sydney'
);

// Database maintenance job (weekly)
const databaseMaintenance = new cron.CronJob(
  '0 5 * * 0', // Every Sunday at 5:00 AM
  async () => {
    try {
      console.log('🔧 Starting database maintenance...');
      
      // Optimize tables
      const tables = [
        'users', 'recalls', 'recall_assignments', 'recall_responses', 
        'recall_edits', 'admin_audit_log', 'push_subscriptions'
      ];
      
      for (const table of tables) {
        try {
          await pool.execute(`OPTIMIZE TABLE ${table}`);
          console.log(`   - Optimized table: ${table}`);
        } catch (error) {
          console.error(`   - Failed to optimize table ${table}:`, error.message);
        }
      }
      
      // Update table statistics
      await pool.execute('ANALYZE TABLE users, recalls, recall_assignments, recall_responses');
      
      console.log('✅ Database maintenance completed');
      
    } catch (error) {
      console.error('❌ Database maintenance failed:', error);
    }
  },
  null,
  false, // Don't start immediately
  'Australia/Sydney'
);

// Function to start all cron jobs
function startCronJobs() {
  try {
    dailyRecalculation.start();
    monthlyArchive.start();
    weeklyCleanup.start();
    databaseMaintenance.start();
    
    console.log('🕒 Cron jobs started:');
    console.log('   - Daily recalculation: Every day at 2:00 AM');
    console.log('   - Monthly archive: 1st of every month at 3:00 AM');
    console.log('   - Weekly cleanup: Every Sunday at 4:00 AM');
    console.log('   - Database maintenance: Every Sunday at 5:00 AM');
    console.log('   - Timezone: Australia/Sydney');
    
  } catch (error) {
    console.error('❌ Failed to start cron jobs:', error);
  }
}

// Function to stop all cron jobs
function stopCronJobs() {
  try {
    dailyRecalculation.stop();
    monthlyArchive.stop();
    weeklyCleanup.stop();
    databaseMaintenance.stop();
    
    console.log('🛑 All cron jobs stopped');
    
  } catch (error) {
    console.error('❌ Failed to stop cron jobs:', error);
  }
}

// Function to get cron job status
function getCronJobStatus() {
  return {
    dailyRecalculation: {
      running: dailyRecalculation.running,
      nextRun: dailyRecalculation.nextDates(1)[0]?.toISOString()
    },
    monthlyArchive: {
      running: monthlyArchive.running,
      nextRun: monthlyArchive.nextDates(1)[0]?.toISOString()
    },
    weeklyCleanup: {
      running: weeklyCleanup.running,
      nextRun: weeklyCleanup.nextDates(1)[0]?.toISOString()
    },
    databaseMaintenance: {
      running: databaseMaintenance.running,
      nextRun: databaseMaintenance.nextDates(1)[0]?.toISOString()
    }
  };
}

// Manual execution functions for testing
async function runDailyRecalculation() {
  console.log('🔄 Running daily recalculation manually...');
  const updatedCount = await recalculateAllUserHours();
  console.log(`✅ Manual recalculation completed. Updated ${updatedCount} users.`);
  return updatedCount;
}

async function runMonthlyArchive() {
  console.log('📦 Running monthly archive manually...');
  await monthlyArchive._callback();
  console.log('✅ Manual archive completed.');
}

async function runWeeklyCleanup() {
  console.log('🧹 Running weekly cleanup manually...');
  await weeklyCleanup._callback();
  console.log('✅ Manual cleanup completed.');
}

async function runDatabaseMaintenance() {
  console.log('🔧 Running database maintenance manually...');
  await databaseMaintenance._callback();
  console.log('✅ Manual maintenance completed.');
}

module.exports = {
  startCronJobs,
  stopCronJobs,
  getCronJobStatus,
  runDailyRecalculation,
  runMonthlyArchive,
  runWeeklyCleanup,
  runDatabaseMaintenance
};