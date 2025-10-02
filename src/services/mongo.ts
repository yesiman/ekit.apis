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
        add:async (objectLang:any, collection:Collection) => {
            return await collection.insertOne(objectLang);
        },
        append:async (uid:string,objectLang:any, collection:Collection) => {
            delete objectLang._id;
            return await collection.updateOne({_id:new ObjectId(uid)},{$set:objectLang});
        },
        get:async (uid:string, collection:Collection, lang:string) => {
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
                    "body.lang":lang
                } 
            });     
            const ar = await collection.aggregate(aggParams).toArray();
            return ar[0];
        },
    },
    objectsLangs:{
        collection: mongoDB.collection('objects_langs'),
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
        save: async (userId:string, project:any, lang:string) => { 
            //LOADER LE PROJET
            
            //console.log("project saved",project);
            //SINON
            let promises;
            let projectUID:string = project._id;
            //SIL EXISTE PAS ALORS CREATION
            if (project._id == "-1") {
                const q = await mongo.generic.add({
                    langs:project.langs,
                    dateModif:new Date(),
                    dateCreation:new Date(),
                    owner: new ObjectId(userId),
                },mongo.projects.collection);
                //promises = Array.from(project.langs,(lang) => {
                    await mongo.generic.add({
                        lang:lang,
                        objectid: new ObjectId(q.insertedId),
                        plib: project.body.plib
                    },mongo.objectsLangs.collection)
                //});
                //await Promise.all(promises).then((data) => {
                //    console.log("data",data);
                //})
            } else {
                await mongo.generic.append(project._id,{
                    langs:project.langs,
                    dateModif:new Date(),
                },mongo.projects.collection);
                const r = await mongo.generic.append(project.body._id,project.body,mongo.objectsLangs.collection);
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
        getAll: async (userId:string, lang:string) => {
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
                "body.lang":lang
            } 
            });     
            return await mongo.projects.collection.aggregate(aggParams).toArray();
        }
    },
    tables: {
        collection: mongoDB.collection('prototypes'),
        // LOAD DES PROJETS DEMANDES (UIDs)
        getAll: async (id:string, lang:string) => {
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
                projects:{$in:[new ObjectId(id),id]},
                "body.lang":lang
            } 
            });     
            
            return mongo.tables.collection.aggregate(aggParams).toArray();
        },
        save: async (userId:string, table:any, lang:string) => { 
            if (table._id == "-1") {
                const q = await mongo.generic.add({
                    dateModif:new Date(),
                    dateCreation:new Date(),
                    projects:table.projects,
                    public:true,
                    categ: false,
                    hierar: false,
                    owner: new ObjectId(userId),
                },mongo.tables.collection);
                //
                await mongo.generic.add({
                        lang:lang,
                        objectid: new ObjectId(q.insertedId),
                        ...table.body
                    },mongo.objectsLangs.collection);

            } else {
                await mongo.generic.append(table._id,{
                    dateModif:new Date(),
                },mongo.tables.collection);
                const r = await mongo.generic.append(table.body._id,table.body,mongo.objectsLangs.collection);
            }
            return true;
        }
    },
    properties: {
        collection: mongoDB.collection('properties'),
        /**
         * LOAD DES PROPRIETES DEMANDES (UIDs/PROFIL/PROJET)
         *  */ 
        getAll: async (projectUID:string,tableUIDs:string[], lang:string) => {
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
                "body.lang":lang
            } 
            });     
            return mongo.properties.collection.aggregate(aggParams).toArray();
        },
        /**
         * 
         * @param userId 
         * @param field 
         * @param lang 
         * @returns 
         */
        save: async (userId:string, field:any, lang:string) => { 
            if (field._id == "-1") {
                const q = await mongo.generic.add({
                    dateModif:new Date(),
                    dateCreation:new Date(),
                    _projprof:field._projprof,
                    owner: new ObjectId(userId),
                },mongo.properties.collection);
                //
                await mongo.generic.add({
                        lang:lang,
                        objectid: new ObjectId(q.insertedId),
                        ...field.body
                    },mongo.objectsLangs.collection);
            } else {
                await mongo.generic.append(field._id,{
                    dateModif:new Date(),
                },mongo.properties.collection);
                const r = await mongo.generic.append(field.body._id,field.body,mongo.objectsLangs.collection);
            }
            return true;
        }
    },
    objects: {
        collection: mongoDB.collection('objects'),
        // LOAD DES PROJETS DEMANDES (UIDs)
        getAll: async (projectUID:string,tableUIDs:string[], lang:string) => {

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
                "body.lang":lang
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