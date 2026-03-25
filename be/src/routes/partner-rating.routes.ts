import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import {
  createPartnerRating,
  getEligiblePartners,
  getMyPartnerRatings,
} from '../controllers/partner-rating.controller';

const router = Router();

router.use(protect);

router.get('/eligible-partners', getEligiblePartners);
router.get('/mine', getMyPartnerRatings);
router.post('/', createPartnerRating);

export default router;
