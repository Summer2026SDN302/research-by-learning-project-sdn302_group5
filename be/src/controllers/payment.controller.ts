import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { PaymentService } from '../services/payment.service';
import { successResponse } from '../utils/response.util';

/**
 * POST /payment/topup — Create a PayOS payment link for topping up
 */
export const createTopup = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { amount, description } = req.body;
    const result = await PaymentService.createTopup(
      req.user!.id,
      Number(amount),
      description
    );
    res.status(200).json(successResponse(result, 'Tạo liên kết thanh toán thành công'));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /payment/topup/verify — Verify payment after return from PayOS
 */
export const verifyTopup = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderCode } = req.body;
    const result = await PaymentService.verifyAndProcess(Number(orderCode));
    res.status(200).json(successResponse(result, result.success ? 'Nạp tiền thành công' : 'Giao dịch chưa hoàn tất'));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /payment/webhook — PayOS webhook handler
 */
export const handleWebhook = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await PaymentService.handleWebhook(req.body);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /payment/demo-topup — Demo instant top-up (no real payment)
 */
export const demoTopup = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { amount } = req.body;
    const result = await PaymentService.demoTopup(req.user!.id, Number(amount));
    res.status(200).json(successResponse(result, 'Nạp tiền demo thành công'));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /payment/wallet — Get wallet info + stats
 */
export const getWalletInfo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await PaymentService.getWalletInfo(req.user!.id);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /payment/transactions — Get transaction history
 */
export const getTransactions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const type = req.query.type as string | undefined;
    const result = await PaymentService.getTransactions(
      req.user!.id,
      page,
      limit,
      type
    );
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /payment/cancel — Cancel a pending topup
 */
export const cancelTopup = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderCode } = req.body;
    const result = await PaymentService.cancelTopup(
      Number(orderCode),
      req.user!.id
    );
    res.status(200).json(successResponse(result, 'Đã hủy giao dịch'));
  } catch (err) {
    next(err);
  }
};
