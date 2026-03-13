/**
 * Application-wide constants
 * Eliminates magic numbers and provides single source of truth
 */

// ===== TIME CONSTANTS (in milliseconds) =====
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;
export const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
export const TEN_MINUTES_MS = 10 * 60 * 1000;

// ===== AUTH CONSTANTS =====
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCK_DURATION_MS = FIFTEEN_MINUTES_MS;
export const PASSWORD_MIN_LENGTH = 6;

// ===== COOKIE CONFIG =====
export const REFRESH_TOKEN_COOKIE = 'refreshToken';

export const getRefreshTokenCookieOptions = (maxAge: number = THIRTY_DAYS_MS) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge,
});

export const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  expires: new Date(0),
};

// ===== PAGINATION DEFAULTS =====
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;

// ===== USER ROLES =====
export const ROLES = {
  FARMER: 'farmer',
  ENTERPRISE: 'enterprise',
} as const;

// ===== WEATHER THRESHOLDS =====
export const WEATHER_THRESHOLDS = {
  EXTREME_HEAT_TEMP: 38,      // °C
  EXTREME_COLD_TEMP: 5,       // °C
  HEAVY_RAIN_MM: 100,         // mm/day
  STRONG_WIND_KMH: 60,        // km/h
  DROUGHT_MM: 5,              // mm in DROUGHT_DAYS
  DROUGHT_DAYS: 14,           // consecutive days
} as const;

// ===== WEATHER CRON SCHEDULE =====
export const WEATHER_CRON_SCHEDULE = '0 */6 * * *';  // Every 6 hours

