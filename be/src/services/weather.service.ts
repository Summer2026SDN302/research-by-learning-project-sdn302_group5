import User, { IUser } from '../models/User.model';
import WeatherAlert from '../models/WeatherAlert.model';
import { AppError } from '../middlewares/error.middleware';
import { WeatherAlertType, WeatherAlertSeverity, WeatherData, WeatherThresholds } from '../types';
import { WEATHER_API, WEATHER_THRESHOLDS } from '../constants';
import { createLogger } from '../utils/logger';
import { PROVINCE_COORDS } from '../data/provinces';
import {
  ForecastSummary,
  openMeteoProvider,
  openWeatherMapProvider,
} from './weather-providers';

const log = createLogger('Weather');

const THRESHOLDS: WeatherThresholds = {
  extremeHeatTemp: WEATHER_THRESHOLDS.EXTREME_HEAT_TEMP,
  extremeColdTemp: WEATHER_THRESHOLDS.EXTREME_COLD_TEMP,
  heavyRainMm: WEATHER_THRESHOLDS.HEAVY_RAIN_MM,
  strongWindKmh: WEATHER_THRESHOLDS.STRONG_WIND_KMH,
  droughtMm: WEATHER_THRESHOLDS.DROUGHT_MM,
  droughtDays: WEATHER_THRESHOLDS.DROUGHT_DAYS,
};

const ALERT_MESSAGES: Record<WeatherAlertType, { warning: string; critical: string }> = {
  extreme_heat: {
    warning: 'Cảnh báo nắng nóng: Nhiệt độ đang tăng cao, có thể ảnh hưởng đến cây trồng.',
    critical: 'CẢNH BÁO KHẨN CẤP: Nắng nóng cực điểm! Cần bảo vệ cây trồng ngay lập tức.',
  },
  extreme_cold: {
    warning: 'Cảnh báo rét đậm: Nhiệt độ đang giảm mạnh, có thể gây hại cho cây trồng.',
    critical: 'CẢNH BÁO KHẨN CẤP: Rét đậm cực mạnh! Cần bảo vệ cây trồng ngay lập tức.',
  },
  heavy_rain: {
    warning: 'Cảnh báo mưa lớn: Lượng mưa tăng cao, có nguy cơ ngập úng.',
    critical: 'CẢNH BÁO KHẨN CẤP: Mưa cực lớn! Nguy cơ ngập úng và sạt lở đất.',
  },
  strong_wind: {
    warning: 'Cảnh báo gió mạnh: Tốc độ gió đang tăng, có thể ảnh hưởng đến cây trồng.',
    critical: 'CẢNH BÁO KHẨN CẤP: Bão/gió cực mạnh! Cần cố định nhà kính, nhà lưới ngay.',
  },
  drought: {
    warning: 'Cảnh báo hạn hán: Lượng mưa thấp kéo dài, cần tăng cường tưới tiêu.',
    critical: 'CẢNH BÁO KHẨN CẤP: Hạn hán nghiêm trọng! Cần biện pháp tưới tiêu khẩn cấp.',
  },
};

type DetectedWeatherAlert = {
  type: WeatherAlertType;
  severity: WeatherAlertSeverity;
  detail: string;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const resolveProvinceCoords = (province?: string) => {
  if (!province) return WEATHER_API.DEFAULT_COORDS;
  return PROVINCE_COORDS[province] || WEATHER_API.DEFAULT_COORDS;
};

export class WeatherService {
  private static async fetchWithFallback<T>(
    fetchPrimary: () => Promise<T>,
    fetchFallback: () => Promise<T>,
    primaryName: string,
    onAllFail: () => T | never
  ): Promise<T> {
    if (openWeatherMapProvider.isAvailable()) {
      try {
        return await fetchPrimary();
      } catch (error) {
        log.error(`${primaryName} error`, getErrorMessage(error));
      }
    }
    try {
      return await fetchFallback();
    } catch (fallbackError) {
      log.error('Open-Meteo fallback error', getErrorMessage(fallbackError));
      return onAllFail();
    }
  }

  static async fetchWeatherByCoords(lat: number, lng: number): Promise<WeatherData> {
    return WeatherService.fetchWithFallback<WeatherData>(
      () => openWeatherMapProvider.fetchCurrent(lat, lng),
      () => openMeteoProvider.fetchCurrent(lat, lng),
      'OpenWeatherMap',
      () => { throw new AppError('Không thể kết nối dịch vụ thời tiết', 503); }
    );
  }

  static async fetchWeatherByProvince(province: string): Promise<WeatherData | null> {
    try {
      const coords = resolveProvinceCoords(province);
      return await this.fetchWeatherByCoords(coords.lat, coords.lng);
    } catch {
      return null;
    }
  }

  static async getWeatherForUser(userId: string, provinceOverride?: string): Promise<WeatherData | null> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('Người dùng không tồn tại', 404);

    if (!provinceOverride) {
      if (user.coordinates?.lat && user.coordinates?.lng) {
        return this.fetchWeatherByCoords(user.coordinates.lat, user.coordinates.lng);
      }
      if (user.province) {
        return this.fetchWeatherByProvince(user.province);
      }
    }

    return this.fetchWeatherByProvince(provinceOverride || WEATHER_API.DEFAULT_PROVINCE);
  }

  static async fetchForecastByCoords(lat: number, lng: number): Promise<ForecastSummary[]> {
    return WeatherService.fetchWithFallback<ForecastSummary[]>(
      () => openWeatherMapProvider.fetchForecast(lat, lng),
      () => openMeteoProvider.fetchForecast(lat, lng),
      'OWM forecast',
      () => []
    );
  }

  static async getForecastForUser(userId: string, provinceOverride?: string): Promise<ForecastSummary[]> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('Người dùng không tồn tại', 404);

    if (!provinceOverride) {
      if (user.coordinates?.lat && user.coordinates?.lng) {
        return this.fetchForecastByCoords(user.coordinates.lat, user.coordinates.lng);
      }
      if (user.province) {
        const coords = PROVINCE_COORDS[user.province];
        if (coords) return this.fetchForecastByCoords(coords.lat, coords.lng);
      }
    }

    const province = provinceOverride || WEATHER_API.DEFAULT_PROVINCE;
    const coords = resolveProvinceCoords(province);
    return this.fetchForecastByCoords(coords.lat, coords.lng);
  }

  static checkThresholds(weather: WeatherData): DetectedWeatherAlert[] {
    const alerts: DetectedWeatherAlert[] = [];

    if (weather.temp > THRESHOLDS.extremeHeatTemp + 5) {
      alerts.push({ type: 'extreme_heat', severity: 'critical', detail: `Nhiệt độ ${weather.temp}°C vượt ngưỡng ${THRESHOLDS.extremeHeatTemp}°C` });
    } else if (weather.temp > THRESHOLDS.extremeHeatTemp) {
      alerts.push({ type: 'extreme_heat', severity: 'warning', detail: `Nhiệt độ ${weather.temp}°C vượt ngưỡng ${THRESHOLDS.extremeHeatTemp}°C` });
    }

    if (weather.temp < THRESHOLDS.extremeColdTemp - 3) {
      alerts.push({ type: 'extreme_cold', severity: 'critical', detail: `Nhiệt độ ${weather.temp}°C thấp hơn ngưỡng ${THRESHOLDS.extremeColdTemp}°C` });
    } else if (weather.temp < THRESHOLDS.extremeColdTemp) {
      alerts.push({ type: 'extreme_cold', severity: 'warning', detail: `Nhiệt độ ${weather.temp}°C thấp hơn ngưỡng ${THRESHOLDS.extremeColdTemp}°C` });
    }

    const estimatedDailyRain = Math.max((weather.rain1h ?? 0) * 24, weather.rain24h ?? 0);
    if (estimatedDailyRain > THRESHOLDS.heavyRainMm * 1.5) {
      alerts.push({ type: 'heavy_rain', severity: 'critical', detail: `Lượng mưa ước tính ${estimatedDailyRain.toFixed(0)}mm/ngày vượt ngưỡng ${THRESHOLDS.heavyRainMm}mm` });
    } else if (estimatedDailyRain > THRESHOLDS.heavyRainMm) {
      alerts.push({ type: 'heavy_rain', severity: 'warning', detail: `Lượng mưa ước tính ${estimatedDailyRain.toFixed(0)}mm/ngày vượt ngưỡng ${THRESHOLDS.heavyRainMm}mm` });
    }

    if (weather.windSpeed > THRESHOLDS.strongWindKmh * 1.5) {
      alerts.push({ type: 'strong_wind', severity: 'critical', detail: `Tốc độ gió ${weather.windSpeed.toFixed(0)}km/h vượt ngưỡng ${THRESHOLDS.strongWindKmh}km/h` });
    } else if (weather.windSpeed > THRESHOLDS.strongWindKmh) {
      alerts.push({ type: 'strong_wind', severity: 'warning', detail: `Tốc độ gió ${weather.windSpeed.toFixed(0)}km/h vượt ngưỡng ${THRESHOLDS.strongWindKmh}km/h` });
    }

    if (estimatedDailyRain <= THRESHOLDS.droughtMm * 0.5) {
      alerts.push({
        type: 'drought',
        severity: 'critical',
        detail: `Lượng mưa ước tính ${estimatedDailyRain.toFixed(0)}mm/ngày thấp hơn ngưỡng hạn hán ${THRESHOLDS.droughtMm}mm/${THRESHOLDS.droughtDays} ngày`,
      });
    } else if (estimatedDailyRain <= THRESHOLDS.droughtMm) {
      alerts.push({
        type: 'drought',
        severity: 'warning',
        detail: `Lượng mưa ước tính ${estimatedDailyRain.toFixed(0)}mm/ngày thấp hơn ngưỡng hạn hán ${THRESHOLDS.droughtMm}mm/${THRESHOLDS.droughtDays} ngày`,
      });
    }

    return alerts;
  }

  static async runWeatherCheckForAllUsers(): Promise<number> {
    let alertCount = 0;
    const users = await User.find({
      isActive: true,
      $or: [
        { province: { $exists: true, $ne: '' } },
        { 'coordinates.lat': { $exists: true } },
      ],
    });

    const provinceMap = new Map<string, IUser[]>();
    const coordUsers: IUser[] = [];

    for (const user of users) {
      if (user.coordinates?.lat && user.coordinates?.lng) {
        coordUsers.push(user);
      } else if (user.province) {
        const existing = provinceMap.get(user.province) || [];
        existing.push(user);
        provinceMap.set(user.province, existing);
      }
    }

    for (const [province, provinceUsers] of provinceMap.entries()) {
      try {
        const weather = await this.fetchWeatherByProvince(province);
        if (!weather) continue;

        const detectedAlerts = this.checkThresholds(weather);
        for (const alert of detectedAlerts) {
          for (const user of provinceUsers) {
            await this.createAlertForUser(user, province, weather, alert);
            alertCount++;
          }
        }
      } catch (error) {
        log.error('Weather check failed for province', { province, error: getErrorMessage(error) });
      }
    }

    for (const user of coordUsers) {
      try {
        const weather = await this.fetchWeatherByCoords(user.coordinates!.lat, user.coordinates!.lng);
        const detectedAlerts = this.checkThresholds(weather);
        for (const alert of detectedAlerts) {
          await this.createAlertForUser(user, user.province || 'Unknown', weather, alert);
          alertCount++;
        }
      } catch (error) {
        log.error('Weather check failed for coordinates', { userId: user._id, error: getErrorMessage(error) });
      }
    }

    return alertCount;
  }

  private static async createAlertForUser(user: IUser, province: string, weather: WeatherData, alert: DetectedWeatherAlert): Promise<void> {
    const existingAlert = await WeatherAlert.findOne({
      userId: user._id,
      alertType: alert.type,
      severity: alert.severity,
      createdAt: { $gte: new Date(Date.now() - WEATHER_API.DUPLICATE_ALERT_WINDOW_MS) },
    });

    if (existingAlert) return;

    const message = `${ALERT_MESSAGES[alert.type][alert.severity]} (${province})`;
    const weatherAlert = await WeatherAlert.create({
      userId: user._id,
      province,
      alertType: alert.type,
      severity: alert.severity,
      message,
      detail: alert.detail,
      weatherData: weather,
      isRead: false,
    });

    log.info('Created weather alert', { userId: user._id, alertType: alert.type, severity: alert.severity });
    void weatherAlert;
  }

  static getThresholds(): WeatherThresholds {
    return THRESHOLDS;
  }

  static async getAlertsForUser(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [alerts, total] = await Promise.all([
      WeatherAlert.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WeatherAlert.countDocuments({ userId }),
    ]);

    return {
      alerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getUnreadAlertCount(userId: string): Promise<number> {
    return WeatherAlert.countDocuments({ userId, isRead: false });
  }

  static async markAlertAsRead(alertId: string, userId: string) {
    const alert = await WeatherAlert.findOneAndUpdate(
      { _id: alertId, userId },
      { isRead: true },
      { new: true }
    );
    if (!alert) throw new AppError('Cảnh báo thời tiết không tồn tại', 404);
    return alert;
  }

  static async markAllAlertsAsRead(userId: string): Promise<void> {
    await WeatherAlert.updateMany({ userId, isRead: false }, { isRead: true });
  }
}
