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
exports.ekit = void 0;
const mongo_1 = require("../modules/db/mongo");
// CUSTOM AUTH MANAGEMENT
exports.ekit = {
    projects: {
        // LOAD PROJETS
        getAll: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            var aggParams = [];
            aggParams.push({ $lookup: {
                    from: "objects_langs",
                    localField: "_id", // field in the orders collection
                    foreignField: "objectid",
                    as: "body",
                } });
            aggParams.push({ "$unwind": "$body" });
            aggParams.push({ "$match": { "body.lang": "fr" } });
            const projects = yield mongo_1.mongo.projects.collection.aggregate(aggParams).toArray();
            const mapedProjects = projects.map(item => {
                var _a;
                return ({
                    id: item._id.toString(),
                    name: (_a = item.body) === null || _a === void 0 ? void 0 : _a.plib,
                    dateCreation: item.dateCreation
                });
            });
            res.json({ result: mapedProjects });
        })
    },
};
