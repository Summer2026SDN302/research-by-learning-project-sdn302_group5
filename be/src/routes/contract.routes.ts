import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import {
  createContract,
  getContract,
  listContracts,
  signContract,
  cancelContract,
  rejectContract,
} from '../controllers/contract.controller';

const router = Router();

// All contract routes require authentication
router.use(protect);

// ===== CONTRACT CRUD =====
router.post('/', createContract);
router.get('/', listContracts);
router.get('/:id', getContract);
router.post('/:id/sign', signContract);
router.post('/:id/cancel', cancelContract);
router.post('/:id/reject', rejectContract);

export default router;
