"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
//CHARGEMENT CONFIG
dotenv_1.default.config();
//CUSTOM ROUTES
const middle_1 = require("./routes/middle");
const auth_1 = require("./routes/auth");
const ekit_1 = require("./routes/ekit");
//import { elastic } from './modules/db/elastic';
//MULTER
//DEFINITION STORAGE LOCATION 
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "" + process.env.DOCS_TMP_LOC);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },
});
const upload = (0, multer_1.default)({ storage: storage });
//END MULTER
const app = (0, express_1.default)();
const port = process.env.PORT;
//process.setMaxListeners(0);
//
const allowedOrigins = [
    'http://localhost:4200'
];
const corsOptions = {
    origin: allowedOrigins
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// create application/x-www-form-urlencoded parser
var urlencodedParser = body_parser_1.default.urlencoded({ extended: false });
//
const http = require('http').Server(app);
//
app.get('/', (req, res) => {
    res.send('DEEPERMIND.server is running properly! Bye.');
});
// AUTH
app.post('/auth/custom/login', urlencodedParser, auth_1.auth.custom.log);
// MIDDLE TOKEN VERIFICATION
app.use(middle_1.middle.checkTokenValidity);
// GET ALL PROJECTS
app.post('/projects/get', urlencodedParser, ekit_1.ekit.projects.getAll);
app.post('/tables/get', urlencodedParser, ekit_1.ekit.tables.getAll);
app.post('/properties/get', urlencodedParser, ekit_1.ekit.properties.getAll);
// START SERVER
http.listen(port, () => {
    console.log(`⚡️ ` + new Date() + `: [server]: Server is running at http://localhost:${port}`);
});
//
http.setTimeout(800000);
