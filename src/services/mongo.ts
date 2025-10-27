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
    getDB:() => {
        return mongoDB;
    },
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
        appendMonoLang:async (uid:string,objectLang:any, collection:Collection) => {
            delete objectLang._id;
            delete objectLang.objectid;
            console.log("appendMonoLang",objectLang);
            return await collection.updateMany({objectid:new ObjectId(uid)},{$set:objectLang});
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
                        console.log("add new default version");
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
                let headerId = header._id;   
                const e=await mongo.generic.append(headerId,
                    header
                ,collection);
                // A METTRE DANS DU GENERIQUE
                // GET OBJECT DANS LA LANGUE // ADD OR APPEND
                // INTEGRAGATE DANS UN APPEND objectLangs
                // SI ON A PAS DE VERSION PAR DEFAUT ON LA CREE SUR LA LANGUE ENVOYEE
                // CHECK IF CURRENT INPUT VERSINO EXIST
                console.log("header",header);
                console.log("body",body);
                const version = await mongo.objectsLangs.versionExist(headerId,lang);
                let finalProps:[] = [];
                let bodyMulti:any = {};
                let bodyMono:any = {};
                // TWO BATCH: MULTILINGUAL/NON MULTILINGUAL
                // LOAD PROPS IF IN TABLE OBJECT
                if (header.proto) {
                    const props = Object.getOwnPropertyNames(body)
                    const realProps = props.filter(item => (item.startsWith("p")));
                    const realPropsIds = realProps.map(item => {return item.substring(1)});
                    
                    console.log("realPropsIds",realPropsIds);
                    let finalProps = await mongo.properties.getAllByIds(realPropsIds,lang)
                    finalProps = finalProps.map(item => {return {
                        _id:item._id,
                        multiling:item.multiling
                    }})
                    console.log("finalProps",finalProps);

                    finalProps.forEach((item) =>
                    {
                        if (item.multiling) {
                            bodyMulti["p"+item._id] = body["p"+item._id];
                        } else {
                            bodyMono["p"+item._id] = body["p"+item._id];
                        }
                    })

                }
                else {
                    bodyMulti = body;
                }
                // TWO BODYs to create : one multilingual/one mono
                console.log("bodyMulti",bodyMulti);
                console.log("bodyMono",bodyMono);

                if (version) {
                    // IF EXIST UPDATE
                    console.log("IF EXIST UPDATE");
                    //UPDATE MULTILINGUAL VALUES IN THE CURRENT LANGUAGE
                    const r = await mongo.generic.append(body._id,body,mongo.objectsLangs.collection);
                }
                else {
                    console.log("CREATE NEW VERSION");
                    // CREATE NEW VERSION
                    delete body.objectid;
                    delete body._id;
                    body.lang = lang;
                    await mongo.generic.add({
                        objectid: new ObjectId(headerId as string),
                        ...body
                    },mongo.objectsLangs.collection);
                }
                //UPDATE MONOLINGUAL VALUES
                console.log("bodyMono",bodyMono);
                if (bodyMono) {
                    await mongo.generic.appendMonoLang(headerId,bodyMono,mongo.objectsLangs.collection);
                }
                return headerId;
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
        }
    },
    properties: {
        collection: mongoDB.collection('properties'),
        /**
         * GET TABLES COLUMS HEADERS PROPERTYS IDs
         * @param projectUID 
         * @param tableUIDs 
         * @param lang 
         * @returns 
         */
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
         * LOAD DES PROPRIETES DEMANDES (UIDs/PROFIL/PROJET)
         *  */ 
        getAllByIds: async (uids:string[], lang:string) => {
            return await mongo.generic.getAll({
                _id:{$in:uids.map((item) => {return new ObjectId(item)})}
            },mongo.properties.collection,lang);
        },
        /**
         * SAVE A PROPERTY
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