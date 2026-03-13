import api from './api';

const paymentService = {
  /** Get wallet info (balance + stats + recent transactions) */
  getWallet: () => api.get('/payment/wallet'),

  /** Get transaction history with pagination */
  getTransactions: (page = 1, limit = 20, type = '') => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (type) params.set('type', type);
    return api.get(`/payment/transactions?${params}`);
  },

  /** Create a real PayOS top-up link */
  createTopup: (amount, description = '') =>
    api.post('/payment/topup', { amount, description }),

  /** Verify a PayOS payment after returning from gateway */
  verifyTopup: (orderCode) =>
    api.post('/payment/topup/verify', { orderCode }),

  /** Demo top-up — instant virtual credit */
  demoTopup: (amount) =>
    api.post('/payment/demo-topup', { amount }),

  /** Cancel a pending top-up */
  cancelTopup: (orderCode) =>
    api.post('/payment/cancel', { orderCode }),
};

export default paymentService;
