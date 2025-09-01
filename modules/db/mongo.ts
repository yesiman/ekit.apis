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
        getAll: async (ids:[]) => {
            //On TRANSFORME LES id en string en ObjectID
            const networksIds = ids.map((item:string) => 
                new ObjectId(item));

            var aggParams = [];
            aggParams.push({$lookup: {
                from: "objects_langs",
                localField: "_id",    // field in the orders collection
                foreignField: "objectid",
                as: "body",
            }});
            aggParams.push({ "$unwind": "$body" });
            aggParams.push({ "$match": 
            {
                _id:{$in:networksIds},
                "body.lang":"fr"
            } 
            });     
            return mongo.projects.collection.aggregate(aggParams).toArray();
        }
    },
    tables: {
        collection: mongoDB.collection('prototypes'),
        // LOAD DES PROJETS DEMANDES (UIDs)
        getAll: async (ids:[]) => {
            //On TRANSFORME LES id en string en ObjectID
            //const networksIds = ids.map((item:string) => 
            //    new ObjectId(item));

            var aggParams = [];
            aggParams.push({$lookup: {
                from: "objects_langs",
                localField: "_id",    // field in the orders collection
                foreignField: "objectid",
                as: "body",
            }});
            aggParams.push({ "$unwind": "$body" });
            aggParams.push({ "$match": 
            {
                "body.lang":"fr"
            } 
            });     
            
            return mongo.tables.collection.aggregate(aggParams).toArray();
        }
    },
    properties: {
        collection: mongoDB.collection('properties'),
        // LOAD DES PROJETS DEMANDES (UIDs)
        getAll: async (tableUID:string) => {
            var aggParams = [];
            aggParams.push({$lookup: {
                from: "objects_langs",
                localField: "_id",    // field in the orders collection
                foreignField: "objectid",
                as: "body",
            }});
            aggParams.push({ "$unwind": "$body" });
            aggParams.push({ "$match": 
            {
                _id:new ObjectId(tableUID),
                "body.lang":"fr"
            } 
            });     
            return mongo.properties.collection.aggregate(aggParams).toArray();
        }
    },
    
}