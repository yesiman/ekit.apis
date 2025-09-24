import { Collection, ObjectId } from "mongodb";
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
    generic: {
        get:async (uid:string, collection:Collection) => {
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
                    _id:new ObjectId(uid),
                    "body.lang":"fr"
                } 
            });     
            const ar = await collection.aggregate(aggParams).toArray();
            return ar[0];
        },
    },
    objectsLangs:{
        collection: mongoDB.collection('objects_langs'),
        add:async (objectLang:any) => {
            return await mongo.objectsLangs.collection.insertOne(objectLang);
        },
        append:async (uid:string,objectLang:any) => {
            console.log(uid,objectLang)
            delete objectLang._id;
            delete objectLang.objectid;
            return await mongo.objectsLangs.collection.updateOne({_id:new ObjectId(uid)},{$set:objectLang});
        },
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
        add:async (project:any) => {
            return await mongo.projects.collection.insertOne(project);
        },
        get:async (uid:string) => {
            return await mongo.generic.get(uid,mongo.projects.collection);
        },
        append:async (uid:string,project:any) => {
            
            delete project._id
            return await mongo.projects.collection.updateOne({_id:new ObjectId(uid)},{$set:project});
        },
        save: async (userId:string, project:any) => { 
            //LOADER LE PROJET
            
            //console.log("project saved",project);
            //SINON
            let promises;
            let projectUID:string = project._id;
            //SIL EXISTE PAS ALORS CREATION
            if (project._id == "-1") {
                const q = await mongo.projects.add({
                    langs:project.langs,
                    dateModif:new Date(),
                    dateCreation:new Date(),
                    owner: new ObjectId(userId),
                });
                promises = Array.from(project.langs,(lang) => {
                    return mongo.objectsLangs.add({
                        lang:lang,
                        objectid: new ObjectId(q.insertedId),
                        plib: project.body.plib
                    })
                });
                await Promise.all(promises).then((data) => {
                    console.log("data",data);
                })
            } else {
                await mongo.projects.append(project._id,{
                    langs:project.langs,
                    dateModif:new Date(),
                });
                const r = await mongo.objectsLangs.append(project.body._id,project.body);
                console.log("r",r);
            }
        

            
            //user = {
            //    _id:result.insertedId
            //};
            //console.log("project saved",promises);
            //OWNER

            /*
            langs: [ 'fr', 'en', 'pt' ],
    [1]     versions: [ 'fr' ],
    [1]     dateModif: 2022-10-26T11:33:01.286Z,
    [1]     dateCreation: 2022-10-26T11:33:01.286Z,
    [1]     owner: new ObjectId('590edcd2cd592011002470b4'),
    [1]     collaborators: [ [Object] ],
    [1]     body: {
    [1]       _id: new ObjectId('63591aed0ed2eff3b6867db2'),
    [1]       lang: 'fr',
    [1]       objectid: new ObjectId('63591aedb12f9a4e8bd336aa'),
    [1]       plib: '3AO'
    [1]     }*/
            return true;
        },
        // LOAD DES PROJETS DEMANDES (UIDs)
        getAll: async (userId:string) => {
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
                $or:[
                    {owner:new ObjectId(userId)},
                    {collaborators:{$in:[userId]}}
                ],
                "body.lang":"fr"
            } 
            });     
            return await mongo.projects.collection.aggregate(aggParams).toArray();
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
        add:async (object:any) => {
            return await mongo.objects.collection.insertOne(object);
        },
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