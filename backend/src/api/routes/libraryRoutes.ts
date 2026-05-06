import { Router } from 'express';
import { getRules, getMitigations } from '../controllers/libraryController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// This single router will handle both /api/library/rules and /api/library/mitigations
router.get('/rules', protect, getRules);
router.get('/mitigations', protect, getMitigations);

export default router;
