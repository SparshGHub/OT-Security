import type { Request, Response } from 'express';
import pool from '../../db/pool';

// ---------- GET TOPOLOGY (normalized connectivity keys) ----------
export const getPlantTopology = async (req: Request, res: Response) => {
  try {
    const [processesRes, componentsRes, setpointsRes, connectivityRes] = await Promise.all([
      pool.query('SELECT * FROM processes ORDER BY sequence'),
      pool.query('SELECT * FROM components'),
      pool.query('SELECT * FROM setpoints'),
      pool.query('SELECT * FROM connectivity'),
    ]);

    const connectivity = connectivityRes.rows.map((row: any) => ({
      id: row.id,
      from_component_id: row.from_component,
      to_component_id: row.to_component,
      protocol: row.protocol,
      direction: row.direction,
      metadata: row.metadata ?? null,
    }));

    res.json({
      processes: processesRes.rows,
      components: componentsRes.rows,
      setpoints: setpointsRes.rows,
      connectivity,
    });
  } catch (error) {
    console.error('Error fetching plant topology:', error);
    res.status(500).json({ message: 'Failed to fetch plant topology' });
  }
};

// ---------- GET COMPONENT BY ID ----------
export const getComponentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const comp = await pool.query('SELECT * FROM components WHERE id = $1', [id]);
    if (comp.rows.length === 0) {
      return res.status(404).json({ message: 'Component not found' });
    }
    const setpointsRes = await pool.query('SELECT * FROM setpoints WHERE component_id = $1', [id]);

    res.json({
      ...comp.rows[0],
      setpoints: setpointsRes.rows,
    });
  } catch (error) {
    console.error('Error fetching component:', error);
    res.status(500).json({ message: 'Failed to fetch component' });
  }
};

// ---------- CREATE COMPONENT ----------
export const createComponent = async (req: Request, res: Response) => {
  try {
    const { process_id, name, type, network_zone, ip = null, criticality } = req.body;

    if (!process_id || !name || !type || !network_zone || !criticality) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const insert = await pool.query(
      `INSERT INTO components (process_id, name, type, network_zone, ip, criticality)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [process_id, name, type, network_zone, ip, criticality]
    );

    res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error('createComponent error:', err);
    res.status(500).json({ message: 'Failed to create component' });
  }
};

// ---------- DELETE COMPONENT (cascades via FKs) ----------
export const deleteComponent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const del = await pool.query('DELETE FROM components WHERE id = $1 RETURNING id', [id]);
    if (del.rowCount === 0) return res.status(404).json({ message: 'Component not found' });
    res.status(204).send();
  } catch (err) {
    console.error('deleteComponent error:', err);
    res.status(500).json({ message: 'Failed to delete component' });
  }
};

// ---------- CREATE CONNECTIVITY (EDGE) ----------
export const createConnectivity = async (req: Request, res: Response) => {
  try {
    const { from_component_id, to_component_id, protocol, direction } = req.body;

    if (!from_component_id || !to_component_id || !protocol || !direction) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const insert = await pool.query(
      `INSERT INTO connectivity (from_component, to_component, protocol, direction)
       VALUES ($1,$2,$3,$4)
       RETURNING id, from_component AS from_component_id, to_component AS to_component_id, protocol, direction`,
      [from_component_id, to_component_id, protocol, direction]
    );

    res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error('createConnectivity error:', err);
    res.status(500).json({ message: 'Failed to create connectivity' });
  }
};

// ---------- DELETE CONNECTIVITY (EDGE) ----------
export const deleteConnectivity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const del = await pool.query('DELETE FROM connectivity WHERE id = $1 RETURNING id', [id]);
    if (del.rowCount === 0) return res.status(404).json({ message: 'Connectivity not found' });
    res.status(204).send();
  } catch (err) {
    console.error('deleteConnectivity error:', err);
    res.status(500).json({ message: 'Failed to delete connectivity' });
  }
};

