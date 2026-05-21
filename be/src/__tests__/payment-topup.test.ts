import User from '../models/User.model';
import PaymentTransaction from '../models/PaymentTransaction.model';
import { PaymentService } from '../services/payment.service';
import { connectTestDb, disconnectTestDb, clearTestDb } from './helpers/db';

describe('PaymentService topup', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    process.env.SEPAY_MERCHANT_ID = 'test-merchant';
    process.env.SEPAY_SECRET_KEY = 'test-secret';
    process.env.SEPAY_ACCOUNT_NUMBER = '1234567890';
    process.env.SEPAY_BANK_CODE = 'VCB';
    process.env.SEPAY_ACCOUNT_NAME = 'PREONIC TEST';
    process.env.PUBLIC_API_URL = 'http://localhost:8080';
  });

  it('creates a pending topup transaction', async () => {
    const user = await User.create({
      email: 'pay@test.local',
      password: 'password123',
      role: 'enterprise',
      firstName: 'Pay',
      lastName: 'User',
      fullName: 'Pay User',
    });

    const result = await PaymentService.createTopup(String(user._id), 20000, 'Test topup');
    expect(result.paymentMethod).toBe('sepay');

    const transaction = await PaymentTransaction.findOne({
      userId: user._id,
      type: 'topup',
    });

    expect(transaction).not.toBeNull();
    expect(transaction?.status).toBe('pending');
    expect(transaction?.amount).toBe(20000);
  });
});
