import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export const middle = {
    checkTokenValidity:async (req: Request, res: Response, next:NextFunction) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];  // Bearer <token>
        // IF TOKEN CHECK IF CORRECT
        if (token)
        {
            try {
                const decoded = jwt.verify(token, env.JWT as string);
                req.decoded = decoded;
                
                next();
            } catch (error) {
                return res.status(403).json({ 
                    status:403,
                    success: false, 
                    message: 'Bad token or expired.' 
                });
            }
        }
        else {
            return res.status(403).json({ 
                status:403,
                success: false, 
                message: 'Bad token or expired.' 
            });
        }
    }
}

