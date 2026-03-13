import { WeatherService } from '../services/weather.service';
import { NotificationService } from '../services/notification.service';
import WeatherAlert from '../models/WeatherAlert.model';

/**
 * Weather cron job - runs every 6 hours
 * Checks weather for all users with location data and creates alerts
 */
export async function runWeatherCronJob(): Promise<void> {
  console.log(`[WEATHER CRON] Starting weather check at ${new Date().toISOString()}`);

  try {
    const alertCount = await WeatherService.runWeatherCheckForAllUsers();
    console.log(`[WEATHER CRON] Created ${alertCount} weather alerts`);

    // Create in-app notifications for new alerts (created in last 5 minutes)
    if (alertCount > 0) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const newAlerts = await WeatherAlert.find({ createdAt: { $gte: fiveMinutesAgo } });

      for (const alert of newAlerts) {
        try {
          await NotificationService.createWeatherAlertNotification(
            alert.userId.toString(),
            String(alert._id),
            `Canh bao thoi tiet: ${getAlertTypeLabel(alert.alertType)}`,
            alert.message,
            alert.severity as 'warning' | 'critical'
          );
        } catch (notifErr) {
          console.error(`[WEATHER CRON] Notification creation failed for alert ${alert._id}:`, notifErr);
        }
      }
    }

    // Cleanup: delete read alerts older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const cleanupResult = await WeatherAlert.deleteMany({
      isRead: true,
      createdAt: { $lt: thirtyDaysAgo },
    });
    if (cleanupResult.deletedCount > 0) {
      console.log(`[WEATHER CRON] Cleaned up ${cleanupResult.deletedCount} old alerts`);
    }

    // Cleanup old notifications too
    const notifCleanup = await NotificationService.cleanupOldNotifications();
    if (notifCleanup > 0) {
      console.log(`[WEATHER CRON] Cleaned up ${notifCleanup} old notifications`);
    }

    console.log(`[WEATHER CRON] Completed at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('[WEATHER CRON] Failed:', error);
  }
}

/**
 * Start the weather cron job using node-cron
 * Schedule: every 6 hours at minute 0
 */
export function startWeatherCron(): void {
  try {
    const cron = require('node-cron');

    // Run every 6 hours: at minute 0 of hours 0, 6, 12, 18
    cron.schedule('0 */6 * * *', () => {
      runWeatherCronJob();
    });

    console.log('[WEATHER CRON] Scheduled to run every 6 hours');

    // Also run once 30 seconds after startup (to catch up)
    setTimeout(() => {
      console.log('[WEATHER CRON] Running initial weather check...');
      runWeatherCronJob();
    }, 30000);
  } catch (error) {
    console.warn('[WEATHER CRON] node-cron not installed, skipping cron setup. Install with: npm install node-cron');
  }
}

function getAlertTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    extreme_heat: 'Nang nong cuc dien',
    extreme_cold: 'Ret dam cuc manh',
    heavy_rain: 'Mua lon',
    strong_wind: 'Gio manh / Bao',
    drought: 'Han han',
  };
  return labels[type] || type;
}
