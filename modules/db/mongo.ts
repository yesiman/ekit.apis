import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { MongoClient } from 'mongodb';
// MONGODB CONNECTION
var mongoOptions = {};
mongoOptions = {
    ssl: false,
    //useNewUrlParser: true
};
const mongoClient = new MongoClient(process?.env?.MONGOHQ_URL ?? "");
// DATABASE DEFINITION
const mongoDB = mongoClient.db(process.env.MONGOHQ_DB);
//
export const mongo = {
    helper:{
    },
    users: {
        collection: mongoDB.collection('users'),
        getOne:async (query:any) => {
            return await mongo.users.collection.findOne(query);
        }
    },
    projects: {
        collection: mongoDB.collection('projects'),
        // LOAD DES PROJETS DEMANDES (UIDs)
        getAll: async ([]) => {
            return await mongo.projects.collection.find({}).toArray();;
        }
    },
    metas: {
        add:async (metas:any) => {
            const metasCol = mongoDB.collection('metas');
            metas.dateCreation = new Date();
            return await metasCol.insertOne(metas)
        },
        update:async (uid:string,metas:any) => {
            const metasCol = mongoDB.collection('metas');
            let updated = await metasCol.updateOne({_id:new ObjectId(uid)},{$set:metas})
        },
        load: async (req: Request, res: Response) => {
            const metasCol = mongoDB.collection('metas');
            let items = await metasCol
                .find({ownerUID:req.body.ownerUID})
                .collation({'locale':'en'})
                .sort({original_fname:1})
                .project({original_fname:1,path:1,fname:1,source_type:1,category:1,uid:1})
                .toArray();
            res.json({ret:items});
        },
        get:async (req: Request, res: Response) => {
            const metasCol = mongoDB.collection('metas');
            let ret = await metasCol.findOne({_id:new ObjectId(req.body.metaUID)});
            res.json({ret:ret});
        },
        getChunksUids:async (metaUids:any[]) => {
            const metasCol = mongoDB.collection('metas');
            console.log(metaUids);
            let ret = await metasCol.find({_id:{$in:metaUids}}).toArray();;
            return ret;
        },
        getFromfname:async (req: Request, res: Response) => {
            const metasCol = mongoDB.collection('metas');
            let ret = await metasCol.findOne({fname:req.body.fname});
            res.json({ret:ret});
        },
        delete:async (req: Request, res: Response) => {
            const metasCol = mongoDB.collection('metas');
            let ret = await metasCol.deleteMany({_id:new ObjectId(req.body.metaUID)});
            res.json({ret:ret});
        },
    },
    categs: {
        load: async (req: Request, res: Response) => {
            const categsCol = mongoDB.collection('categs');
            let items = await categsCol.find({ownerUID:req.body.ownerUID}).toArray();
            res.json({ret:items});
        },
        add: async (req: Request, res: Response) => {
            const categsCol = mongoDB.collection('categs');
            let added = await categsCol.insertOne(req.body)
            res.json(added);
        },
    },
}