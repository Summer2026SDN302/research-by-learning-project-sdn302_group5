// Adapter pattern cho 2 nhà cung cấp dữ liệu thời tiết: OpenWeatherMap và Open-Meteo.
// WeatherService chọn provider chính, fallback sang Open-Meteo nếu API key vắng hoặc OWM lỗi.
// Tách ra file riêng để dễ thêm provider mới (VNDMS, AccuWeather) trong tương lai.

import axios from 'axios';
import { WEATHER_API } from '../constants';
import { WeatherData } from '../types';

const OWM_BASE_URL = 'https://api.openweathermap.org/data/2.5';

export interface WeatherProvider {
  isAvailable(): boolean;
  fetchCurrent(lat: number, lng: number): Promise<WeatherData>;
  fetchForecast(lat: number, lng: number): Promise<ForecastSummary[]>;
}

export interface ForecastSummary {
  date: string;
  temp: number;
  description: string;
  icon: string;
  rainChance?: number;
}

// Map weather code Open-Meteo sang format icon tương thích OWM (01d, 02n, ...).
const mapOpenMeteoCode = (code?: number): string => {
  if (code === undefined) return '01d';
  if (code <= 2) return '01d';
  if (code <= 48) return '02d';
  if (code <= 67) return '09d';
  if (code <= 77) return '13d';
  if (code <= 82) return '09d';
  if (code <= 86) return '13d';
  return '50d';
};

export const openWeatherMapProvider: WeatherProvider = {
  isAvailable: () => Boolean(process.env.WEATHER_API_KEY),
  fetchCurrent: async (lat: number, lng: number): Promise<WeatherData> => {
    const response = await axios.get(`${OWM_BASE_URL}/weather`, {
      params: {
        lat,
        lon: lng,
        appid: process.env.WEATHER_API_KEY,
        units: 'metric',
        lang: 'vi',
      },
      timeout: WEATHER_API.TIMEOUT_MS,
    });

    const data = response.data;
    return {
      temp: data.main?.temp ?? 0,
      humidity: data.main?.humidity ?? 0,
      windSpeed: data.wind?.speed ?? 0,
      rain1h: data.rain?.['1h'] ?? 0,
      rain24h: data.rain?.['24h'] ?? 0,
      description: data.weather?.[0]?.description ?? 'Không có dữ liệu',
      icon: data.weather?.[0]?.icon ?? '01d',
    };
  },
  fetchForecast: async (lat: number, lng: number): Promise<ForecastSummary[]> => {
    const response = await axios.get(`${OWM_BASE_URL}/forecast`, {
      params: {
        lat,
        lon: lng,
        appid: process.env.WEATHER_API_KEY,
        units: 'metric',
        lang: 'vi',
      },
      timeout: WEATHER_API.TIMEOUT_MS,
    });

    return (response.data.list || []).slice(0, WEATHER_API.FORECAST_ITEM_COUNT).map((item: any) => ({
      date: item.dt_txt,
      temp: item.main?.temp ?? 0,
      description: item.weather?.[0]?.description ?? 'Không có dữ liệu',
      icon: item.weather?.[0]?.icon ?? '01d',
      rainChance: item.pop ?? 0,
    }));
  },
};

export const openMeteoProvider: WeatherProvider = {
  isAvailable: () => true,
  fetchCurrent: async (lat: number, lng: number): Promise<WeatherData> => {
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lng,
        current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,rain,is_day',
        timezone: 'Asia/Bangkok',
      },
      timeout: WEATHER_API.TIMEOUT_MS,
    });

    const current = response.data.current;
    return {
      temp: current?.temperature_2m ?? 0,
      humidity: current?.relative_humidity_2m ?? 0,
      windSpeed: current?.wind_speed_10m ?? 0,
      rain1h: current?.rain ?? 0,
      rain24h: current?.rain ?? 0,
      description: 'Dữ liệu thời tiết từ Open-Meteo',
      icon: mapOpenMeteoCode(current?.weather_code),
    };
  },
  fetchForecast: async (lat: number, lng: number): Promise<ForecastSummary[]> => {
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lng,
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
        forecast_days: 5,
        timezone: 'Asia/Bangkok',
      },
      timeout: WEATHER_API.TIMEOUT_MS,
    });

    const daily = response.data.daily || {};
    return (daily.time || []).map((date: string, idx: number) => ({
      date,
      temp: Math.round(((daily.temperature_2m_max?.[idx] ?? 0) + (daily.temperature_2m_min?.[idx] ?? 0)) / 2),
      description: 'Dự báo thời tiết',
      icon: mapOpenMeteoCode(daily.weather_code?.[idx]),
      rainChance: daily.precipitation_probability_max?.[idx] ?? 0,
    }));
  },
};
