import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const middle = {
    checkTokenValidity:async (req: Request, res: Response, next:NextFunction) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];  // Bearer <token>
        if (token)
        {
            console.log("token",token);
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
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

