import { Router } from 'express';
import { simulateAttack } from '../controllers/simulationController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.post('/', protect, simulateAttack);

export default router;
