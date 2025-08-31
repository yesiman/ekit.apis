import { Request, Response } from "express";
import { mongo } from "./db/mongo";
import jwt from "jsonwebtoken";

// CUSTOM AUTH MANAGEMENT
export const auth = {
    custom: {
        // LOGIN WITH PASS/LOGIN
        log:async (req: Request, res: Response) => {
            // RECUPERATION USER LIE
            const user = await mongo.users.getOne({ "credentials.login": req.body.login, "credentials.pass": req.body.pass});
            console.log(user);
            
            let ret = null;
            // CHECK IF CREDENTIAL OK
            if (user?.credentials?.valid) {
                delete user.credentials.pass;
                delete user.pres;
                const token = jwt.sign({"credentials":user.credentials}, process.env.JWT as string, {
                    expiresIn: 14400 
                });
                ret = {
                    user:user, 
                    token:token
                };
                console.log("okuser",ret);
            }
            res.json(ret);
        }
    },
}