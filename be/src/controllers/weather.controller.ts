import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { asyncHandler } from '../middlewares/error.middleware';
import { WeatherService } from '../services/weather.service';
import { successResponse } from '../utils/response.util';
import { PROVINCE_COORDS } from '../data/provinces';

export const getProvinceCoords = asyncHandler(
  async (_req: Request, res: Response, _next: NextFunction) => {
    res.status(200).json(successResponse(PROVINCE_COORDS, 'Danh sách toạ độ tỉnh/thành'));
  }
);

export const getCurrentWeather = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const province = req.query.province as string | undefined;
    const weather = await WeatherService.getWeatherForUser(req.user!.id, province);
    res.status(200).json(successResponse(weather, 'Lấy thông tin thời tiết thành công'));
  }
);

export const getForecast = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const province = req.query.province as string | undefined;
    const forecast = await WeatherService.getForecastForUser(req.user!.id, province);
    res.status(200).json(successResponse(forecast, 'Lấy dự báo thời tiết thành công'));
  }
);

export const getWeatherAlerts = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await WeatherService.getAlertsForUser(req.user!.id, page, limit);
    res.status(200).json({
      success: true,
      status: 'success',
      data: result.alerts,
      pagination: result.pagination,
    });
  }
);

export const getUnreadAlertCount = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const count = await WeatherService.getUnreadAlertCount(req.user!.id);
    res.status(200).json(successResponse({ count }));
  }
);

export const markAlertAsRead = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const alert = await WeatherService.markAlertAsRead(req.params.id, req.user!.id);
    res.status(200).json(successResponse(alert, 'Đã đánh dấu đã đọc'));
  }
);

export const markAllAlertsAsRead = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    await WeatherService.markAllAlertsAsRead(req.user!.id);
    res.status(200).json(successResponse(null, 'Đã đánh dấu tất cả đã đọc'));
  }
);

export const getThresholds = asyncHandler(
  async (_req: AuthRequest, res: Response, _next: NextFunction) => {
    const thresholds = WeatherService.getThresholds();
    res.status(200).json(successResponse(thresholds));
  }
);
