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
exports.vectorizer = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const pdf_1 = require("@langchain/community/document_loaders/fs/pdf");
const text_splitter_1 = require("langchain/text_splitter");
const hnswlib_1 = require("@langchain/community/vectorstores/hnswlib");
const openai_1 = require("@langchain/openai");
const openai_2 = __importDefault(require("openai"));
const unzipper = require('unzipper');
//CUSTOM ROUTES
const elastic_1 = require("../db/elastic");
const redis_1 = require("../db/redis");
const mongo_1 = require("../db/mongo");
const socketio_1 = require("../socketio");
const summarizer_1 = require("./summarizer");
const categorizer_1 = require("./categorizer");
exports.vectorizer = {
    normalizeDocumentsWithMetas: (docs) => {
        return docs.map((doc) => {
            const text = typeof doc.pageContent === "string"
                ? doc.pageContent
                : Array.isArray(doc.pageContent)
                    ? doc.pageContent.join("\n")
                    : "";
            return {
                text,
                metadata: Object.assign({}, doc.metadata)
            };
        });
    },
    normalizeDocuments: (docs) => {
        return docs.map((doc) => {
            if (typeof doc.pageContent === "string") {
                return doc.pageContent;
            }
            else if (Array.isArray(doc.pageContent)) {
                return doc.pageContent.join("\n");
            }
        });
    },
    upload: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`⚡️ ` + new Date() + `: Start upload task`);
        console.log("auto", req.body["autoCat"]);
        if (!req.file) {
            //PAS DE FICHIER RECU RETOUR ERREUR
            console.log("err");
            return res.status(400).json({ error: 'No file uploaded' });
        }
        res.json({ message: 'File uploaded successfully' });
        //FILE IS HERE
        //CHECK FILE TYPE TO DISPATCH
        let metas = {};
        switch (req.file.mimetype) {
            case "image/png":
                metas = {
                    original_fname: req.file.filename
                        .replace(".png", "")
                        .replace(".PNG", ""),
                    source_type: "image/png",
                    ownerUID: req.body["meta.ownerUID"],
                    size: req.file.size
                };
                yield exports.vectorizer.imgVectorCreator(metas, "", req.body["processUID"], ".png", req.body["autoCat"]);
                break;
            case "image/jpeg":
                metas = {
                    original_fname: req.file.filename
                        .replace(".jpg", "")
                        .replace(".JPG", "")
                        .replace(".JPEG", "")
                        .replace(".jpeg", ""),
                    source_type: "image/jpeg",
                    ownerUID: req.body["meta.ownerUID"],
                    size: req.file.size
                };
                yield exports.vectorizer.imgVectorCreator(metas, "", req.body["processUID"], ".jpg", req.body["autoCat"]);
                break;
            case "application/pdf":
                metas = {
                    original_fname: req.file.filename.replace(".pdf", ""),
                    source_type: "file/pdf",
                    ownerUID: req.body["meta.ownerUID"],
                    size: req.file.size
                };
                yield exports.vectorizer.pdfVectorCreator(metas, "", req.body["processUID"], req.body["autoCat"]);
                break;
            case "application/zip":
                let files = (yield exports.vectorizer.uploadZip(req.file, req.body["meta.ownerUID"]));
                for (var reliF = 0; reliF < files.length; reliF++) {
                    if (files[reliF].endsWith(".pdf")) {
                        metas = {
                            original_fname: files[reliF].replace(".pdf", ""),
                            source_type: "file/pdf",
                            ownerUID: req.body["meta.ownerUID"]
                        };
                        try {
                            yield exports.vectorizer.pdfVectorCreator(metas, req.body["meta.ownerUID"] + "/", req.body["processUID"], req.body["autoCat"]);
                        }
                        catch (error) {
                            console.log("error viectorize", metas);
                        }
                    }
                }
                break;
            case "text/plain":
                metas = {
                    original_fname: req.file.filename.replace(".txt", ""),
                    source_type: "text/plain",
                    ownerUID: req.body["meta.ownerUID"],
                    size: req.file.size
                };
                yield exports.vectorizer.txtVectorCreator(metas, "", req.body["processUID"], ".txt", req.body["autoCat"]);
                break;
            case "audio/x-m4a":
                metas = {
                    original_fname: req.file.filename.replace(".m4a", ""),
                    source_type: "audio/x-m4a",
                    ownerUID: req.body["meta.ownerUID"],
                    size: req.file.size
                };
                yield exports.vectorizer.audioVectorCreator(metas, "", req.body["processUID"], ".m4a", req.body["autoCat"]);
                break;
            default:
                console.log("req.file.mimetype", req.file.mimetype);
        }
        //RETOUR METHODE
        //SAUVEGADE EN DB --> ELASTIC
        //SAUVEGARDE METAS --> MONGO
    }),
    uploadZip: (file, ownerUID) => __awaiter(void 0, void 0, void 0, function* () {
        //UNZIP
        const directory = yield unzipper.Open.file(file.destination + file.filename);
        yield directory.extract({ path: process.env.DOCS_TMP_LOC + ownerUID + "/" });
        return new Promise((resolve, reject) => {
            //PAS BON SAUVEGARDE DU ZIP DANS UN REPORTOIRE QUI LUI EST PRORPE
            fs_1.default.readdir(process.env.DOCS_TMP_LOC + ownerUID + "/", (err, files) => {
                if (err) {
                    console.error("Could not list the directory.", err);
                    reject();
                }
                else {
                    resolve(files);
                }
            });
        });
        /*console.log('directory', directory);
        return new Promise( (resolve, reject) => {
            console.log(directory.files);
            
            for (var ff = 0;ff < directory.files.length;ff++) {
            pdfVectorCreator(directory.files[ff],ownerUID);
            //directory.files[ff]
            //  .stream()
            //  .pipe(fs.createWriteStream('firstFile'))
            //  .on('error',reject)
            //  .on('finish',resolve);
            }
            //res.json({ message: 'File uploaded successfully' });
            
            
        });*/
        //LOOPON
    }),
    pdfVectorCreator: (defMetas_1, ...args_1) => __awaiter(void 0, [defMetas_1, ...args_1], void 0, function* (defMetas, subTmp = "", processUID = "", autoCat) {
        //GET EXTENSION AND SAVE WITH GUID NAME
        //On prends le fichier source dans TMP
        let nuUuid = (0, uuid_1.v4)();
        defMetas.fname = nuUuid;
        defMetas.uid = defMetas.fname;
        //on le renomme aevc un GUID et on le copie dans répertoire final
        //original_fname
        //On supprime le fichier temporaire
        try {
            // Top level await is available without a flag since Node.js v14.8
            yield promises_1.default.rename(process.env.DOCS_TMP_LOC + subTmp + defMetas.original_fname + ".pdf", process.env.DOCS_LOC + defMetas.fname + ".pdf");
            // Handle success (fs.re
            // name resolves with `undefined` on success)
            console.log('File moved successfully');
        }
        catch (error) {
            // Handle the error
            console.error(error);
        }
        //PASSER LES CHUN A 100 (a tester)
        //
        //const loader = new PDFLoader(process.env.DOCS_LOC+defMetas.fname+".pdf",{splitPages: true,parsedItemSeparator: "",});
        //const pages = await loader.load();
        const loaderfull = new pdf_1.PDFLoader(process.env.DOCS_LOC + defMetas.fname + ".pdf", { parsedItemSeparator: "", });
        const docs = yield loaderfull.load();
        console.log(new Date() + `: Splitting...`);
        const textSplitter = new text_splitter_1.RecursiveCharacterTextSplitter({
            chunkSize: 500,
            chunkOverlap: 75,
            separators: ["\n\n", "\n", ".", " "]
        });
        let splitDocsPages = [];
        let chunksPages = [];
        /*for (const doc of pages) {
          console.log(doc);
          //const normalizedDocs =  vectorizer.normalizeDocuments(doc);
          splitDocsPages.concat(await textSplitter.splitDocuments([doc]));
          for (const chunk of splitDocsPages) {
            // pageNumber est conservé dans metadata
            splitDocsPages.push(chunk);
            console.log("chunk",chunk);
            splitDocsPages.push(new Document({
                pageContent:chunk,
                metadata:{pageNumber:doc.metadata.loc.page}
            }));
          }
        }*/
        //console.log("docs",docs[0].metadata);
        //const normalizedDocs =  vectorizer.normalizeDocuments(docs);  
        //console.log("normalizedDocs",normalizedDocs);
        //console.log("normalizedDocsWithMetas",normalizedDocsWithMetas);
        //const splitDocs = await textSplitter.createDocuments(normalizedDocs);
        const splitDocs = yield textSplitter.splitDocuments(docs);
        const textSplitterForSummary = new text_splitter_1.RecursiveCharacterTextSplitter({
            chunkSize: 2500,
            chunkOverlap: 300,
            separators: ["\n\n", "\n", ".", " "]
        });
        const splitDocsForSummary = yield textSplitterForSummary.splitDocuments(docs);
        //console.log("splitDocs",splitDocs);
        //console.log("splitDocs2",splitDocs2);
        let vectorStore;
        //console.log(splitDocs);
        yield exports.vectorizer.vectorize(splitDocs, defMetas, defMetas.ownerUID, processUID, autoCat, null, splitDocsForSummary);
    }),
    txtVectorCreator: (defMetas_1, ...args_1) => __awaiter(void 0, [defMetas_1, ...args_1], void 0, function* (defMetas, subTmp = "", processUID = "", ext, autoCat) {
        let nuUuid = (0, uuid_1.v4)();
        defMetas.fname = nuUuid;
        defMetas.uid = defMetas.fname;
        const textSplitter = new text_splitter_1.RecursiveCharacterTextSplitter({
            chunkSize: 500,
            chunkOverlap: 75
        });
        yield promises_1.default.rename(process.env.DOCS_TMP_LOC + subTmp + defMetas.original_fname + ext, process.env.DOCS_LOC + defMetas.fname + ext);
        try {
            const data = yield promises_1.default.readFile(process.env.DOCS_LOC + defMetas.fname + ext, { encoding: 'utf8' });
            const splitDocs = yield textSplitter.createDocuments([data]);
            yield exports.vectorizer.vectorize(splitDocs, defMetas, defMetas.ownerUID, processUID, autoCat);
        }
        catch (err) {
            console.error(err);
        }
    }),
    audioVectorCreator: (defMetas_1, ...args_1) => __awaiter(void 0, [defMetas_1, ...args_1], void 0, function* (defMetas, subTmp = "", processUID = "", ext, autoCat) {
        let nuUuid = (0, uuid_1.v4)();
        defMetas.fname = nuUuid;
        defMetas.uid = defMetas.fname;
        const textSplitter = new text_splitter_1.RecursiveCharacterTextSplitter({
            chunkSize: 500,
            chunkOverlap: 75
        });
        yield promises_1.default.rename(process.env.DOCS_TMP_LOC + subTmp + defMetas.original_fname + ext, process.env.DOCS_LOC + defMetas.fname + ext);
        try {
            const openai = new openai_2.default();
            const transcription = yield openai.audio.transcriptions.create({
                file: fs_1.default.createReadStream(process.env.DOCS_LOC + defMetas.fname + ext),
                model: "gpt-4o-transcribe",
            });
            //console.log(transcription.text);
            const data = yield promises_1.default.readFile(process.env.DOCS_LOC + defMetas.fname + ext, { encoding: 'utf8' });
            const splitDocs = yield textSplitter.createDocuments([transcription.text]);
            yield exports.vectorizer.vectorize(splitDocs, defMetas, defMetas.ownerUID, processUID, autoCat);
        }
        catch (err) {
            console.error(err);
        }
    }),
    vectorizeFree: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        let nuUuid = (0, uuid_1.v4)();
        console.log("nFree", req.body["autoCat"]);
        let defMetas = {
            fname: nuUuid,
            uid: nuUuid,
            original_fname: req.body.title,
            ownerUID: req.body.ownerUID,
            source_type: 'free',
        };
        res.json({ message: 'File uploaded successfully' });
        const textSplitter = new text_splitter_1.RecursiveCharacterTextSplitter({
            chunkSize: 500,
            chunkOverlap: 75
        });
        const splitDocs = yield textSplitter.createDocuments([req.body.title + ":" + req.body.content]);
        yield exports.vectorizer.vectorize(splitDocs, defMetas, defMetas.ownerUID, req.body["processUID"], req.body["autoCat"]);
    }),
    imgVectorCreator: (defMetas_1, ...args_1) => __awaiter(void 0, [defMetas_1, ...args_1], void 0, function* (defMetas, subTmp = "", processUID = "", ext, autoCat) {
        //GET EXTENSION AND SAVE WITH GUID NAME
        //On prends le fichier source dans TMP
        let nuUuid = (0, uuid_1.v4)();
        defMetas.fname = nuUuid;
        defMetas.uid = defMetas.fname;
        //on le renomme aevc un GUID et on le copie dans répertoire final
        //original_fname
        //On supprime le fichier temporaire
        const openai = new openai_2.default();
        try {
            console.log("from ", process.env.DOCS_TMP_LOC + subTmp + defMetas.original_fname + ext);
            console.log("to ", process.env.DOCS_LOC + defMetas.fname + ext);
            // Top level await is available without a flag since Node.js v14.8
            try {
                yield promises_1.default.rename(process.env.DOCS_TMP_LOC + subTmp + defMetas.original_fname + ext, process.env.DOCS_LOC + defMetas.fname + ext);
            }
            catch (err) {
                yield promises_1.default.rename(process.env.DOCS_TMP_LOC + subTmp + defMetas.original_fname + ext.toUpperCase(), process.env.DOCS_LOC + defMetas.fname + ext);
            }
            // Handle success (fs.re
            // name resolves with `undefined` on success)
            console.log('File moved successfully');
        }
        catch (error) {
            // Handle the error
            console.error(error);
        }
        const base64Image = fs_1.default.readFileSync(process.env.DOCS_LOC + defMetas.fname + ext, "base64");
        const response = yield openai.responses.create({
            model: "gpt-4.1-mini",
            input: [
                {
                    role: "user",
                    content: [
                        { type: "input_text", text: "what's in this image, détaille au maximum les informations que tu vois et essaye de trouver le nom également" },
                        {
                            type: "input_image",
                            detail: "auto",
                            image_url: `data:image/jpeg;base64,${base64Image}`,
                        },
                    ],
                },
            ],
        });
        let resImg = response.output_text;
        const textSplitter = new text_splitter_1.RecursiveCharacterTextSplitter({
            chunkSize: 500,
            chunkOverlap: 75
        });
        const splitDocs = yield textSplitter.createDocuments([resImg]);
        yield exports.vectorizer.vectorize(splitDocs, defMetas, defMetas.ownerUID, processUID, autoCat);
        //
        /*const loader = new PDFLoader(process.env.DOCS_LOC+defMetas.fname+".pdf",{parsedItemSeparator: "",});
          const docs = await loader.load();
          console.log(new Date()+`: Splitting...`);
          const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000
          });
          const normalizedDocs =  vectorizer.normalizeDocuments(docs);
          const splitDocs = await textSplitter.createDocuments(normalizedDocs);
          let vectorStore;
  
  
          await vectorizer.vectorize(splitDocs,defMetas,defMetas.ownerUID,processUID)*/
    }),
    vectorize: (splitDocs_1, defMetas_1, ownerUID_1, processUID_1, autoCat_1, ...args_1) => __awaiter(void 0, [splitDocs_1, defMetas_1, ownerUID_1, processUID_1, autoCat_1, ...args_1], void 0, function* (splitDocs, defMetas, ownerUID, processUID, autoCat, customMetas = null, splitDocsForSummary = null) {
        let vectorStore;
        console.log(new Date() + `: Creating new vector store...`);
        let userSocket = yield redis_1.redis.getSockets(ownerUID);
        socketio_1.socketio.dispatch(userSocket, "message", processUID, "indexing");
        vectorStore = yield hnswlib_1.HNSWLib.fromDocuments(splitDocs, new openai_1.OpenAIEmbeddings({
            modelName: 'text-embedding-3-small',
        }));
        // 17. Save the vector store to the specified path
        console.log(new Date() + `: Save physical vector new vector store...`);
        try {
            let vss = yield vectorStore.save("" + process.env.LANGCHAIN_INDEXES_LOC + defMetas.fname);
        }
        catch (error) {
            //Notre document ne sempble pas bon, OCR...
            console.log("req.file.filename");
            //  let aw = await Ocr.extractText((req.file.destination.toString()+req.file.filename.toString()).toString());
            //console.log("aw",aw);
        }
        let chunksUids = [];
        //delete docs[0].metadata;
        //console.log(splitDocs[0].pageContent);
        try {
            defMetas.nbpages = splitDocs.length;
            let docs = [];
            let docIds = [];
            for (var reliPages = 0; reliPages < splitDocs.length; reliPages++) {
                let metas = {
                    ownerUID: defMetas.ownerUID,
                    filename: defMetas.original_fname,
                    fname: defMetas.fname,
                    original_fname: defMetas.original_fname,
                    pageId: reliPages,
                    pageLoc: splitDocs[reliPages].metadata.lo,
                    source_type: defMetas.source_type,
                    uid: defMetas.uid
                };
                if (customMetas != null) {
                    if (customMetas.uri) {
                        metas.uri = customMetas.uri;
                    }
                }
                //console.log(new Date()+`: Indexing in Elastic...[page `+ reliPages +`/`+splitDocs.length+`]`);
                metas.pageId = reliPages;
                //metas.filename = defMetas.original_fname;
                metas.pageLoc = splitDocs[reliPages].metadata.loc;
                //metas.pageLoc = splitDocs[reliPages].metadata.loc.pageNumber;
                let chunkuid = (0, uuid_1.v4)();
                chunksUids.push(chunkuid);
                //AJOUT DANS TABLEAU POUR INTEGRATION EN ONE SHOT
                docs.push({
                    pageContent: splitDocs[reliPages].pageContent,
                    metadata: metas
                });
                docIds.push(chunkuid);
                //await elastic.insertVector(splitDocs[reliPages].pageContent,metas,chunkuid);
                //console.log("ids",splitDocs[reliPages].pageContent);
            }
            yield elastic_1.elastic.insertVectors(defMetas.ownerUID, docs, docIds);
        }
        catch (error) {
            console.error("Error during document processing:", error);
            // Continue with the next document
        }
        //ajout des metas dans MONGO
        defMetas.chunksUids = chunksUids;
        //OUID EST EGALEMENT LE NOM DU FICHIER FINAL
        console.log(new Date() + `: Adding Metas in Mongo...`);
        let inserted = yield mongo_1.mongo.metas.add(defMetas);
        try {
            console.log(new Date() + `: Summarizing...`);
            socketio_1.socketio.dispatch(userSocket, "message", processUID, "sumarizing");
            defMetas.summary = (yield summarizer_1.summarizer.start((splitDocsForSummary ? splitDocsForSummary : splitDocs)));
        }
        catch (err) {
            //SUMMARIZER ERROR
            //ON VA FAIRE UN SOMMAIRE VIA LE VECTOR STORE MOINS COMPLET
            console.log("summarize physical vector");
            defMetas.summary = (yield summarizer_1.summarizer.startOnVector(defMetas.fname));
        }
        //STOCKAGE DANS L'INDEX DES SUMMARIES
        //await elastic.insertVectors(defMetas.ownerUID+"_summary",[defMetas.summary],[inserted.insertedId]);
        //IF autoCat checked
        if (Boolean(autoCat) == true) {
            console.log(new Date() + `: Categorizing...`);
            socketio_1.socketio.dispatch(userSocket, "message", processUID, "categorizing");
            defMetas.category = (yield categorizer_1.categorizer.start(defMetas.summary, defMetas.ownerUID)).label;
        }
        //
        yield mongo_1.mongo.metas.update(inserted.insertedId, defMetas);
        socketio_1.socketio.dispatch(userSocket, "message", processUID, "done");
        //
    })
};
