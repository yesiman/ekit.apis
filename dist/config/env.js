"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    MONGOHQ_URL: 'mongodb://127.0.0.1:27017',
    MONGOHQ_DB: 'boost',
    JWT: 'Ax7uioPObnH',
    PORT: '8700'
};
