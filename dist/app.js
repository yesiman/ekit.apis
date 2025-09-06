"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cors_1 = __importDefault(require("cors"));
const index_1 = __importDefault(require("./routes/index"));
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, helmet_1.default)());
    const allowedOrigins = [
        'http://localhost:4200'
    ];
    const corsOptions = {
        origin: allowedOrigins
    };
    app.use((0, cors_1.default)(corsOptions));
    app.use(express_1.default.json());
    app.use((0, morgan_1.default)('dev'));
    app.use('/api', index_1.default);
    return app;
}
