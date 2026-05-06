import { Router } from 'express';
import plantRoutes from './plantRoutes';
import simulationRoutes from './simulationRoutes';
import eventRoutes from './eventRoutes';
import libraryRoutes from './libraryRoutes';
import authRoutes from './authRoutes';

const router = Router();

router.use('/plant', plantRoutes);
router.use('/simulate', simulationRoutes);
router.use('/events', eventRoutes);
router.use('/library', libraryRoutes); // Consolidated library routes
router.use('/auth', authRoutes);


router.get('/', (req, res) => {
    res.send('API is running');
});

export default router;
