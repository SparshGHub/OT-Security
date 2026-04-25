import { Router } from 'express';
import { getEvents, mitigateEvent, mitigateAllEvents } from '../controllers/eventsController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.get('/', protect, getEvents);
router.post('/mitigate-all', protect, mitigateAllEvents);
router.post('/:id/mitigate', protect, mitigateEvent);

export default router;
