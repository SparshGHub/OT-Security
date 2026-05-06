import type { Request, Response } from 'express';
import { runSimulation } from '../../services/simulationService';

/**
 * Initiates a simulation for a given component/attack.
 * Notes:
 * - `req.user` is added by auth middleware at runtime. To keep TS strict, access it via `(req as any)`.
 * - Returns the attack_id, fired rules, events, and mapped mitigations.
 */
export const simulateAttack = async (req: Request, res: Response) => {
  // When auth middleware is present, it should attach { userId, role } to req.user
  const userFromReq = (req as any).user;
  const initiated_by =
    userFromReq?.userId || 'a3b5c7d9-e1f3-4a6b-8c7d-9e1f3a6b8c7d'; // fallback test user

  const { component_id, attack_type, params } = req.body;

  if (!component_id || !attack_type) {
    return res
      .status(400)
      .json({ message: 'component_id and attack_type are required' });
  }

  try {
    const result = await runSimulation(component_id, attack_type, params, initiated_by);
    return res.json(result);
  } catch (error) {
    console.error('Simulation failed:', error);
    if (error instanceof Error) {
      return res.status(500).json({ message: 'Simulation failed', error: error.message });
    }
    return res
      .status(500)
      .json({ message: 'An unknown error occurred during simulation' });
  }
};

