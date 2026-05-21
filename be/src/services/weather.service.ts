import axios from 'axios';
import User, { IUser } from '../models/User.model';
import WeatherAlert from '../models/WeatherAlert.model';
import { AppError } from '../middlewares/error.middleware';
import { WeatherAlertType, WeatherAlertSeverity, WeatherData, WeatherThresholds } from '../types';
import { WEATHER_API, WEATHER_THRESHOLDS } from '../constants';

// ===== CONSTANTS =====

const OWM_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

// Fixed system thresholds
const THRESHOLDS: WeatherThresholds = {
  extremeHeatTemp: WEATHER_THRESHOLDS.EXTREME_HEAT_TEMP,
  extremeColdTemp: WEATHER_THRESHOLDS.EXTREME_COLD_TEMP,
  heavyRainMm: WEATHER_THRESHOLDS.HEAVY_RAIN_MM,
  strongWindKmh: WEATHER_THRESHOLDS.STRONG_WIND_KMH,
  droughtMm: WEATHER_THRESHOLDS.DROUGHT_MM,
  droughtDays: WEATHER_THRESHOLDS.DROUGHT_DAYS,
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

type ForecastItem = {
  dt_txt: string;
  main: {
    temp: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
  };
  weather: Array<{ description: string; icon: string }>;
  wind?: { speed?: number };
  rain?: { '3h'?: number };
};

type CurrentWeatherApiResponse = {
  main?: {
    temp?: number;
    humidity?: number;
  };
  wind?: {
    speed?: number;
  };
  rain?: {
    '1h'?: number;
    '3h'?: number;
  };
  weather?: Array<{
    description?: string;
    icon?: string;
  }>;
};

type ForecastApiResponse = {
  list: ForecastItem[];
};

type OpenMeteoCurrentApiResponse = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    weather_code?: number;
    rain?: number;
    is_day?: number;
  };
};

type OpenMeteoForecastApiResponse = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
  };
};

type ForecastSummary = {
  date: string;
  temp: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  rain: number;
};

type DetectedWeatherAlert = {
  type: WeatherAlertType;
  severity: WeatherAlertSeverity;
  detail: string;
};

const getWeatherApiKey = (): string | null => {
  const apiKey =
    process.env.OPENWEATHER_API_KEY ||
    process.env.OWM_API_KEY ||
    process.env.WEATHER_API_KEY;

  return apiKey || null;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const sleep = (delayMs: number) =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

// Gom logic map dữ liệu thời tiết để tránh lặp lại ở nhiều API endpoint khác nhau.
const mapCurrentWeather = (data: CurrentWeatherApiResponse): WeatherData => ({
  temp: data.main?.temp ?? 0,
  humidity: data.main?.humidity ?? 0,
  windSpeed: (data.wind?.speed ?? 0) * 3.6,
  rain1h: data.rain?.['1h'] ?? 0,
  rain24h: data.rain?.['3h'] ? data.rain['3h'] * 8 : 0,
  description: data.weather?.[0]?.description ?? '',
  icon: data.weather?.[0]?.icon ?? '01d',
});

const mapOpenMeteoCode = (code: number | undefined, isDay: boolean = true) => {
  const dayNightSuffix = isDay ? 'd' : 'n';

  if (code === 0) {
    return { description: 'Trời quang', icon: `01${dayNightSuffix}` };
  }
  if (code === 1 || code === 2) {
    return { description: 'Ít mây', icon: `02${dayNightSuffix}` };
  }
  if (code === 3) {
    return { description: 'Nhiều mây', icon: `04${dayNightSuffix}` };
  }
  if ([45, 48].includes(code ?? -1)) {
    return { description: 'Sương mù', icon: `50${dayNightSuffix}` };
  }
  if ([51, 53, 55, 56, 57].includes(code ?? -1)) {
    return { description: 'Mưa phùn', icon: `09${dayNightSuffix}` };
  }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code ?? -1)) {
    return { description: 'Mưa', icon: `10${dayNightSuffix}` };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code ?? -1)) {
    return { description: 'Tuyết', icon: `13${dayNightSuffix}` };
  }
  if ([95, 96, 99].includes(code ?? -1)) {
    return { description: 'Mưa giông', icon: `11${dayNightSuffix}` };
  }

  return { description: 'Thời tiết biến đổi', icon: `03${dayNightSuffix}` };
};

const mapOpenMeteoCurrent = (data: OpenMeteoCurrentApiResponse): WeatherData => {
  const code = data.current?.weather_code;
  const isDay = data.current?.is_day !== 0;
  const mapped = mapOpenMeteoCode(code, isDay);

  return {
    temp: data.current?.temperature_2m ?? 0,
    humidity: data.current?.relative_humidity_2m ?? 0,
    windSpeed: data.current?.wind_speed_10m ?? 0,
    rain1h: data.current?.rain ?? 0,
    rain24h: 0,
    description: mapped.description,
    icon: mapped.icon,
  };
};

const resolveProvinceCoords = (province?: string) => {
  if (!province) {
    return WEATHER_API.DEFAULT_COORDS;
  }

  return PROVINCE_COORDS[province] || WEATHER_API.DEFAULT_COORDS;
};

export class WeatherService {
  private static async fetchWeatherByCoordsFromOpenMeteo(
    lat: number,
    lng: number
  ): Promise<WeatherData> {
    const response = await axios.get<OpenMeteoCurrentApiResponse>(OPEN_METEO_BASE_URL, {
      params: {
        latitude: lat,
        longitude: lng,
        current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,rain,is_day',
        timezone: 'auto',
      },
      timeout: WEATHER_API.TIMEOUT_MS,
    });

    return mapOpenMeteoCurrent(response.data);
  }

  private static async fetchForecastByCoordsFromOpenMeteo(
    lat: number,
    lng: number
  ): Promise<ForecastSummary[]> {
    const response = await axios.get<OpenMeteoForecastApiResponse>(OPEN_METEO_BASE_URL, {
      params: {
        latitude: lat,
        longitude: lng,
        daily:
          'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
        timezone: 'auto',
        forecast_days: 5,
      },
      timeout: WEATHER_API.TIMEOUT_MS,
    });

    const days = response.data.daily?.time || [];
    const weatherCodes = response.data.daily?.weather_code || [];
    const tempMax = response.data.daily?.temperature_2m_max || [];
    const tempMin = response.data.daily?.temperature_2m_min || [];
    const rain = response.data.daily?.precipitation_sum || [];

    return days.slice(0, 5).map((date, index) => {
      const mapped = mapOpenMeteoCode(weatherCodes[index], true);
      const minTemp = tempMin[index] ?? 0;
      const maxTemp = tempMax[index] ?? minTemp;
      return {
        date,
        temp: (minTemp + maxTemp) / 2,
        tempMin: minTemp,
        tempMax: maxTemp,
        humidity: 0,
        description: mapped.description,
        icon: mapped.icon,
        windSpeed: 0,
        rain: rain[index] ?? 0,
      };
    });
  }

  /**
   * Fetch current weather from OpenWeatherMap by coordinates
   */
  static async fetchWeatherByCoords(lat: number, lng: number): Promise<WeatherData> {
    const weatherApiKey = getWeatherApiKey();

    if (!weatherApiKey) {
      try {
        return await this.fetchWeatherByCoordsFromOpenMeteo(lat, lng);
      } catch (fallbackError) {
        console.error('Open-Meteo API error:', getErrorMessage(fallbackError));
        throw new AppError('Không thể kết nối dịch vụ thời tiết', 503);
      }
    }

    try {
      const response = await axios.get<CurrentWeatherApiResponse>(`${OWM_BASE_URL}/weather`, {
        params: {
          lat,
          lon: lng,
          appid: weatherApiKey,
          units: 'metric',
          lang: 'vi',
        },
        timeout: WEATHER_API.TIMEOUT_MS,
      });

      return mapCurrentWeather(response.data);
    } catch (error: unknown) {
      console.error('OpenWeatherMap API error:', getErrorMessage(error));

      try {
        return await this.fetchWeatherByCoordsFromOpenMeteo(lat, lng);
      } catch (fallbackError) {
        console.error('Open-Meteo fallback error:', getErrorMessage(fallbackError));
        throw new AppError('Không thể kết nối dịch vụ thời tiết', 503);
      }
    }
  }

  /**
   * Fetch weather by province name (fallback when no coordinates)
   */
  static async fetchWeatherByProvince(province: string): Promise<WeatherData | null> {
    try {
      const coords = resolveProvinceCoords(province);
      return await this.fetchWeatherByCoords(coords.lat, coords.lng);
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

    return this.fetchWeatherByProvince(
      provinceOverride || WEATHER_API.DEFAULT_PROVINCE
    );
  }

  /**
   * Fetch 5-day forecast from OpenWeatherMap by coordinates
   */
  static async fetchForecastByCoords(lat: number, lng: number): Promise<ForecastSummary[]> {
    const weatherApiKey = getWeatherApiKey();

    if (!weatherApiKey) {
      try {
        return await this.fetchForecastByCoordsFromOpenMeteo(lat, lng);
      } catch (fallbackError) {
        console.error('Open-Meteo forecast error:', getErrorMessage(fallbackError));
        return [];
      }
    }

    try {
      const response = await axios.get<ForecastApiResponse>(`${OWM_BASE_URL}/forecast`, {
        params: {
          lat,
          lon: lng,
          appid: weatherApiKey,
          units: 'metric',
          lang: 'vi',
          cnt: WEATHER_API.FORECAST_ITEM_COUNT,
        },
        timeout: WEATHER_API.TIMEOUT_MS,
      });
      const byDay = new Map<string, ForecastSummary>();
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
    } catch (error: unknown) {
      console.error('OWM forecast error:', getErrorMessage(error));
      try {
        return await this.fetchForecastByCoordsFromOpenMeteo(lat, lng);
      } catch (fallbackError) {
        console.error('Open-Meteo fallback forecast error:', getErrorMessage(fallbackError));
        return [];
      }
    }
  }

  /**
   * Get 5-day forecast for a user (based on their location or province override)
   */
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

  /**
   * Check weather against thresholds and return detected alerts
   */
  static checkThresholds(weather: WeatherData): DetectedWeatherAlert[] {
    const alerts: DetectedWeatherAlert[] = [];

    // Extreme heat
    if (weather.temp > THRESHOLDS.extremeHeatTemp + 5) {
      alerts.push({ type: 'extreme_heat', severity: 'critical', detail: `Nhiệt độ ${weather.temp}°C vượt ngưỡng ${THRESHOLDS.extremeHeatTemp}°C` });
    } else if (weather.temp > THRESHOLDS.extremeHeatTemp) {
      alerts.push({ type: 'extreme_heat', severity: 'warning', detail: `Nhiệt độ ${weather.temp}°C vượt ngưỡng ${THRESHOLDS.extremeHeatTemp}°C` });
    }

    // Extreme cold
    if (weather.temp < THRESHOLDS.extremeColdTemp - 3) {
      alerts.push({ type: 'extreme_cold', severity: 'critical', detail: `Nhiệt độ ${weather.temp}°C thấp hơn ngưỡng ${THRESHOLDS.extremeColdTemp}°C` });
    } else if (weather.temp < THRESHOLDS.extremeColdTemp) {
      alerts.push({ type: 'extreme_cold', severity: 'warning', detail: `Nhiệt độ ${weather.temp}°C thấp hơn ngưỡng ${THRESHOLDS.extremeColdTemp}°C` });
    }

    // Heavy rain (estimate from rain1h * 24 or rain24h)
    const estimatedDailyRain = Math.max((weather.rain1h ?? 0) * 24, weather.rain24h ?? 0);
    if (estimatedDailyRain > THRESHOLDS.heavyRainMm * 1.5) {
      alerts.push({ type: 'heavy_rain', severity: 'critical', detail: `Lượng mưa ước tính ${estimatedDailyRain.toFixed(0)}mm/ngày vượt ngưỡng ${THRESHOLDS.heavyRainMm}mm` });
    } else if (estimatedDailyRain > THRESHOLDS.heavyRainMm) {
      alerts.push({ type: 'heavy_rain', severity: 'warning', detail: `Lượng mưa ước tính ${estimatedDailyRain.toFixed(0)}mm/ngày vượt ngưỡng ${THRESHOLDS.heavyRainMm}mm` });
    }

    // Strong wind
    if (weather.windSpeed > THRESHOLDS.strongWindKmh * 1.5) {
      alerts.push({ type: 'strong_wind', severity: 'critical', detail: `Tốc độ gió ${weather.windSpeed.toFixed(0)}km/h vượt ngưỡng ${THRESHOLDS.strongWindKmh}km/h` });
    } else if (weather.windSpeed > THRESHOLDS.strongWindKmh) {
      alerts.push({ type: 'strong_wind', severity: 'warning', detail: `Tốc độ gió ${weather.windSpeed.toFixed(0)}km/h vượt ngưỡng ${THRESHOLDS.strongWindKmh}km/h` });
    }

    // Drought (heuristic based on recent daily rain estimate)
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
      await sleep(WEATHER_API.RATE_LIMIT_DELAY_MS);
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

      await sleep(WEATHER_API.RATE_LIMIT_DELAY_MS);
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
    alert: DetectedWeatherAlert
  ): Promise<void> {
    // Check for duplicate: don't create same alert type for same user within last 6 hours
    const sixHoursAgo = new Date(
      Date.now() - WEATHER_API.DUPLICATE_ALERT_WINDOW_MS
    );
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
