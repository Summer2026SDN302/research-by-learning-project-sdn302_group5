import mongoose, { Document, Schema } from 'mongoose';
import { WeatherAlertType, WeatherAlertSeverity, WeatherData } from '../types';

export interface IWeatherAlert extends Document {
  userId: mongoose.Types.ObjectId;
  province: string;
  alertType: WeatherAlertType;
  severity: WeatherAlertSeverity;
  message: string;
  detail: string;
  weatherData: WeatherData;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WeatherAlertSchema = new Schema<IWeatherAlert>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    province: {
      type: String,
      required: true,
    },
    alertType: {
      type: String,
      enum: ['extreme_heat', 'extreme_cold', 'heavy_rain', 'strong_wind', 'drought'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['warning', 'critical'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    detail: {
      type: String,
      required: true,
    },
    weatherData: {
      temp: Number,
      humidity: Number,
      windSpeed: Number,
      rain1h: Number,
      rain24h: Number,
      description: String,
      icon: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc: any, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

WeatherAlertSchema.index({ userId: 1, createdAt: -1 });
WeatherAlertSchema.index({ userId: 1, isRead: 1 });
WeatherAlertSchema.index({ alertType: 1 });

export default mongoose.model<IWeatherAlert>('WeatherAlert', WeatherAlertSchema);
