import { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
    status: number;
    details?: unknown;

    constructor(status:number,message:string,details?:unknown) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

export function errorHandler(err:unknown,_req:Request,res:Response,_next:NextFunction) {
    const status = err instanceof HttpError ? err.status : 500;
    const message = err instanceof HttpError ? err.message : "Internal Server Error";
    const details = err instanceof HttpError ? err.details : undefined;
}