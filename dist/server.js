"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
//
const app = (0, app_1.createApp)();
const server = app.listen(env_1.env.PORT, () => {
    console.log(`⚡️ ` + new Date() + `: [server]: Server is running at http://localhost:${env_1.env.PORT}`);
});
process.on('SIGINT', () => {
    server.close(() => process.exit(0));
});
//
