import dotenv from 'dotenv';
import app from './app';
import connectDB from './config/database';
import { startWeatherCron } from './jobs/weather-cron';
import { startShippingCron } from './jobs/shipping-cron';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB(() => {
  // Start cron jobs only when DB is ready, otherwise they will immediately fail with buffered queries.
  startWeatherCron();
  startShippingCron();
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║                                           ║
  ║   🌱 PreOnic Backend Server Running 🌱    ║
  ║                                           ║
  ║   Environment: ${process.env.NODE_ENV?.padEnd(26) || 'development'.padEnd(26)} ║
  ║   Port: ${PORT.toString().padEnd(32)} ║
  ║   API: http://localhost:${PORT}/api/v1 ${''.padEnd(10)} ║
  ║                                           ║
  ╚═══════════════════════════════════════════╝
  `);

});

// Handle unhandled promise rejections — log only, do not crash
process.on('unhandledRejection', (err: any) => {
  console.error('⚠️  Unhandled promise rejection (server kept running):');
  console.error(err?.name ?? 'Error', err?.message ?? err);
});

// Handle uncaught exceptions — log and exit only for truly fatal errors
process.on('uncaughtException', (err: Error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err.name, err.message);
  // Only exit if it is not a connection-related transient error
  if (!err.message?.includes('ECONNREFUSED') && !err.message?.includes('connect')) {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated!');
  });
});
