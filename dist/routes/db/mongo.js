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
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongo = void 0;
const mongodb_1 = require("mongodb");
const { MongoClient } = require('mongodb');
var mongoOptions = {};
mongoOptions = {
    ssl: false,
    //useNewUrlParser: true
};
//console.log(1,process.env.MONGOHQ_DB);
const mongoClient = new MongoClient(process.env.MONGOHQ_URL);
const mongoDB = mongoClient.db(process.env.MONGOHQ_DB);
exports.mongo = {
    helper: {
        cleanMDB: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            //CLEAD CATEGS AND METAS
            const metasCol = mongoDB.collection('metas');
            yield metasCol.deleteMany({ ownerUID: req.body.ownerUID });
            const categsCol = mongoDB.collection('categs');
            yield categsCol.deleteMany({ ownerUID: req.body.ownerUID });
            res.json({ ret: "ok" });
        }),
    },
    queries: {
        add: (ownerUID, query) => __awaiter(void 0, void 0, void 0, function* () {
            const queriesCol = mongoDB.collection('queries');
            let dta = {
                ownerUID: ownerUID,
                query: query,
                dateCreation: new Date()
            };
            return yield queriesCol.insertOne(dta);
        }),
    },
    metas: {
        add: (metas) => __awaiter(void 0, void 0, void 0, function* () {
            const metasCol = mongoDB.collection('metas');
            metas.dateCreation = new Date();
            return yield metasCol.insertOne(metas);
        }),
        update: (uid, metas) => __awaiter(void 0, void 0, void 0, function* () {
            const metasCol = mongoDB.collection('metas');
            let updated = yield metasCol.updateOne({ _id: uid }, { $set: metas });
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
    users: {
        add: (datas) => __awaiter(void 0, void 0, void 0, function* () {
            const usersCol = mongoDB.collection('users');
            return yield usersCol.insertOne(datas);
        }),
        getUser: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            res.json({ ret: yield exports.mongo.users.getUserNoRequest(req.body.ownerUID) });
        }),
        //
        getUserNoRequest: (ownerUID) => __awaiter(void 0, void 0, void 0, function* () {
            const usersCol = mongoDB.collection('users');
            return yield usersCol.findOne({ ownerUID: ownerUID });
        }),
        updateUser: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            const usersCol = mongoDB.collection('users');
            delete req.body._id;
            yield usersCol.updateOne({ ownerUID: req.body.ownerUID }, { $set: req.body }, { upsert: true });
            res.json({ ret: "ok" });
        }),
        getAll: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            var aggParams = [];
            const queriesCol = mongoDB.collection('users');
            //aggParams.push({$match: filtersBody});
            aggParams.push({ $lookup: {
                    from: "metas",
                    localField: "ownerUID", // field in the orders collection
                    foreignField: "ownerUID", // field in the items collection
                    as: "header",
                } });
            aggParams.push({ "$unwind": "$header" });
            //aggParams.push({ "$match": filtersHeader });
            aggParams.push({ $group: { _id: "$ownerUID", count: { $sum: 1 } } });
            //aggParams.push({$group:{ _id : { $dateToString: { format: "%Y-%m-%d", date: "$dateCreation" } },count: { $sum: 1 }}});
            //aggParams.push({ $group: { objectid: null, myCount: { $sum: 1 } } });
            //aggParams.push({ $project: { objectid: 0 } });
            //console.log(JSON.stringify filtersHeader);
            let result = yield queriesCol.aggregate(aggParams).toArray();
            console.log("users", result);
            res.json({ ok: "ok" });
        })
    },
    dashboard: {
        createOneWeekArray: (from, to, vals, field) => {
            let ret = [];
            for (let relidates = new Date(from); relidates <= to; relidates.setDate(relidates.getDate() + 1)) {
                let found = false;
                for (let relivals = 0; relivals < vals.length; relivals++) {
                    let dtFormated = relidates.toISOString().slice(0, 10);
                    //console.log(dtFormated,relidates.toISOString().slice(0, 10));
                    //console.log(dtFormated,vals[relivals]._id);
                    if (dtFormated == vals[relivals]._id) {
                        ret.push(vals[relivals][field]);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    ret.push(0);
                }
            }
            return ret;
        },
        get: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            //LOAD QUERIES NUMBER BY DAY
            const queriesCol = mongoDB.collection('queries');
            const metasCol = mongoDB.collection('metas');
            let aggParams = [];
            let dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - 7);
            dateFrom.setHours(0);
            dateFrom.setMinutes(0);
            dateFrom.setSeconds(1);
            let dateTo = new Date();
            dateTo.setHours(23);
            dateTo.setMinutes(59);
            dateTo.setSeconds(59);
            //
            aggParams.push({
                "$match": {
                    "dateCreation": {
                        $gte: dateFrom,
                        $lt: dateTo,
                    },
                    ownerUID: req.body.ownerUID
                }
            });
            //
            aggParams.push({ $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateCreation" } }, count: { $sum: 1 } } });
            //
            aggParams.push({ $sort: { _id: 1 } });
            //
            let promises = [];
            //0 queries total count
            promises.push(new Promise((resolve, reject) => { resolve(queriesCol.count({ ownerUID: req.body.ownerUID })); }));
            //1 queries stats on 1 week
            promises.push(new Promise((resolve, reject) => {
                resolve(queriesCol.aggregate(aggParams).toArray());
            }));
            //2 metass total
            promises.push(new Promise((resolve, reject) => { resolve(metasCol.count({ ownerUID: req.body.ownerUID })); }));
            //3 metas stats on 1 week
            promises.push(new Promise((resolve, reject) => {
                resolve(metasCol.aggregate(aggParams).toArray());
            }));
            //4 TOTAL Data size on disk
            promises.push(new Promise((resolve, reject) => {
                resolve(metasCol.aggregate([
                    {
                        $match: {
                            ownerUID: req.body.ownerUID
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: "$size" }
                        }
                    }
                ]).toArray());
            }));
            //5 TOTAL Data size on disk
            promises.push(new Promise((resolve, reject) => {
                resolve(metasCol.aggregate([
                    {
                        $match: {
                            "dateCreation": {
                                $gte: dateFrom,
                                $lt: dateTo,
                            },
                            ownerUID: req.body.ownerUID
                        }
                    },
                    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateCreation" } }, total: { $sum: "$size" } } },
                    { $sort: { _id: 1 } }
                ]).toArray());
            }));
            //6 12 month files types stats
            promises.push(new Promise((resolve, reject) => {
                resolve(metasCol.aggregate([
                    {
                        $match: {
                            ownerUID: req.body.ownerUID
                        }
                    },
                    {
                        $group: {
                            _id: "$source_type",
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]).toArray());
            }));
            //
            const results = yield Promise.all(promises);
            let fullDiskUsage = results[4];
            //
            res.json({
                sumQueries: results[0],
                graphQueries: exports.mongo.dashboard.createOneWeekArray(dateFrom, dateTo, results[1], "count"),
                sumMetas: results[2],
                graphmetas: exports.mongo.dashboard.createOneWeekArray(dateFrom, dateTo, results[3], "count"),
                fullDiskUsage: (fullDiskUsage[0] && fullDiskUsage[0].total ? fullDiskUsage[0].total : 0),
                graphDiskUsage: exports.mongo.dashboard.createOneWeekArray(dateFrom, dateTo, results[5], "total"),
                graphFileType: results[6]
            });
            //ADD RESSOURCES BY DAY
            //INDEXED SPLITTED DOCS
        }),
    },
    prompts: {
        updatePrompt: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            const usersCol = mongoDB.collection('users');
            yield usersCol.updateOne({ ownerUID: req.body.ownerUID }, { $pull: { prompts: { uid: req.body.prompt.uid } } });
            yield usersCol.updateOne({ ownerUID: req.body.ownerUID }, { $addToSet: { prompts: req.body.prompt } }, { upsert: true });
            res.json({ ret: "ok" });
        }),
        removePrompt: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            const usersCol = mongoDB.collection('users');
            yield usersCol.updateOne({ ownerUID: req.body.ownerUID }, { $pull: { prompts: { uid: req.body.uid } } });
            res.json({ ret: "ok" });
        }),
    },
    addContact: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        //CLEAD CATEGS AND METAS
        const contactsCol = mongoDB.collection('contacts');
        yield contactsCol.insertOne(req.body);
        res.json({ ret: "ok" });
    }),
    addFeedback: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        //CLEAD CATEGS AND METAS
        const feedBCol = mongoDB.collection('feedbacks');
        yield feedBCol.insertOne(req.body);
        res.json({ ret: "ok" });
    }),
    //A MUTUALISER AVEC LOAD  CATEGS
    getCategs: (ownerUID) => __awaiter(void 0, void 0, void 0, function* () {
        const categsCol = mongoDB.collection('categs');
        return yield categsCol.find({ ownerUID: ownerUID }).toArray();
    }),
    //
    getUserParams: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const userParamsCol = mongoDB.collection('userParams');
        let ret = yield userParamsCol.findOne({ ownerUID: req.body.ownerUID });
        res.json({ ret: ret });
    }),
    //
    getUserParamsNoRequest: (ownerUID) => __awaiter(void 0, void 0, void 0, function* () {
        const userParamsCol = mongoDB.collection('userParams');
        return yield userParamsCol.findOne({ ownerUID: ownerUID });
    }),
    updateUserParams: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const usersCol = mongoDB.collection('users');
        yield usersCol.updateOne({ ownerUID: req.body.ownerUID }, { $set: { params: req.body } }, { upsert: true });
        res.json({ ret: "ok" });
    }),
};
