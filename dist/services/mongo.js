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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongo = void 0;
const mongodb_1 = require("mongodb");
const mongodb_2 = require("mongodb");
const env_1 = require("../config/env");
// MONGODB CONNECTION
var mongoOptions = {};
mongoOptions = {
    ssl: false,
    //useNewUrlParser: true
};
const mongoClient = new mongodb_2.MongoClient((_a = env_1.env.MONGOHQ_URL) !== null && _a !== void 0 ? _a : "");
// DATABASE DEFINITION
const mongoDB = mongoClient.db(env_1.env.MONGOHQ_DB);
//
exports.mongo = {
    helper: {},
    users: {
        collection: mongoDB.collection('users'),
        getOne: (query) => __awaiter(void 0, void 0, void 0, function* () {
            return yield exports.mongo.users.collection.findOne(query);
        })
    },
    projects: {
        collection: mongoDB.collection('projects'),
        // LOAD DES PROJETS DEMANDES (UIDs)
        getAll: (ids) => __awaiter(void 0, void 0, void 0, function* () {
            //On TRANSFORME LES id en string en ObjectID
            const networksIds = ids.map((item) => new mongodb_1.ObjectId(item));
            var aggParams = [];
            aggParams.push({ $lookup: {
                    from: "objects_langs",
                    localField: "_id", // field in the orders collection
                    foreignField: "objectid",
                    as: "body",
                } });
            aggParams.push({ "$unwind": "$body" });
            aggParams.push({ "$match": {
                    _id: { $in: networksIds },
                    "body.lang": "fr"
                }
            });
            return exports.mongo.projects.collection.aggregate(aggParams).toArray();
        })
    },
    tables: {
        collection: mongoDB.collection('prototypes'),
        // LOAD DES PROJETS DEMANDES (UIDs)
        getAll: (id) => __awaiter(void 0, void 0, void 0, function* () {
            var aggParams = [];
            aggParams.push({ $lookup: {
                    from: "objects_langs",
                    localField: "_id", // field in the orders collection
                    foreignField: "objectid",
                    as: "body",
                } });
            aggParams.push({ "$unwind": "$body" });
            aggParams.push({ "$match": {
                    projects: { $in: [new mongodb_1.ObjectId(id)] },
                    "body.lang": "fr"
                }
            });
            return exports.mongo.tables.collection.aggregate(aggParams).toArray();
        })
    },
    properties: {
        collection: mongoDB.collection('properties'),
        // LOAD DES PROJETS DEMANDES (UIDs)
        getAll: (projectUID, tableUIDs) => __awaiter(void 0, void 0, void 0, function* () {
            var aggParams = [];
            aggParams.push({ $lookup: {
                    from: "objects_langs",
                    localField: "_id", // field in the orders collection
                    foreignField: "objectid",
                    as: "body",
                } });
            aggParams.push({ "$unwind": "$body" });
            const projProfs = tableUIDs.map((item) => {
                return projectUID + item;
            });
            aggParams.push({ "$match": {
                    _projprof: { $in: projProfs },
                    "body.lang": "fr"
                }
            });
            return exports.mongo.properties.collection.aggregate(aggParams).toArray();
        })
    },
    objects: {
        collection: mongoDB.collection('objects'),
        // LOAD DES PROJETS DEMANDES (UIDs)
        getAll: (projectUID, tableUIDs) => __awaiter(void 0, void 0, void 0, function* () {
            //aggParamsTest.push({ "$group": { _id : "$objectid" } });
            //aggParams.push({ $count: "counter" });
            let aggParamsBase = [];
            aggParamsBase.push({ $lookup: {
                    from: "objects_langs",
                    localField: "_id", // field in the orders collection
                    foreignField: "objectid",
                    as: "body",
                } });
            aggParamsBase.push({ "$unwind": "$body" });
            aggParamsBase.push({ "$match": {
                    projects: { $in: [new mongodb_1.ObjectId(projectUID)] },
                    proto: { $in: tableUIDs.map(item => { return new mongodb_1.ObjectId(item); }) },
                    "body.lang": "fr"
                }
            });
            //aggParams.push({ "$group": { _id : "$proto", myCount: { $sum: 1 } } });
            let aggParamsQuery = [...aggParamsBase, { "$limit": 25 }];
            let aggParamsCount = [...aggParamsBase, { "$count": "counter" }];
            console.log(yield exports.mongo.objects.collection.aggregate(aggParamsCount).toArray());
            //console.log("aggParamsQuery", aggParamsQuery);
            //console.log("aggParamsCount", aggParamsCount);
            //console.log(await mongo.objects.collection.aggregate(aggParamsCount).toArray());
            return yield exports.mongo.objects.collection.aggregate(aggParamsQuery).toArray();
        })
    },
};
