import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import {
  createTopup,
  verifyTopup,
  handleWebhook,
  demoTopup,
  getWalletInfo,
  getTransactions,
  cancelTopup,
} from '../controllers/payment.controller';

const router = Router();

// PayOS webhook — no auth required (PayOS calls this)
router.post('/webhook', handleWebhook);

// All other routes require authentication
router.use(protect);

router.get('/wallet', getWalletInfo);
router.get('/transactions', getTransactions);
router.post('/topup', createTopup);
router.post('/topup/verify', verifyTopup);
router.post('/demo-topup', demoTopup);
router.post('/cancel', cancelTopup);

export default router;
