import axios from 'axios';
import User, { IUser } from '../models/User.model';
import Contract from '../models/Contract.model';
import WeatherAlert from '../models/WeatherAlert.model';
import { AppError } from '../middlewares/error.middleware';
import { WeatherAlertType, WeatherAlertSeverity, WeatherData, WeatherThresholds } from '../types';

// ===== CONSTANTS =====

const OWM_API_KEY = process.env.OWM_API_KEY || 'abba08388fa1390911c528f4f3155778';
const OWM_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Fixed system thresholds
const THRESHOLDS: WeatherThresholds = {
  extremeHeatTemp: 38,    // °C
  extremeColdTemp: 5,     // °C
  heavyRainMm: 100,       // mm/day
  strongWindKmh: 60,      // km/h
  droughtMm: 5,           // mm in 14 days
  droughtDays: 14,
};

// Vietnamese alert messages by type
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

// Vietnam province → approximate coordinates (for users without GPS coords)
const PROVINCE_COORDS: Record<string, { lat: number; lng: number }> = {
  'Ha Noi': { lat: 21.0285, lng: 105.8542 },
  'Ho Chi Minh': { lat: 10.8231, lng: 106.6297 },
  'Da Nang': { lat: 16.0544, lng: 108.2022 },
  'Can Tho': { lat: 10.0452, lng: 105.7469 },
  'Hai Phong': { lat: 20.8449, lng: 106.6881 },
  'Binh Duong': { lat: 11.3254, lng: 106.477 },
  'Dong Nai': { lat: 10.9453, lng: 106.8243 },
  'Lam Dong': { lat: 11.9404, lng: 108.4583 },
  'Dak Lak': { lat: 12.71, lng: 108.2378 },
  'Gia Lai': { lat: 13.9833, lng: 108.0 },
  'Long An': { lat: 10.5364, lng: 106.4134 },
  'Tien Giang': { lat: 10.3599, lng: 106.3631 },
  'Ben Tre': { lat: 10.2434, lng: 106.3756 },
  'An Giang': { lat: 10.5216, lng: 105.1259 },
  'Binh Thuan': { lat: 10.9333, lng: 108.1 },
  'Khanh Hoa': { lat: 12.2585, lng: 109.0526 },
  'Tay Ninh': { lat: 11.3635, lng: 106.1016 },
  'Thai Nguyen': { lat: 21.5671, lng: 105.825 },
  'Bac Giang': { lat: 21.2731, lng: 106.1946 },
  'Thanh Hoa': { lat: 19.8, lng: 105.7667 },
  'Nghe An': { lat: 18.6733, lng: 105.6922 },
  'Ha Tinh': { lat: 18.3559, lng: 105.8877 },
  'Quang Binh': { lat: 17.4688, lng: 106.6224 },
  'Hue': { lat: 16.4637, lng: 107.5909 },
  'Quang Nam': { lat: 15.5394, lng: 108.019 },
  'Quang Ngai': { lat: 15.1214, lng: 108.8044 },
  'Binh Dinh': { lat: 13.782, lng: 109.2197 },
  'Phu Yen': { lat: 13.0882, lng: 109.0929 },
};

export class WeatherService {
  /**
   * Fetch current weather from OpenWeatherMap by coordinates
   */
  static async fetchWeatherByCoords(lat: number, lng: number): Promise<WeatherData> {
    try {
      const response = await axios.get(`${OWM_BASE_URL}/weather`, {
        params: {
          lat,
          lon: lng,
          appid: OWM_API_KEY,
          units: 'metric',
          lang: 'vi',
        },
        timeout: 10000,
      });

      const data = response.data;
      return {
        temp: data.main?.temp ?? 0,
        humidity: data.main?.humidity ?? 0,
        windSpeed: (data.wind?.speed ?? 0) * 3.6, // m/s → km/h
        rain1h: data.rain?.['1h'] ?? 0,
        rain24h: data.rain?.['3h'] ? data.rain['3h'] * 8 : 0, // estimate from 3h to 24h
        description: data.weather?.[0]?.description ?? '',
        icon: data.weather?.[0]?.icon ?? '01d',
      };
    } catch (error: any) {
      console.error('OpenWeatherMap API error:', error.message);
      throw new AppError('Không thể kết nối dịch vụ thời tiết', 503);
    }
  }

  /**
   * Fetch weather by province name (fallback when no coordinates)
   */
  static async fetchWeatherByProvince(province: string): Promise<WeatherData | null> {
    const coords = PROVINCE_COORDS[province];
    if (coords) {
      return this.fetchWeatherByCoords(coords.lat, coords.lng);
    }

    // Try direct city name query as fallback
    try {
      const response = await axios.get(`${OWM_BASE_URL}/weather`, {
        params: {
          q: `${province},VN`,
          appid: OWM_API_KEY,
          units: 'metric',
          lang: 'vi',
        },
        timeout: 10000,
      });

      const data = response.data;
      return {
        temp: data.main?.temp ?? 0,
        humidity: data.main?.humidity ?? 0,
        windSpeed: (data.wind?.speed ?? 0) * 3.6,
        rain1h: data.rain?.['1h'] ?? 0,
        rain24h: data.rain?.['3h'] ? data.rain['3h'] * 8 : 0,
        description: data.weather?.[0]?.description ?? '',
        icon: data.weather?.[0]?.icon ?? '01d',
      };
    } catch {
      return null;
    }
  }

  /**
   * Get current weather for a user (based on their location)
   */
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

    return this.fetchWeatherByProvince(provinceOverride || 'Ha Noi');
  }

  /**
   * Fetch 5-day forecast from OpenWeatherMap by coordinates
   */
  static async fetchForecastByCoords(lat: number, lng: number): Promise<any[]> {
    try {
      const response = await axios.get(`${OWM_BASE_URL}/forecast`, {
        params: { lat, lon: lng, appid: OWM_API_KEY, units: 'metric', lang: 'vi', cnt: 40 },
        timeout: 10000,
      });
      const byDay = new Map<string, any>();
      for (const item of response.data.list) {
        const day = item.dt_txt.split(' ')[0];
        const hour = item.dt_txt.split(' ')[1];
        if (!byDay.has(day) || hour === '12:00:00') {
          byDay.set(day, {
            date: day,
            temp: item.main.temp,
            tempMin: item.main.temp_min,
            tempMax: item.main.temp_max,
            humidity: item.main.humidity,
            description: item.weather[0].description,
            icon: item.weather[0].icon,
            windSpeed: (item.wind?.speed ?? 0) * 3.6,
            rain: item.rain?.['3h'] ?? 0,
          });
        }
      }
      return Array.from(byDay.values()).slice(0, 5);
    } catch (error: any) {
      console.error('OWM forecast error:', error.message);
      return [];
    }
  }

  /**
   * Get 5-day forecast for a user (based on their location or province override)
   */
  static async getForecastForUser(userId: string, provinceOverride?: string): Promise<any[]> {
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

    const province = provinceOverride || 'Ha Noi';
    const coords = PROVINCE_COORDS[province];
    if (coords) return this.fetchForecastByCoords(coords.lat, coords.lng);
    return this.fetchForecastByCoords(21.0285, 105.8542); // Ha Noi fallback
  }

  /**
   * Check weather against thresholds and return detected alerts
   */
  static checkThresholds(weather: WeatherData): Array<{ type: WeatherAlertType; severity: WeatherAlertSeverity; detail: string }> {
    const alerts: Array<{ type: WeatherAlertType; severity: WeatherAlertSeverity; detail: string }> = [];

    // Extreme heat
    if (weather.temp > THRESHOLDS.extremeHeatTemp + 5) {
      alerts.push({ type: 'extreme_heat', severity: 'critical', detail: `Nhiet do ${weather.temp}°C > nguong ${THRESHOLDS.extremeHeatTemp}°C` });
    } else if (weather.temp > THRESHOLDS.extremeHeatTemp) {
      alerts.push({ type: 'extreme_heat', severity: 'warning', detail: `Nhiet do ${weather.temp}°C > nguong ${THRESHOLDS.extremeHeatTemp}°C` });
    }

    // Extreme cold
    if (weather.temp < THRESHOLDS.extremeColdTemp - 3) {
      alerts.push({ type: 'extreme_cold', severity: 'critical', detail: `Nhiet do ${weather.temp}°C < nguong ${THRESHOLDS.extremeColdTemp}°C` });
    } else if (weather.temp < THRESHOLDS.extremeColdTemp) {
      alerts.push({ type: 'extreme_cold', severity: 'warning', detail: `Nhiet do ${weather.temp}°C < nguong ${THRESHOLDS.extremeColdTemp}°C` });
    }

    // Heavy rain (estimate from rain1h * 24 or rain24h)
    const estimatedDailyRain = Math.max((weather.rain1h ?? 0) * 24, weather.rain24h ?? 0);
    if (estimatedDailyRain > THRESHOLDS.heavyRainMm * 1.5) {
      alerts.push({ type: 'heavy_rain', severity: 'critical', detail: `Luong mua uoc tinh ${estimatedDailyRain.toFixed(0)}mm/ngay > nguong ${THRESHOLDS.heavyRainMm}mm` });
    } else if (estimatedDailyRain > THRESHOLDS.heavyRainMm) {
      alerts.push({ type: 'heavy_rain', severity: 'warning', detail: `Luong mua uoc tinh ${estimatedDailyRain.toFixed(0)}mm/ngay > nguong ${THRESHOLDS.heavyRainMm}mm` });
    }

    // Strong wind
    if (weather.windSpeed > THRESHOLDS.strongWindKmh * 1.5) {
      alerts.push({ type: 'strong_wind', severity: 'critical', detail: `Toc do gio ${weather.windSpeed.toFixed(0)}km/h > nguong ${THRESHOLDS.strongWindKmh}km/h` });
    } else if (weather.windSpeed > THRESHOLDS.strongWindKmh) {
      alerts.push({ type: 'strong_wind', severity: 'warning', detail: `Toc do gio ${weather.windSpeed.toFixed(0)}km/h > nguong ${THRESHOLDS.strongWindKmh}km/h` });
    }

    return alerts;
  }

  /**
   * Run weather check for all users with location — called by cron job
   */
  static async runWeatherCheckForAllUsers(): Promise<number> {
    let alertCount = 0;

    // Get all active users with location data
    const users = await User.find({
      isActive: true,
      $or: [
        { province: { $exists: true, $ne: '' } },
        { 'coordinates.lat': { $exists: true } },
      ],
    });

    // Group users by province to reduce API calls
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

    // Check weather by province (batched)
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
        console.error(`Weather check failed for province ${province}:`, error);
      }

      // Rate limiting: 60 calls/min on free tier
      await new Promise(resolve => setTimeout(resolve, 1100));
    }

    // Check weather for users with exact coordinates
    for (const user of coordUsers) {
      try {
        const weather = await this.fetchWeatherByCoords(user.coordinates!.lat, user.coordinates!.lng);
        const detectedAlerts = this.checkThresholds(weather);
        for (const alert of detectedAlerts) {
          await this.createAlertForUser(user, user.province || 'Unknown', weather, alert);
          alertCount++;
        }
      } catch (error) {
        console.error(`Weather check failed for user ${user._id}:`, error);
      }

      await new Promise(resolve => setTimeout(resolve, 1100));
    }

    return alertCount;
  }

  /**
   * Create a weather alert record for a user  
   */
  private static async createAlertForUser(
    user: IUser,
    province: string,
    weather: WeatherData,
    alert: { type: WeatherAlertType; severity: WeatherAlertSeverity; detail: string }
  ): Promise<void> {
    // Check for duplicate: don't create same alert type for same user within last 6 hours
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const existingAlert = await WeatherAlert.findOne({
      userId: user._id,
      alertType: alert.type,
      createdAt: { $gte: sixHoursAgo },
    });

    if (existingAlert) return;

    const message = ALERT_MESSAGES[alert.type][alert.severity];

    await WeatherAlert.create({
      userId: user._id,
      alertType: alert.type,
      severity: alert.severity,
      location: {
        province,
        district: user.district,
        coordinates: user.coordinates,
      },
      weatherData: weather,
      thresholdExceeded: alert.detail,
      message,
    });
  }

  /**
   * Get weather alerts for a user
   */
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

  /**
   * Mark a weather alert as read
   */
  static async markAlertAsRead(alertId: string, userId: string) {
    const alert = await WeatherAlert.findOneAndUpdate(
      { _id: alertId, userId },
      { isRead: true },
      { new: true }
    );
    if (!alert) throw new AppError('Cảnh báo không tồn tại', 404);
    return alert;
  }

  /**
   * Mark all weather alerts as read for a user
   */
  static async markAllAlertsAsRead(userId: string) {
    await WeatherAlert.updateMany({ userId, isRead: false }, { isRead: true });
  }

  /**
   * Get unread alert count for a user
   */
  static async getUnreadAlertCount(userId: string): Promise<number> {
    return WeatherAlert.countDocuments({ userId, isRead: false });
  }

  /**
   * Get weather thresholds (for display in FE)
   */
  static getThresholds(): WeatherThresholds {
    return { ...THRESHOLDS };
  }
}
