import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { asyncHandler } from '../middlewares/error.middleware';
import { successResponse } from '../utils/response.util';
import { PartnerRatingService } from '../services/partner-rating.service';

export const getEligiblePartners = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const partners = await PartnerRatingService.getEligiblePartners(
      req.user!.id,
      req.user!.role
    );

    res.status(200).json(successResponse({ partners }));
  }
);

export const createPartnerRating = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const rating = await PartnerRatingService.createRating(
      req.user!.id,
      req.user!.role,
      req.body
    );

    res
      .status(201)
      .json(successResponse({ rating }, 'Gửi đánh giá đối tác thành công'));
  }
);

export const getMyPartnerRatings = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const result = await PartnerRatingService.getMyRatings(
      req.user!.id,
      req.user!.role
    );

    res.status(200).json(successResponse(result));
  }
);
