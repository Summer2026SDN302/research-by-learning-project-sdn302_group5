import { Router } from 'express';
import { protect, restrictTo } from '../middlewares/auth.middleware';
import {
  getDashboard,
  getUsers,
  getUserDetail,
  toggleUserStatus,
  getAllContracts,
  getContractDetail,
  getAllDisputes,
  getDisputeDetail,
  resolveDisputeAdmin,
  getAllTransactions,
} from '../controllers/admin.controller';

const router = Router();

// All admin routes require authentication + admin role
router.use(protect);
router.use(restrictTo('admin'));

// Dashboard
router.get('/dashboard', getDashboard);

// User management
router.get('/users', getUsers);
router.get('/users/:id', getUserDetail);
router.patch('/users/:id/toggle-status', toggleUserStatus);

// Contract management
router.get('/contracts', getAllContracts);
router.get('/contracts/:id', getContractDetail);

// Dispute management
router.get('/disputes', getAllDisputes);
router.get('/disputes/:id', getDisputeDetail);
router.post('/disputes/:id/resolve', resolveDisputeAdmin);

// Transaction overview
router.get('/transactions', getAllTransactions);

export default router;
