import type { Request, Response } from 'express';
import pool from '../../db/pool';

export const getRules = async (req: Request, res: Response) => {
    try {
        const { rows } = await pool.query('SELECT * FROM rules');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching rules:', error);
        res.status(500).json({ message: 'Failed to fetch rules' });
    }
};

export const getMitigations = async (req: Request, res: Response) => {
    try {
        const { rows } = await pool.query('SELECT * FROM mitigations');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching mitigations:', error);
        res.status(500).json({ message: 'Failed to fetch mitigations' });
    }
};
