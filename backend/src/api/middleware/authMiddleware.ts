import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the Request type to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; role: string };
    }
  }
}


export const protect = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return res.status(500).json({ message: 'Server configuration error: JWT secret missing' });
    }

    try {
        const decoded = jwt.verify(token, jwtSecret) as { userId: string; role: string; iat: number; exp: number };
        req.user = { userId: decoded.userId, role: decoded.role };
        next();
    } catch (error) {
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};
