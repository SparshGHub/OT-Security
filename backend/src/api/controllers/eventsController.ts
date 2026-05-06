import type { Request, Response } from 'express';
import pool from '../../db/pool';

/**
 * Returns the most recent 100 events ordered by timestamp (desc).
 */
export const getEvents = async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM events ORDER BY timestamp DESC LIMIT 100'
    );
    return res.json(rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ message: 'Failed to fetch events' });
  }
};

/**
 * Marks an event as mitigated by setting is_mitigated = TRUE.
 */
export const mitigateEvent = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Mitigate all events associated with the same attack_id or component_id to ensure the component stops glowing
    const { rows, rowCount } = await pool.query(
      `UPDATE events 
       SET is_mitigated = TRUE 
       WHERE attack_id = (SELECT attack_id FROM events WHERE id = $1)
          OR (attack_id IS NULL AND component_id = (SELECT component_id FROM events WHERE id = $1))
       RETURNING *`,
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error(`Error mitigating event(s) related to ${id}:`, error);
    return res.status(500).json({ message: 'Failed to mitigate event' });
  }
};

/**
 * Marks ALL currently active events as mitigated (Bulk clear).
 */
export const mitigateAllEvents = async (_req: Request, res: Response) => {
  try {
    const { rowCount } = await pool.query(
      'UPDATE events SET is_mitigated = TRUE WHERE is_mitigated = FALSE OR is_mitigated IS NULL'
    );
    return res.json({ message: 'All active attacks mitigated', count: rowCount });
  } catch (error) {
    console.error('Error mitigating all events:', error);
    return res.status(500).json({ message: 'Failed to mitigate all events' });
  }
};

