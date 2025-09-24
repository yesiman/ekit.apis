import { env } from "../config/env";
import jwt from "jsonwebtoken";

export const jsonWT = {
    sign:(data:any):string => {
        return jwt.sign(data, env.JWT, { expiresIn: 14400 });
    },
    decode:(data:any):any => {
        return jwt.verify(data, env.JWT);
    },
}