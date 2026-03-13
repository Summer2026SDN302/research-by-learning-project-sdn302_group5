import mongoose from 'mongoose';

const MONGODB_URI = () => process.env.MONGODB_URI || 'mongodb://localhost:27017/preoonic';
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 8000;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let isConnecting = false;
let hasConnectedOnce = false;

/**
 * Connect to MongoDB with retry.  Does NOT register a 'disconnected' handler that
 * triggers a new chain — mongoose's own heartbeat will fire 'disconnected' and we
 * handle that separately with a single guarded call.
 */
export async function connectDB(onConnected?: () => void): Promise<void> {
  // Register one-time process/event hooks
  mongoose.connection.once('connected', () => {
    console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
    console.log(`📊 Database: ${mongoose.connection.name}`);
    isConnecting = false;
    hasConnectedOnce = true;

    if (onConnected) {
      onConnected();
    }

    // Only after a successful connect do we set up the disconnect handler
    mongoose.connection.on('disconnected', onDisconnected);
  });

  mongoose.connection.on('error', (err: Error) => {
    // Log TLS / network errors without crashing
    console.error('❌ MongoDB error:', err.message);
  });

  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  });

  await attempt(0);
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export function hasDatabaseConnectedOnce(): boolean {
  return hasConnectedOnce;
}

function onDisconnected() {
  // Remove so it doesn't stack on each reconnect cycle
  mongoose.connection.off('disconnected', onDisconnected);
  console.warn('⚠️  MongoDB disconnected — reconnecting...');
  attempt(1).catch(() => {});
}

async function attempt(start: number): Promise<void> {
  if (isConnecting) return; // prevent parallel chains
  isConnecting = true;

  for (let i = start; i <= MAX_RETRIES; i++) {
    if (i === 0) console.log('🔄 Connecting to MongoDB...');
    else console.log(`🔄 Reconnecting to MongoDB (attempt ${i}/${MAX_RETRIES})...`);

    try {
      await mongoose.connect(MONGODB_URI(), {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        family: 4,
      });
      // 'connected' event fires → logs success, registers disconnect handler, clears flag
      return;
    } catch (err: any) {
      console.error(`❌ MongoDB connection failed: ${err.message}`);
      if (i < MAX_RETRIES) {
        console.log(`⏳ Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await sleep(RETRY_DELAY_MS);
      } else {
        console.error('❌ Max retries reached. Server running without DB — retry manually or fix Atlas IP whitelist.');
        isConnecting = false;
      }
    }
  }
}

export default connectDB;
