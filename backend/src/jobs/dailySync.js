const cron = require('node-cron');
const syncService = require('../services/syncService');

function setupDailySync() {
  // Schedule sync at 9 PM IST (15:30 UTC)
  // IST is UTC+5:30, so 9 PM IST = 3:30 PM UTC = 15:30
  const cronSchedule = '30 15 * * *';

  cron.schedule(cronSchedule, async () => {
    console.log('Starting scheduled daily sync at', new Date().toISOString());
    try {
      await syncService.syncCategories();
      await syncService.syncFunds(100); // Top 100 funds for POC
      console.log('Scheduled daily sync completed');
    } catch (error) {
      console.error('Scheduled daily sync failed:', error.message);
    }
  });

  console.log('Daily sync job scheduled for 9 PM IST (15:30 UTC)');
}

module.exports = { setupDailySync };
