import { Router } from 'express';
import {
  getPlantTopology,
  getComponentById,
  createComponent,
  deleteComponent,
  createConnectivity,
  deleteConnectivity,
} from '../controllers/plantController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.get('/', protect, getPlantTopology);
router.get('/components/:id', protect, getComponentById);

router.post('/components', protect, createComponent);
router.delete('/components/:id', protect, deleteComponent);

router.post('/connectivity', protect, createConnectivity);
router.delete('/connectivity/:id', protect, deleteConnectivity);

export default router;

