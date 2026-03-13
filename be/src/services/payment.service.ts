import { PayOS } from '@payos/node';
import User from '../models/User.model';
import PaymentTransaction from '../models/PaymentTransaction.model';
import { AppError } from '../middlewares/error.middleware';

let payos: PayOS | null = null;

function getPayOS(): PayOS {
  if (!payos) {
    if (!process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY || !process.env.PAYOS_CHECKSUM_KEY) {
      throw new AppError('PayOS chưa được cấu hình. Vui lòng thiết lập PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY trong .env', 500);
    }
    payos = new PayOS();
  }
  return payos;
}

export class PaymentService {
  /**
   * Create a top-up payment link via PayOS
   */
  static async createTopup(
    userId: string,
    amount: number,
    description?: string
  ) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('Người dùng không tồn tại', 404);

    if (amount < 10000) {
      throw new AppError('Số tiền nạp tối thiểu là 10.000 VND', 400);
    }
    if (amount > 500000000) {
      throw new AppError('Số tiền nạp tối đa là 500.000.000 VND', 400);
    }

    // Generate unique order code (timestamp + random)
    const orderCode = Number(
      `${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`
    );

    // Create pending transaction
    const transaction = await PaymentTransaction.create({
      userId,
      type: 'topup',
      amount,
      status: 'pending',
      paymentMethod: 'payos',
      orderCode,
      description: description || `Nạp ${amount.toLocaleString('vi-VN')} VND vào ví PreOnic`,
      balanceBefore: user.virtualBalance,
      balanceAfter: user.virtualBalance, // will be updated on success
    });

    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Create PayOS payment link
    // PayOS enforces a strict 25-character limit on description
    const shortDesc = `PreOnic #${String(orderCode).slice(-8)}`; // max 18 chars
    const paymentData = await getPayOS().paymentRequests.create({
      orderCode,
      amount,
      description: shortDesc,
      cancelUrl: `${FRONTEND_URL}/payment/cancel?orderCode=${orderCode}`,
      returnUrl: `${FRONTEND_URL}/payment/success?orderCode=${orderCode}`,
    });

    // Store checkout URL in metadata
    transaction.metadata = { checkoutUrl: paymentData.checkoutUrl };
    await transaction.save();

    return {
      checkoutUrl: paymentData.checkoutUrl,
      orderCode,
      transactionId: transaction._id,
    };
  }

  /**
   * Handle PayOS webhook / verify payment
   */
  static async handleWebhook(webhookData: any) {
    const verifiedData = await getPayOS().webhooks.verify(webhookData);

    const { orderCode } = verifiedData;
    return this.processOrder(orderCode, 'webhook');
  }

  /**
   * Verify and process a payment by orderCode (called from return URL or webhook)
   */
  static async verifyAndProcess(orderCode: number) {
    const paymentInfo = await getPayOS().paymentRequests.get(orderCode);

    if (paymentInfo.status === 'PAID') {
      return this.processOrder(orderCode, 'verify');
    }

    return {
      success: false,
      status: paymentInfo.status,
      message: 'Giao dịch chưa được thanh toán',
    };
  }

  /**
   * Internal: process a successful payment
   */
  private static async processOrder(orderCode: number, source: string) {
    const transaction = await PaymentTransaction.findOne({ orderCode });
    if (!transaction) {
      throw new AppError('Giao dịch không tồn tại', 404);
    }

    // Already processed — idempotent
    if (transaction.status === 'completed') {
      return {
        success: true,
        alreadyProcessed: true,
        transaction,
      };
    }

    // Credit virtual balance
    const user = await User.findById(transaction.userId);
    if (!user) throw new AppError('Người dùng không tồn tại', 404);

    const balanceBefore = user.virtualBalance;
    user.virtualBalance += transaction.amount;
    await user.save({ validateBeforeSave: false });

    // Update transaction
    transaction.status = 'completed';
    transaction.balanceBefore = balanceBefore;
    transaction.balanceAfter = user.virtualBalance;
    transaction.completedAt = new Date();
    transaction.metadata = {
      ...transaction.metadata,
      processedBy: source,
    };
    await transaction.save();

    return {
      success: true,
      alreadyProcessed: false,
      transaction,
      newBalance: user.virtualBalance,
    };
  }

  /**
   * Demo top-up (instant, no real payment)
   */
  static async demoTopup(userId: string, amount: number) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('Người dùng không tồn tại', 404);

    if (amount < 1000) {
      throw new AppError('Số tiền nạp demo tối thiểu 1.000 VND', 400);
    }

    const balanceBefore = user.virtualBalance;
    user.virtualBalance += amount;
    await user.save({ validateBeforeSave: false });

    const transaction = await PaymentTransaction.create({
      userId,
      type: 'topup',
      amount,
      status: 'completed',
      paymentMethod: 'demo',
      description: `[Demo] Nạp ${amount.toLocaleString('vi-VN')} VND`,
      balanceBefore,
      balanceAfter: user.virtualBalance,
      completedAt: new Date(),
    });

    return {
      transaction,
      newBalance: user.virtualBalance,
    };
  }

  /**
   * Get transaction history for a user
   */
  static async getTransactions(
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: string
  ) {
    const query: any = { userId };
    if (type) query.type = type;

    const total = await PaymentTransaction.countDocuments(query);
    const transactions = await PaymentTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get balance + quick stats
   */
  static async getWalletInfo(userId: string) {
    const user = await User.findById(userId).select('virtualBalance fullName role');
    if (!user) throw new AppError('Người dùng không tồn tại', 404);

    const [totalTopup, totalSpent, recentTransactions] = await Promise.all([
      PaymentTransaction.aggregate([
        { $match: { userId: user._id, type: 'topup', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      PaymentTransaction.aggregate([
        {
          $match: {
            userId: user._id,
            type: { $in: ['escrow_deposit', 'commission'] },
            status: 'completed',
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      PaymentTransaction.find({ userId: user._id, status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    return {
      balance: user.virtualBalance,
      fullName: user.fullName,
      role: user.role,
      stats: {
        totalTopup: totalTopup[0]?.total || 0,
        totalSpent: totalSpent[0]?.total || 0,
      },
      recentTransactions,
    };
  }

  /**
   * Cancel a pending topup
   */
  static async cancelTopup(orderCode: number, userId: string) {
    const transaction = await PaymentTransaction.findOne({ orderCode, userId });
    if (!transaction) throw new AppError('Giao dịch không tồn tại', 404);
    if (transaction.status !== 'pending') {
      throw new AppError('Chỉ có thể hủy giao dịch đang chờ', 400);
    }

    try {
      await getPayOS().paymentRequests.cancel(orderCode);
    } catch {
      // PayOS link may already be expired — still mark as cancelled
    }

    transaction.status = 'cancelled';
    await transaction.save();

    return transaction;
  }
}
