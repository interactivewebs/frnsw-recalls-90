const express = require('express');
const webpush = require('web-push');
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  // Ensure VAPID email is in proper mailto: format
  const vapidEmail = process.env.VAPID_EMAIL || 'mailto:FRNSWRecalls90@interactivewebs.com';
  const formattedVapidEmail = vapidEmail.startsWith('mailto:') ? vapidEmail : `mailto:${vapidEmail}`;
  
  webpush.setVapidDetails(
    formattedVapidEmail,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('⚠️  VAPID keys not configured. Push notifications will not work.');
}

// Get VAPID public key for client
router.get('/vapid-public-key', (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) {
    return res.status(500).json({ error: 'Push notifications not configured' });
  }
  
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Subscribe to push notifications
router.post('/subscribe', verifyToken, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    // Store subscription in database
    await pool.execute(`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        endpoint = VALUES(endpoint),
        p256dh = VALUES(p256dh),
        auth = VALUES(auth)
    `, [req.user.id, endpoint, keys.p256dh, keys.auth]);

    res.json({ message: 'Subscription saved successfully' });

  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// Unsubscribe from push notifications
router.delete('/subscribe', verifyToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }

    await pool.execute(`
      DELETE FROM push_subscriptions 
      WHERE user_id = ? AND endpoint = ?
    `, [req.user.id, endpoint]);

    res.json({ message: 'Unsubscribed successfully' });

  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Test push notification (user can test their own)
router.post('/test', verifyToken, async (req, res) => {
  try {
    if (!process.env.VAPID_PUBLIC_KEY) {
      return res.status(500).json({ error: 'Push notifications not configured' });
    }

    // Get user's subscriptions
    const [subscriptions] = await pool.execute(`
      SELECT endpoint, p256dh, auth 
      FROM push_subscriptions 
      WHERE user_id = ?
    `, [req.user.id]);

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'No push subscriptions found for user' });
    }

    const payload = JSON.stringify({
      title: '🧪 Test Notification',
      body: `Hello ${req.user.first_name}! Push notifications are working correctly.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'test',
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    });

    let sentCount = 0;
    let errorCount = 0;

    // Send to all user's subscriptions
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, payload);
        sentCount++;
      } catch (error) {
        console.error('Push notification error:', error);
        errorCount++;
        
        // Remove invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          await pool.execute(`
            DELETE FROM push_subscriptions 
            WHERE user_id = ? AND endpoint = ?
          `, [req.user.id, sub.endpoint]);
        }
      }
    }

    res.json({ 
      message: 'Test notification sent',
      sent: sentCount,
      errors: errorCount
    });

  } catch (error) {
    console.error('Error sending test push notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Send push notification to all users (internal function)
async function sendPushToAllUsers(title, body, data = {}, actionButtons = null) {
  try {
    if (!process.env.VAPID_PUBLIC_KEY) {
      console.warn('VAPID keys not configured, skipping push notifications');
      return { sent: 0, errors: 0 };
    }

    // Get all active subscriptions
    const [subscriptions] = await pool.execute(`
      SELECT ps.*, u.first_name, u.last_name, u.notify
      FROM push_subscriptions ps
      JOIN users u ON ps.user_id = u.id
      WHERE u.email_verified = TRUE AND u.notify = TRUE
    `);

    if (subscriptions.length === 0) {
      return { sent: 0, errors: 0 };
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: data.type || 'recall',
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      actions: actionButtons || [
        { action: 'view', title: '👀 View Details' },
        { action: 'dismiss', title: '✖️ Dismiss' }
      ]
    });

    let sentCount = 0;
    let errorCount = 0;

    // Send to all subscriptions
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, payload);
        sentCount++;
      } catch (error) {
        console.error(`Push notification error for user ${sub.user_id}:`, error);
        errorCount++;
        
        // Remove invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          await pool.execute(`
            DELETE FROM push_subscriptions 
            WHERE user_id = ? AND endpoint = ?
          `, [sub.user_id, sub.endpoint]);
        }
      }
    }

    console.log(`📱 Push notifications sent: ${sentCount}, errors: ${errorCount}`);
    return { sent: sentCount, errors: errorCount };

  } catch (error) {
    console.error('Error sending push notifications to all users:', error);
    return { sent: 0, errors: 1 };
  }
}

// Send push notification to specific user
async function sendPushToUser(userId, title, body, data = {}, actionButtons = null) {
  try {
    if (!process.env.VAPID_PUBLIC_KEY) {
      console.warn('VAPID keys not configured, skipping push notification');
      return { sent: 0, errors: 0 };
    }

    // Get user's subscriptions
    const [subscriptions] = await pool.execute(`
      SELECT ps.*, u.first_name, u.last_name, u.notify
      FROM push_subscriptions ps
      JOIN users u ON ps.user_id = u.id
      WHERE ps.user_id = ? AND u.email_verified = TRUE AND u.notify = TRUE
    `, [userId]);

    if (subscriptions.length === 0) {
      return { sent: 0, errors: 0 };
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: data.type || 'recall',
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      actions: actionButtons || [
        { action: 'view', title: '👀 View Details' },
        { action: 'dismiss', title: '✖️ Dismiss' }
      ]
    });

    let sentCount = 0;
    let errorCount = 0;

    // Send to all user's subscriptions
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, payload);
        sentCount++;
      } catch (error) {
        console.error(`Push notification error for user ${userId}:`, error);
        errorCount++;
        
        // Remove invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          await pool.execute(`
            DELETE FROM push_subscriptions 
            WHERE user_id = ? AND endpoint = ?
          `, [userId, sub.endpoint]);
        }
      }
    }

    return { sent: sentCount, errors: errorCount };

  } catch (error) {
    console.error('Error sending push notification to user:', error);
    return { sent: 0, errors: 1 };
  }
}

// Export functions for use in other modules
module.exports = router;
module.exports.sendPushToAllUsers = sendPushToAllUsers;
module.exports.sendPushToUser = sendPushToUser;