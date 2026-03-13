import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import {
  getCurrentWeather,
  getForecast,
  getWeatherAlerts,
  getUnreadAlertCount,
  markAlertAsRead,
  markAllAlertsAsRead,
  getThresholds,
} from '../controllers/weather.controller';

const router = Router();

// All weather routes require authentication
router.use(protect);

// ===== WEATHER =====
router.get('/current', getCurrentWeather);
router.get('/forecast', getForecast);
router.get('/thresholds', getThresholds);

// ===== WEATHER ALERTS =====
router.get('/alerts', getWeatherAlerts);
router.get('/alerts/unread-count', getUnreadAlertCount);
router.patch('/alerts/read-all', markAllAlertsAsRead);
router.patch('/alerts/:id/read', markAlertAsRead);

export default router;
