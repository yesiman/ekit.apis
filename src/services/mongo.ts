import { ObjectId } from "mongodb";
import { MongoClient } from 'mongodb';
import { env } from "../config/env";
// MONGODB CONNECTION
var mongoOptions = {};
mongoOptions = {
    ssl: false,
    //useNewUrlParser: true
};
const mongoClient = new MongoClient(env.MONGOHQ_URL ?? "");
// DATABASE DEFINITION
const mongoDB = mongoClient.db(env.MONGOHQ_DB);
//
export const mongo = {
    helper:{
    },
    users: {
        collection: mongoDB.collection('users'),
        getOne:async (query:any) => {
            return await mongo.users.collection.findOne(query);
        },
        add:async (user:any) => {
            return await mongo.users.collection.insertOne(user);
        },
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
        getAll: async (id:string) => {
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
                projects:{$in:[new ObjectId(id)]},
                "body.lang":"fr"
            } 
            });     
            
            return mongo.tables.collection.aggregate(aggParams).toArray();
        }
    },
    properties: {
        collection: mongoDB.collection('properties'),
        // LOAD DES PROJETS DEMANDES (UIDs)
        getAll: async (projectUID:string,tableUIDs:string[]) => {
            var aggParams = [];
            aggParams.push({$lookup: {
                from: "objects_langs",
                localField: "_id",    // field in the orders collection
                foreignField: "objectid",
                as: "body",
            }});
            aggParams.push({ "$unwind": "$body" });
            const projProfs = tableUIDs.map((item:string) => {
                return projectUID + item;
            });
            aggParams.push({ "$match": 
            {
                _projprof:{$in:projProfs},
                "body.lang":"fr"
            } 
            });     
            return mongo.properties.collection.aggregate(aggParams).toArray();
        }
    },
    objects: {
        collection: mongoDB.collection('objects'),
        // LOAD DES PROJETS DEMANDES (UIDs)
        getAll: async (projectUID:string,tableUIDs:string[]) => {

            //aggParamsTest.push({ "$group": { _id : "$objectid" } });
            //aggParams.push({ $count: "counter" });


            let aggParamsBase = [];
            aggParamsBase.push({$lookup: {
                from: "objects_langs",
                localField: "_id",    // field in the orders collection
                foreignField: "objectid",
                as: "body",
            }});
            aggParamsBase.push({ "$unwind": "$body" });
            aggParamsBase.push({ "$match": 
            {
                projects:{$in:[new ObjectId(projectUID)]},
                proto:{$in:tableUIDs.map(item => {return new ObjectId(item)})},
                "body.lang":"fr"
            } 
            });
            //aggParams.push({ "$group": { _id : "$proto", myCount: { $sum: 1 } } });

            let aggParamsQuery=[...aggParamsBase,{"$limit":25}];

            

            let aggParamsCount=[...aggParamsBase,{ "$count": "counter" }];

            
            console.log(await mongo.objects.collection.aggregate(aggParamsCount).toArray());

            //console.log("aggParamsQuery", aggParamsQuery);
            //console.log("aggParamsCount", aggParamsCount);


            //console.log(await mongo.objects.collection.aggregate(aggParamsCount).toArray());
            return await mongo.objects.collection.aggregate(aggParamsQuery).toArray();
        }
    },
    
}