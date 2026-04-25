import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../../db/pool';
import { compare } from 'bcryptjs';

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const isMatch = await compare(password, user.password_hash);
        if(!isMatch){
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET is not defined!');
            return res.status(500).json({ message: 'Server configuration error' });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            jwtSecret,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error during login' });
    }
};
