import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import {
  createEscrow,
  deposit,
  farmerConfirm,
  enterpriseConfirm,
  raiseDispute,
  getByContract,
  getEscrow,
  listEscrows,
  listUserDisputes,
  resolveDispute,
  getBalance,
} from '../controllers/escrow.controller';

const router = Router();

// All escrow routes require authentication
router.use(protect);

// ===== BALANCE =====
router.get('/balance', getBalance);

// ===== DISPUTES =====
router.get('/disputes', listUserDisputes);
router.post('/disputes/:id/resolve', resolveDispute);

// ===== ESCROW CRUD =====
router.post('/', createEscrow);
router.get('/', listEscrows);
router.get('/contract/:contractId', getByContract);
router.get('/:id', getEscrow);

// ===== ESCROW ACTIONS =====
router.post('/:id/deposit', deposit);
router.post('/:id/farmer-confirm', farmerConfirm);
router.post('/:id/enterprise-confirm', enterpriseConfirm);
router.post('/:id/dispute', raiseDispute);

export default router;
