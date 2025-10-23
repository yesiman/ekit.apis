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
        delete:async (uid:string, collection:Collection) => {
            const  a  = await mongo.objectsLangs.collection.deleteMany({objectid:new ObjectId(uid)})
            const  b  = await collection.deleteOne({_id:new ObjectId(uid)});
        },
        append:async (uid:string,objectLang:any, collection:Collection) => {
            delete objectLang._id;
            delete objectLang.objectid;
            return await collection.updateOne({_id:new ObjectId(uid)},{$set:objectLang});
        },
        get:async (uid:string, collection:Collection, lang:string) => {
            const recs = await mongo.generic.getAll({
                _id:new ObjectId(uid)
            },collection,lang);
            return recs[0];
        },
        getAll: async (filters:any,collection:Collection, lang:string) => {

            let aggParamsBase = [];

            aggParamsBase.push({ "$match": filters});

            aggParamsBase.push({$lookup: {
                from: "objects_langs",
                let: {
                    id: "$_id",
                    reqLang: lang,
                    defLang: "fr"
                },
                localField: "_id",    // field in the orders collection
                foreignField: "objectid",
                pipeline: [
                    {
                    $match: {
                        $expr: {
                        $and: [
                            // ⚠️ adapte selon le type de objects_langs.objectid
                            // Si c'est un ObjectId :
                            { $eq: ["$objectid", "$$id"] },
                            // Si c'est une string :
                            // { $eq: ["$objectid", { $toString: "$$id" }] },

                            { $in: ["$lang", ["$$reqLang", "$$defLang"]] }
                        ]
                        }
                    }
                    },
                    // Prioriser la langue demandée si dispo, sinon la langue par défaut
                    {
                    $addFields: {
                        _pref: {
                        $cond: [{ $eq: ["$lang", "$$reqLang"] }, 0, 1]
                        }
                    }
                    },
                    { $sort: { _pref: 1 } },
                    { $limit: 1 },
                    { $project: { _pref: 0 } }
                ],
                as: "body",
            }});
            aggParamsBase.push({ "$unwind": "$body" });
            let aggParamsQuery=[...aggParamsBase,{"$limit":25}];

            //let aggParamsCount=[...aggParamsBase,{ "$count": "counter" }];

            //console.log("Line counter total",await mongo.objects.collection.aggregate(aggParamsCount).toArray());

            return await collection.aggregate(aggParamsQuery).toArray();
            
        },
        save:async (header:any,body:any,lang:string,collection:Collection) => {
            
            if (header._id == "-1") {
                delete header._id;
                const q = await mongo.generic.add(header,collection);
                // IF INPUT LANGUAGE != DEFAULT LANGUAGE
                if ("fr" != lang) {
                    // CHECK IF DEFAULT VERSION EXIST
                    //const version = await mongo.objectsLangs.versionExist(object._id,"fr");
                    //if (!version) {
                        // DEFAULT LANGUAGE VERSION CREATION
                        await mongo.generic.add({
                                lang:"fr",
                                objectid: new ObjectId(q.insertedId),
                                ...body
                            },mongo.objectsLangs.collection);    
                    //}
                }
                //
                await mongo.generic.add({
                        lang:lang,
                        objectid: new ObjectId(q.insertedId),
                        ...body
                    },mongo.objectsLangs.collection);

                return q.insertedId;

            } else {      
                // HEADER UPDATE          
                const e=await mongo.generic.append(header._id,
                    header
                ,collection);
                // A METTRE DANS DU GENERIQUE
                // GET OBJECT DANS LA LANGUE // ADD OR APPEND
                // INTEGRAGATE DANS UN APPEND objectLangs
                // SI ON A PAS DE VERSION PAR DEFAUT ON LA CREE SUR LA LANGUE ENVOYEE

                // CHECK IF CURRENT INPUT VERSINO EXIST
                const version = await mongo.objectsLangs.versionExist(header._id,lang);
                if (version) {
                    // IF EXIST UPDATE
                    const r = await mongo.generic.append(body._id,body,mongo.objectsLangs.collection);
                }
                else {
                    // CREATE NEW VERSION
                    delete body.objectid;
                    delete body._id;
                    body.lang = lang;
                    await mongo.generic.add({
                        objectid: new ObjectId(header._id as string),
                        ...body
                    },mongo.objectsLangs.collection);
                }
                return header._id;
            }
        }

    },
    objectsLangs:{
        collection: mongoDB.collection('objects_langs'),
        versionExist:async (headerUID:string,lang:string) => {
            const version = await mongo.objectsLangs.collection.findOne({
                objectid:new ObjectId(headerUID),
                lang:lang,
            });
            return (version!=null);
        }
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
            
            return await mongo.generic.save({
                    _id:project._id,
                    langs:project.langs,
                    dateModif:new Date(),
                    defaultLang:project.defaultLang,
                    dateCreation:new Date(),
                    owner: new ObjectId(userId),
                },project.body,lang,mongo.projects.collection)


            //console.log("project saved",project);
            //SINON
            console.log("project in",project);
            //SIL EXISTE PAS ALORS CREATION
            if (project._id == "-1") {
                const q = await mongo.generic.add({
                    langs:project.langs,
                    dateModif:new Date(),
                    defaultLang:project.defaultLang,
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
                    defaultLang:project.defaultLang,
                    dateModif:new Date(),
                },mongo.projects.collection);
                const r = await mongo.generic.append(project.body._id,project.body,mongo.objectsLangs.collection);
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
            return await mongo.generic.getAll({
                $or:[
                    {owner:new ObjectId(userId)},
                    {collaborators:{$in:[userId]}}
                ]
            },mongo.projects.collection,lang);

        },
        delete() {

        }
    },
    tables: {
        collection: mongoDB.collection('prototypes'),
        // LOAD DES PROJETS DEMANDES (UIDs)
        getAll: async (id:string, lang:string) => {
            
            return await mongo.generic.getAll({
                projects:{$in:[new ObjectId(id),id]},
            },mongo.tables.collection,lang);
        },
        save: async (userId:string, table:any, lang:string) => { 

            return await mongo.generic.save({
                    _id:table._id,
                    dateModif:new Date(),
                    dateCreation:new Date(),
                    projects:table.projects,
                    public:true,
                    categ: false,
                    hierar: false,
                    owner: new ObjectId(userId),
                },table.body,lang,mongo.tables.collection)

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
                //console.log(table._id,table.body);
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
        getTitleColumnsIds: async (projectUID:string,tableUIDs:string[], lang:string) => {
            // get embed field to query
            const keys = tableUIDs.map((item:string) => {
                return "specifics."+projectUID + item+".isTitleCol";
            });
            // generate or clause
            let orClauses:any =[];
            keys.forEach(element => {
                orClauses.push({ [element]:true })
            });
            const props:any[] = await mongo.properties.collection.find({
                $or:orClauses
            }).toArray();
            let finalProps:any = {};
            props.forEach((itemProp) => {
                itemProp._projprof.forEach((itemProjProf:string) => {
                    tableUIDs.forEach(itemTable => {
                        if (itemProjProf==projectUID+itemTable) {
                            finalProps[itemTable] = itemProp._id;
                        }
                    });
                });
            })
            return finalProps;
        },
        /**
         * LOAD DES PROPRIETES DEMANDES (UIDs/PROFIL/PROJET)
         *  */ 
        getAll: async (projectUID:string,tableUIDs:string[], lang:string) => {
            const projProfs = tableUIDs.map((item:string) => {
                return projectUID + item;
            });
            return await mongo.generic.getAll({
                _projprof:{$in:projProfs}
            },mongo.properties.collection,lang);
        },
        /**
         * 
         * @param userId 
         * @param field 
         * @param lang 
         * @returns 
         */
        save: async (userId:string, field:any, lang:string) => { 
            
                return await mongo.generic.save({
                    _id:field._id,
                    dateModif:new Date(),
                    dateCreation:new Date(),
                    _projprof:field._projprof,
                    specifics:field.specifics,
                    multiling:field.multiling,
                    owner: new ObjectId(userId),
                },field.body,lang,mongo.properties.collection)

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
                //
                const r = await mongo.generic.append(field.body._id,field.body,mongo.objectsLangs.collection);
                field.dateModif = new Date();
                delete field.body;
                await mongo.generic.append(field._id,field,mongo.properties.collection);
                
            }
            return true;
        }
    },
    objects: {
        collection: mongoDB.collection('objects'),
        delete: async (objectId:string) => { 
            //remove from proto
            await mongo.generic.delete(objectId,mongo.objects.collection);
        },
        save: async (userId:string, object:any, lang:string) => { 

            return await mongo.generic.save({
                    _id:object._id,
                    dateModif:new Date(),
                    dateCreation:new Date(),
                    projects:object.projects.map((item:string) => { return new ObjectId(item) }),
                    proto:object.proto.map((item:string) => { return new ObjectId(item) }),
                    owner: new ObjectId(userId),
                },object.body,lang,mongo.objects.collection)

            if (object._id == "-1") {
                const q = await mongo.generic.add({
                    dateModif:new Date(),
                    dateCreation:new Date(),
                    projects:object.projects.map((item:string) => { return new ObjectId(item) }),
                    proto:object.proto.map((item:string) => { return new ObjectId(item) }),
                    owner: new ObjectId(userId),
                },mongo.objects.collection);
                // IF INPUT LANGUAGE != DEFAULT LANGUAGE
                if ("fr" != lang) {
                    // CHECK IF DEFAULT VERSION EXIST
                    //const version = await mongo.objectsLangs.versionExist(object._id,"fr");
                    //if (!version) {
                        // DEFAULT LANGUAGE VERSION CREATION
                        await mongo.generic.add({
                                lang:"fr",
                                objectid: new ObjectId(q.insertedId),
                                ...object.body
                            },mongo.objectsLangs.collection);    
                    //}
                }
                //
                await mongo.generic.add({
                        lang:lang,
                        objectid: new ObjectId(q.insertedId),
                        ...object.body
                    },mongo.objectsLangs.collection);

                return q.insertedId;

            } else {      
                // HEADER UPDATE          
                await mongo.generic.append(object._id,{
                    dateModif:new Date(),
                },mongo.objects.collection);
                

                // A METTRE DANS DU GENERIQUE
                // GET OBJECT DANS LA LANGUE // ADD OR APPEND
                // INTEGRAGATE DANS UN APPEND objectLangs
                // SI ON A PAS DE VERSION PAR DEFAUT ON LA CREE SUR LA LANGUE ENVOYEE

                // CHECK IF CURRENT INPUT VERSINO EXIST
                const version = await mongo.objectsLangs.versionExist(object._id,lang);
                if (version) {
                    // IF EXIST UPDATE
                    const r = await mongo.generic.append(object.body._id,object.body,mongo.objectsLangs.collection);
                }
                else {
                    // CREATE NEW VERSION
                    delete object.body.objectid;
                    delete object.body._id;
                    object.body.lang = lang;
                    await mongo.generic.add({
                        objectid: new ObjectId(object._id as string),
                        ...object.body
                    },mongo.objectsLangs.collection);
                }
                
                return object._id;
            }

            
        },
        // LOAD DES PROJETS DEMANDES (UIDs)
        getAll: async (projectUID:string,tableUIDs:string[], lang:string) => {            
            return await mongo.generic.getAll({
                projects:{$in:[new ObjectId(projectUID)]},
                proto:{$in:tableUIDs.map(item => {return new ObjectId(item)})}
            },mongo.objects.collection,lang);
        }
    },
}