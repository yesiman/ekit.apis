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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongo = void 0;
const mongodb_1 = require("mongodb");
const mongodb_2 = require("mongodb");
// MONGODB CONNECTION
var mongoOptions = {};
mongoOptions = {
    ssl: false,
    //useNewUrlParser: true
};
const mongoClient = new mongodb_2.MongoClient((_b = (_a = process === null || process === void 0 ? void 0 : process.env) === null || _a === void 0 ? void 0 : _a.MONGOHQ_URL) !== null && _b !== void 0 ? _b : "");
// DATABASE DEFINITION
const mongoDB = mongoClient.db(process.env.MONGOHQ_DB);
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
        getAll: (projectUID, tableUID) => __awaiter(void 0, void 0, void 0, function* () {
            var aggParams = [];
            aggParams.push({ $lookup: {
                    from: "objects_langs",
                    localField: "_id", // field in the orders collection
                    foreignField: "objectid",
                    as: "body",
                } });
            aggParams.push({ "$unwind": "$body" });
            aggParams.push({ "$match": {
                    _projprof: { $in: [projectUID + tableUID] },
                    "body.lang": "fr"
                }
            });
            return exports.mongo.properties.collection.aggregate(aggParams).toArray();
        })
    },
    objects: {
        collection: mongoDB.collection('objects'),
        // LOAD DES PROJETS DEMANDES (UIDs)
        getAll: (projectUID, tableUID) => __awaiter(void 0, void 0, void 0, function* () {
            var aggParams = [];
            aggParams.push({ $lookup: {
                    from: "objects_langs",
                    localField: "_id", // field in the orders collection
                    foreignField: "objectid",
                    as: "body",
                } });
            aggParams.push({ "$unwind": "$body" });
            aggParams.push({ "$match": {
                    projects: { $in: [new mongodb_1.ObjectId(projectUID)] },
                    proto: { $in: [new mongodb_1.ObjectId(tableUID)] },
                    "body.lang": "fr"
                }
            });
            return exports.mongo.objects.collection.aggregate(aggParams).toArray();
        })
    },
};
