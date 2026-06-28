import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { WithdrawalService } from '../services/withdrawal.service';
import { asyncHandler } from '../middlewares/error.middleware';
import { successResponse } from '../utils/response.util';

export const createWithdrawal = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const request = await WithdrawalService.createRequest(req.user!.id, req.body);
    res.status(201).json(
      successResponse(
        { request },
        'Đã gửi yêu cầu rút tiền. Vui lòng chờ quản trị viên duyệt.'
      )
    );
  }
);

export const getMyWithdrawals = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const data = await WithdrawalService.getUserRequests(req.user!.id);
    res.status(200).json(successResponse(data));
  }
);

export const adminListWithdrawals = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const status = req.query.status as string | undefined;
    const data = await WithdrawalService.listAll(status, page, limit);
    res.status(200).json(successResponse(data));
  }
);

export const adminCompleteWithdrawal = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const request = await WithdrawalService.complete(
      req.params.id,
      req.user!.id,
      req.body.adminNote
    );
    res.status(200).json(
      successResponse(
        { request },
        'Đã hoàn tất rút tiền và trừ số dư người dùng.'
      )
    );
  }
);

export const adminRejectWithdrawal = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const request = await WithdrawalService.reject(
      req.params.id,
      req.user!.id,
      req.body.adminNote
    );
    res.status(200).json(
      successResponse({ request }, 'Đã từ chối đơn rút tiền.')
    );
  }
);
