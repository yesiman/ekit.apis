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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const mongo_1 = require("../services/mongo");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// CUSTOM AUTH MANAGEMENT
exports.auth = {
    custom: {
        // LOGIN WITH PASS/LOGIN
        log: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            // RECUPERATION USER LIE
            const user = yield mongo_1.mongo.users.getOne({ "credentials.login": req.body.login, "credentials.pass": req.body.pass });
            let ret = null;
            // CHECK IF CREDENTIAL OK
            if ((_a = user === null || user === void 0 ? void 0 : user.credentials) === null || _a === void 0 ? void 0 : _a.valid) {
                delete user.credentials.pass;
                delete user.pres;
                const token = jsonwebtoken_1.default.sign({ "credentials": user.credentials }, process.env.JWT, {
                    expiresIn: 14400
                });
                ret = {
                    user: user,
                    token: token
                };
            }
            res.json(ret);
        })
    },
};
