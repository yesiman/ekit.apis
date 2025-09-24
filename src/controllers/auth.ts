import { Request, Response } from "express";
import { mongo } from "../services/mongo";
import { OAuth2Client } from "google-auth-library";
import { jsonWT } from "../services/jwt";
import { env } from "../config/env";

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
                const token = jsonWT.sign({_id:user._id,"credentials":user.credentials});
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
                let user = await mongo.users.getOne({ "credentials.login": (realUserData as any).payload.email});

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
                    // NEW USER CREATION
                    const result = await mongo.users.add(userBack);
                    // GET RESULT UID FOR SIGNIN
                    user = {
                        _id:result.insertedId
                    };
                    //console.log("insertResult",insertResult);
                }
                else  {
                    userBack= user;
                }
                const token = jsonWT.sign({_id:user?._id,"credentials":userBack.credentials});
                //userBack.params = await mongo.getUserParamsNoRequest(userBack.email);
                //userBack.profile = await mongo.getUserNoRequest(userBack.email);
                delete userBack.credentials.pass;
                delete userBack.pres;
                res.json({
                    user:user, 
                    token:token
                });
                //res.json((realUserData as any).payload);
            } catch (error) {
                console.log(error);
                res.status(500).send({ msg: 'Something went wrong' });
            }
        },
        //DECODEAGE HASH ENVOYE PAR GOOGLE CONTENANT LES INFOS DE L'USER
        getDecodedOAuthJwtGoogle: async (token: string) => {
            try {
                const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
            
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