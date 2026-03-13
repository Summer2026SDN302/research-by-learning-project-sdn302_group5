import Escrow from '../models/Escrow.model';
import { NotificationService } from '../services/notification.service';

const SHIPPING_NOTIFY_DELAY_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

/**
 * Check for shipments that were sent 2+ days ago and notify enterprise.
 * This runs every hour and finds escrows where:
 *   - Milestone step 3 (Giao hàng) is in_progress
 *   - Farmer confirmed (farmerConfirmedAt) > 2 days ago
 *   - Enterprise has NOT yet confirmed (enterpriseConfirmed = false)
 *   - Notification not already sent (we check by looking for evidence tag)
 */
export async function runShippingReminderJob(): Promise<void> {
  console.log(`[SHIPPING CRON] Running shipping reminder check at ${new Date().toISOString()}`);

  try {
    const cutoffDate = new Date(Date.now() - SHIPPING_NOTIFY_DELAY_MS);

    const escrows = await Escrow.find({
      status: { $in: ['funded', 'partially_released'] },
      'milestones.step': 3,
      'milestones.status': 'in_progress',
      'milestones.farmerConfirmed': true,
      'milestones.enterpriseConfirmed': false,
      'milestones.farmerConfirmedAt': { $lte: cutoffDate },
    });

    let notified = 0;

    for (const escrow of escrows) {
      const milestone3 = escrow.milestones.find(m => m.step === 3);
      if (!milestone3 || milestone3.enterpriseConfirmed) continue;

      // Avoid spamming — only notify once per 24h after the 2-day gate
      // We use a simple heuristic: if the last notification was < 22h ago, skip
      // (We don't store notification state on escrow, so we check by querying notifications)
      const Notification = (await import('../models/Notification.model')).default;
      const recentNotif = await Notification.findOne({
        userId: escrow.enterpriseId.toString(),
        type: 'escrow',
        relatedId: String(escrow._id),
        title: { $regex: 'hàng đã về' },
        createdAt: { $gte: new Date(Date.now() - 22 * 60 * 60 * 1000) },
      });

      if (recentNotif) continue;

      const shippedEvidence = milestone3.evidence || 'không rõ đơn vị vận chuyển';
      const daysSince = Math.floor(
        (Date.now() - (milestone3.farmerConfirmedAt?.getTime() ?? 0)) / (24 * 60 * 60 * 1000)
      );

      try {
        await NotificationService.create({
          userId: escrow.enterpriseId.toString(),
          type: 'escrow',
          title: 'Hàng hóa đã về kho — cần xác nhận',
          message: `Hàng hóa đã được gửi ${daysSince} ngày trước (${shippedEvidence}). Vui lòng vào mục Ký quỹ để xác nhận nhận hàng hoặc khiếu nại nếu có vấn đề.`,
          severity: 'warning',
          relatedId: String(escrow._id),
          relatedModel: 'Escrow',
        });

        // Also notify farmer
        await NotificationService.create({
          userId: escrow.farmerId.toString(),
          type: 'escrow',
          title: 'Nhắc nhở: chờ doanh nghiệp xác nhận hàng',
          message: `Đã ${daysSince} ngày kể từ khi bạn gửi hàng. Doanh nghiệp đã được nhắc nhở xác nhận nhận hàng.`,
          severity: 'info',
          relatedId: String(escrow._id),
          relatedModel: 'Escrow',
        });

        notified++;
      } catch (err) {
        console.error(`[SHIPPING CRON] Failed to notify for escrow ${escrow._id}:`, err);
      }
    }

    if (notified > 0) {
      console.log(`[SHIPPING CRON] Sent ${notified} shipping reminder(s)`);
    } else {
      console.log(`[SHIPPING CRON] No pending shipping reminders`);
    }
  } catch (error) {
    console.error('[SHIPPING CRON] Failed:', error);
  }
}

/**
 * Start the shipping cron job — runs every hour
 */
export function startShippingCron(): void {
  try {
    const cron = require('node-cron');

    // Run every hour at minute 0
    cron.schedule('0 * * * *', () => {
      runShippingReminderJob();
    });

    console.log('[SHIPPING CRON] Scheduled to run every hour');
  } catch (error) {
    console.warn('[SHIPPING CRON] node-cron not available, skipping cron setup.');
  }
}
