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
        getAll: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            //console.log(await mongo.users.collection.find({}).toArray())
            let ret = yield exports.mongo.projects.collection.find({}).toArray();
            ;
            console.log(ret);
            res.send({ result: ret });
        })
    },
    metas: {
        add: (metas) => __awaiter(void 0, void 0, void 0, function* () {
            const metasCol = mongoDB.collection('metas');
            metas.dateCreation = new Date();
            return yield metasCol.insertOne(metas);
        }),
        update: (uid, metas) => __awaiter(void 0, void 0, void 0, function* () {
            const metasCol = mongoDB.collection('metas');
            let updated = yield metasCol.updateOne({ _id: new mongodb_1.ObjectId(uid) }, { $set: metas });
        }),
        load: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            const metasCol = mongoDB.collection('metas');
            let items = yield metasCol
                .find({ ownerUID: req.body.ownerUID })
                .collation({ 'locale': 'en' })
                .sort({ original_fname: 1 })
                .project({ original_fname: 1, path: 1, fname: 1, source_type: 1, category: 1, uid: 1 })
                .toArray();
            res.json({ ret: items });
        }),
        get: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            const metasCol = mongoDB.collection('metas');
            let ret = yield metasCol.findOne({ _id: new mongodb_1.ObjectId(req.body.metaUID) });
            res.json({ ret: ret });
        }),
        getChunksUids: (metaUids) => __awaiter(void 0, void 0, void 0, function* () {
            const metasCol = mongoDB.collection('metas');
            console.log(metaUids);
            let ret = yield metasCol.find({ _id: { $in: metaUids } }).toArray();
            ;
            return ret;
        }),
        getFromfname: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            const metasCol = mongoDB.collection('metas');
            let ret = yield metasCol.findOne({ fname: req.body.fname });
            res.json({ ret: ret });
        }),
        delete: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            const metasCol = mongoDB.collection('metas');
            let ret = yield metasCol.deleteMany({ _id: new mongodb_1.ObjectId(req.body.metaUID) });
            res.json({ ret: ret });
        }),
    },
    categs: {
        load: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            const categsCol = mongoDB.collection('categs');
            let items = yield categsCol.find({ ownerUID: req.body.ownerUID }).toArray();
            res.json({ ret: items });
        }),
        add: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            const categsCol = mongoDB.collection('categs');
            let added = yield categsCol.insertOne(req.body);
            res.json(added);
        }),
    },
};
