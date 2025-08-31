"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleAuth = void 0;
const google_auth_library_1 = require("google-auth-library");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongo_1 = require("../db/mongo");
exports.googleAuth = {
    //DECODEAGE HASH ENVOYE PAR GOOGLE CONTENANT LES INFOS DE L'USER
    getDecodedOAuthJwtGoogle: (token) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
            const ticket = yield client.verifyIdToken({
                idToken: token
            });
            return ticket;
        }
        catch (error) {
            return { status: 500, data: error };
        }
    }),
    //
    authenticate: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const realUserData = yield exports.googleAuth.getDecodedOAuthJwtGoogle(req.body.credential);
            /*const payload = { subject: user._id, email: user.email,userId: user._id };
            const jwtToken = jwt.sign(payload, String(process.env.JWT_SECRET));
            */
            let userBack;
            let isNewUser = false;
            //CHECK IF USER IN DB
            let user = yield mongo_1.mongo.users.getUserNoRequest(realUserData.payload.email);
            if (!user) {
                isNewUser = true;
                userBack = {
                    email: realUserData.payload.email,
                    ownerUID: realUserData.payload.email,
                    name: realUserData.payload.name,
                    surn: realUserData.payload.given_name,
                    picture: realUserData.payload.picture,
                    dateCreation: new Date(),
                    prompts: [
                        {
                            uid: -1,
                            lib: "Default RAG",
                            customPrompt: "You are an assistant for question-answering tasks. Use only the following pieces of retrieved context to answer the question. If you don't know the answer, just say that you don't know. Please be as detailed as possible in your answers. "
                        }
                    ]
                };
                yield mongo_1.mongo.users.add(userBack);
            }
            else {
                userBack = user;
            }
            let token = jsonwebtoken_1.default.sign(userBack, process.env.JWT_SECRET, {
                expiresIn: 14400
            });
            userBack.token = token;
            //userBack.params = await mongo.getUserParamsNoRequest(userBack.email);
            //userBack.profile = await mongo.getUserNoRequest(userBack.email);
            res.json(userBack);
            //res.json((realUserData as any).payload);
        }
        catch (error) {
            console.log(error);
            res.status(500).send({ msg: 'Something went wrong' });
        }
    }),
    //UNUTILE
    hello: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        res.json(`Hey, `);
    }),
};
