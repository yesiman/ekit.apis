import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import cors from 'cors';
import multer from 'multer';
//CHARGEMENT CONFIG
dotenv.config();
//CUSTOM ROUTES
import { middle } from './routes/middle';
import { mongo } from './modules/db/mongo';
import { auth } from './routes/auth';
import { ekit } from './routes/ekit';
//import { elastic } from './modules/db/elastic';
//MULTER
//DEFINITION STORAGE LOCATION 
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
       cb(null, ""+process.env.DOCS_TMP_LOC)
  },
  filename: function (req, file, cb) {
    
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });
//END MULTER
const app: Express = express();
const port = process.env.PORT;
//process.setMaxListeners(0);
//
const allowedOrigins = [
  'http://localhost:4200'
];
const corsOptions: cors.CorsOptions = {
  origin: allowedOrigins
};
app.use(cors(corsOptions));
app.use(express.json());
// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })
//
const http = require('http').Server(app);
//
app.get('/', (req: Request, res: Response) => {
  res.send('DEEPERMIND.server is running properly! Bye.');
});
// AUTH
app.post('/auth/custom/login', urlencodedParser, auth.custom.log);
// MIDDLE TOKEN VERIFICATION
app.use(middle.checkTokenValidity);
// GET ALL PROJECTS
app.post('/projects/get', urlencodedParser, ekit.projects.getAll);
// START SERVER
http.listen(port, () => {
  console.log(`⚡️ `+new Date()+`: [server]: Server is running at http://localhost:${port}`);
});
//
http.setTimeout(800000);

