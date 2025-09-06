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
const mongo_1 = require("../services/mongo");
// CUSTOM AUTH MANAGEMENT
exports.ekit = {
    datas: {
        getAll: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            console.log("req.body", req.body);
            // LOAD PROJETS DE L'UTILISATEUR
            if (req.body.projectUID && req.body.tableUID && req.body.coordinates) {
                //LOAD PROPRIETES
                if (req.body.coordinates === "X") {
                    //const categories = await mongo.properties.getAll(req.body.projectUID, req.body.tableUID);
                    const properties = yield mongo_1.mongo.properties.getAll(req.body.projectUID, [req.body.tableUID]);
                    // GET ALL ENUMS ids AND CATEGORIES TABLES IDs TO LOAD THEM
                    const enumsTablesIds = properties.filter(item => (item.body.ptype === "5912f82d4c3181110079e0a6"));
                    // LOAD CATEGORIES LINES VIA config.categid
                    const categoriesLines = yield mongo_1.mongo.objects.getAll(req.body.projectUID, enumsTablesIds.map(item => { return item.config.categid; }));
                    res.json({ result: properties, categoriesLines: categoriesLines });
                }
                //LOAD OBJETS
                else {
                    //CORDINATE !== 
                    const datas = yield mongo_1.mongo.objects.getAll(req.body.projectUID, [req.body.tableUID]);
                    res.json({ result: datas });
                }
            }
            //LOAD USER PROJECTS
            else if (req.body.projectsUIDs) {
                const projects = yield mongo_1.mongo.projects.getAll(req.body.projectsUIDs);
                const mapedProjects = projects.map(item => {
                    var _a;
                    return ({
                        id: item._id.toString(),
                        name: (_a = item.body) === null || _a === void 0 ? void 0 : _a.plib,
                        dateCreation: item.dateCreation
                    });
                });
                res.json({ result: mapedProjects });
            }
            //LOAD PROJECT
            else if (req.body.projectUID) {
                const tables = yield mongo_1.mongo.tables.getAll(req.body.projectUID);
                res.json({ result: tables });
            }
        })
    },
    projects: {
        // LOAD PROJETS
        getAll: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            const projects = yield mongo_1.mongo.projects.getAll(req.body.networks);
            // .collection.aggregate(aggParams).toArray();
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
    properties: {
        // LOAD PROJETS
        getAll: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            //const props = await mongo.properties.getAll(req.body.tableUID);
            res.json({ result: [] });
        })
    },
    tables: {
        // LOAD PROJETS
        getAll: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            const tables = yield mongo_1.mongo.tables.getAll(req.body.projectUID);
            res.json({ result: tables });
        })
    },
};
