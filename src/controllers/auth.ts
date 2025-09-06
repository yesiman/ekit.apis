import { Request, Response } from "express";
import { mongo } from "../services/mongo";
import jwt from "jsonwebtoken";
import { JWT, OAuth2Client } from "google-auth-library";

// CUSTOM AUTH MANAGEMENT
export const auth = {
    custom: {
        // LOGIN WITH PASS/LOGIN
        log:async (req: Request, res: Response) => {
            // RECUPERATION USER LIE
            const user = await mongo.users.getOne({ "credentials.login": req.body.login, "credentials.pass": req.body.pass});
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
            }
            res.json(ret);
        }
    },
    google:{
        //
        log: async (req: Request, res: Response) => {
            try {
                //GET GOOGLE ACCOUNT DATAS
                const realUserData = await auth.google.getDecodedOAuthJwtGoogle(req.body.credential)
                //
                let userBack:any;
                //CHECK IF USER IN DB
                const user = await mongo.users.getOne({ "credentials.login": (realUserData as any).payload.email});
                if (!user) {
                    userBack = {
                        email: (realUserData as any).payload.email,
                        ownerUID: (realUserData as any).payload.email,
                        name:(realUserData as any).payload.name,
                        surn:(realUserData as any).payload.given_name,
                        picture:(realUserData as any).payload.picture,
                        dateCreation:new Date(),
                        credentials: {
                            login:(realUserData as any).payload.email
                        }
                    }
                    await mongo.users.add(userBack);
                }
                else  {
                    userBack= user;
                }

                let token = jwt.sign({"credentials":userBack.credentials}, process.env.JWT_SECRET as string, {
                    expiresIn: 14400 
                });
                userBack.token = token;
                //userBack.params = await mongo.getUserParamsNoRequest(userBack.email);
                //userBack.profile = await mongo.getUserNoRequest(userBack.email);
                res.json(userBack);
                //res.json((realUserData as any).payload);
            } catch (error) {
                console.log(error);
                res.status(500).send({ msg: 'Something went wrong' });
            }
        },
        //DECODEAGE HASH ENVOYE PAR GOOGLE CONTENANT LES INFOS DE L'USER
        getDecodedOAuthJwtGoogle: async (token: string) => {
            try {
                const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
            
                const ticket = await client.verifyIdToken({
                    idToken: token
                })
            
                return ticket
            } catch (error) {
                return { status: 500, data: error }
            }
        },
    } 
}