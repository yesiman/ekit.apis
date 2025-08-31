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
exports.retriever = void 0;
const openai_1 = require("@langchain/openai");
const prompts_1 = require("@langchain/core/prompts");
const langgraph_1 = require("@langchain/langgraph");
const elastic_1 = require("../db/elastic");
const messages_1 = require("@langchain/core/messages");
const redis_1 = require("../db/redis");
const openai_2 = require("../ia/openai");
const hnswlib_1 = require("@langchain/community/vectorstores/hnswlib");
const runnables_1 = require("@langchain/core/runnables");
const output_parsers_1 = require("@langchain/core/output_parsers");
const mongo_1 = require("../db/mongo");
//CUSTOM ROUTES
const formatDocumentsAsString = (documents) => {
    return documents.map((document) => document.pageContent).join("\n\n");
};
exports.retriever = {
    askIASimilarity: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        yield mongo_1.mongo.queries.add(req.body.ownerUID, req.body.question);
        const llm = new openai_1.ChatOpenAI({
            model: req.body.model,
            temperature: 0
        });
        //Optimisation de la question utilisateur
        const optimized = yield openai_2.oai.optimizeForSimilarity(req.body.question);
        console.log(req.body.ownerUID, optimized);
        //console.log("chat_history",req.body.chat_history);
        // Define prompt for question-answering
        //let chat_history_final = [];
        //chat_history_final.push(new HumanMessage("Bonjour"));
        //chat_history_final.push(new AIMessage("Bonjour"));
        const promptTemplate = prompts_1.PromptTemplate.fromTemplate(req.body.prompt);
        //const promptTemplate = await pull("rlm/rag-prompt");
        // Define state for application
        const InputStateAnnotation = langgraph_1.Annotation.Root({
            question: (langgraph_1.Annotation),
        });
        const StateAnnotation = langgraph_1.Annotation.Root({
            question: (langgraph_1.Annotation),
            context: (langgraph_1.Annotation),
            answer: (langgraph_1.Annotation),
        });
        // Define application steps
        let filter;
        let loadHistoryFrom = req.body.ownerUID;
        console.log(req.body.metaUID);
        if (req.body.metaUID) {
            //ON LOAD LES CHUNKSID DEPUIS MONGO
            //ON PASSE DANS LE FILTER
            /*
            //if (req.body.metaID) {
                console.log(req.body.metaID);
                let resee = await mongo.metas.getChunksUids([new ObjectId(req.body.metaID)]);
                console.log(resee[0].chunksUids);
            //}
            
            //ON PASSE DANS LE FILTER

            filter = [
                {
                    operator: "terms",
                    field: "id",
                    value: resee[0].chunksUids,
                }
            ];
            */
            const metaUIDs = Array.isArray(req.body.metaUID)
                ? req.body.metaUID
                : [req.body.metaUID];
            /*filter = {
                "query": {
                  "bool": {
                    "must": [
                      { "match": { "uid":"22e67532-cf75-4da9-a750-9a05e58e7358" }},
                    ]
                  }
                }
              };

            */
            filter = [
                {
                    operator: "terms",
                    field: "uid.keyword",
                    value: req.body.metaUID,
                }
            ];
            loadHistoryFrom += "_" + req.body.metaUID;
        }
        ;
        //
        const retrieve = (state) => __awaiter(void 0, void 0, void 0, function* () {
            //const retrievedDocs = await elastic.similaritySearch(req.body.question,req.body.k,filter,req.body.ownerUID)
            const retrievedDocsScored = yield elastic_1.elastic.similaritySearchWithScore(String(optimized), req.body.k, filter, req.body.ownerUID);
            //console.log(retrievedDocsScored[0]);
            //console.log((retrievedDocsScored[1] as any).metadata.filename,(retrievedDocsScored[1] as any).metadata.loc);
            //console.log("retrievedDocs",retrievedDocs);
            //console.log("retrievedDocsScored",retrievedDocsScored);
            //const results = await retriever.similaritySearchWithScore(query, 5);
            const topScore = Number(retrievedDocsScored[0][1]);
            const cutoff = topScore * 0.85;
            const documents = retrievedDocsScored
                .filter((res) => {
                const doc = Array.isArray(res[0]) ? res[0][0] : res[0]; // gère [ [Document], score ] ou [ Document, score ]
                const score = res[1];
                return score >= cutoff;
            })
                .map((res) => {
                const doc = Array.isArray(res[0]) ? res[0][0] : res[0];
                return doc;
            });
            return { context: documents };
        });
        let previousHistory = (yield redis_1.redis.loadHistory(loadHistoryFrom)) || [];
        const formattedHistory = previousHistory.map(msg => {
            if (msg.role === "user")
                return "User:" + msg.content;
            if (msg.role === "assistant")
                return "assistant:" + msg.content;
            return new messages_1.SystemMessage(msg.content); // Optionnel, si d'autres rôles existent
        });
        const generate = (state) => __awaiter(void 0, void 0, void 0, function* () {
            //const docsContent = state.context
            //.map(([doc, score]) => `${doc.pageContent} (Score: ${score})`)
            //.join("\n");
            const docsContent = state.context.map(doc => doc.pageContent).join("\n");
            const messages = yield promptTemplate.invoke({ question: req.body.question, context: docsContent });
            const response = yield llm.invoke(messages);
            return { answer: response.content };
        });
        /*
        const question = "Give me three questions related to the context provided that can help me deepen the context. \nQuestion: {question}\n Context: {context}\nAnswer:";
            const promptTemplate2 = PromptTemplate.fromTemplate(question);

            const messages2 = await promptTemplate2.invoke({ question: "Give me a list of 3 questions.", context: response.content });
            const response2 = await llm.invoke(messages2);
        */
        // Compile application and test
        const graph = new langgraph_1.StateGraph(StateAnnotation)
            .addNode("retrieve", retrieve)
            .addNode("generate", generate)
            .addEdge("__start__", "retrieve")
            .addEdge("retrieve", "generate")
            .addEdge("generate", "__end__")
            .compile();
        let inputs = { question: req.body.question };
        const reply = yield graph.invoke(inputs);
        //await redis.saveHistory(req.body.ownerUID,);
        //console.log(reply);
        res.json(reply);
    }),
    askIARag: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const llm = new openai_1.ChatOpenAI({
            model: req.body.model,
            temperature: 0
        });
        // Define prompt for question-answering
        //let chat_history_final = [];
        //chat_history_final.push(new HumanMessage("Bonjour"));
        //chat_history_final.push(new AIMessage("Bonjour"));
        const promptTemplate = prompts_1.PromptTemplate.fromTemplate(req.body.prompt);
        //const promptTemplate = await pull("rlm/rag-prompt");
        // Define state for application
        const InputStateAnnotation = langgraph_1.Annotation.Root({
            question: (langgraph_1.Annotation),
        });
        const StateAnnotation = langgraph_1.Annotation.Root({
            question: (langgraph_1.Annotation),
            context: (langgraph_1.Annotation),
            answer: (langgraph_1.Annotation),
        });
        // Define application steps
        let filter;
        let loadHistoryFrom = req.body.ownerUID;
        if (req.body.metaUID) {
            filter = [
                {
                    operator: "match",
                    field: "uid",
                    value: req.body.metaUID,
                }
            ];
            loadHistoryFrom += "_" + req.body.metaUID;
        }
        ;
        const retrieve = (state) => __awaiter(void 0, void 0, void 0, function* () {
            const retrievedDocs = yield elastic_1.elastic.similaritySearch(req.body.question, req.body.k, filter, req.body.ownerUID);
            return { context: retrievedDocs };
        });
        let previousHistory = (yield redis_1.redis.loadHistory(loadHistoryFrom)) || [];
        const formattedHistory = previousHistory.map(msg => {
            if (msg.role === "user")
                return "User:" + msg.content;
            if (msg.role === "assistant")
                return "assistant:" + msg.content;
            return new messages_1.SystemMessage(msg.content); // Optionnel, si d'autres rôles existent
        });
        const generate = (state) => __awaiter(void 0, void 0, void 0, function* () {
            const docsContent = state.context.map(doc => doc.pageContent).join("\n");
            const messages = yield promptTemplate.invoke({ question: req.body.question, context: docsContent, history: (req.body.metaUID ? formattedHistory : "") });
            const response = yield llm.invoke(messages);
            return { answer: response.content };
        });
        // Compile application and test
        const graph = new langgraph_1.StateGraph(StateAnnotation)
            .addNode("retrieve", retrieve)
            .addNode("generate", generate)
            .addEdge("__start__", "retrieve")
            .addEdge("retrieve", "generate")
            .addEdge("generate", "__end__")
            .compile();
        let inputs = { question: req.body.question };
        //await redis.saveHistory(req.body.ownerUID,));
        const result = yield graph.invoke(inputs);
        res.json(result);
    }),
    askIARagFromGivenContext: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const llm = new openai_1.ChatOpenAI({
            model: req.body.model,
            temperature: 0
        });
        const systemTemplate = "Give me a list of 3 questions without list style to develop and better understand the context provided: {context}.\nDo not provide additional information in your reply.";
        const promptTemplate = prompts_1.ChatPromptTemplate.fromMessages([
            ["system", systemTemplate],
        ]);
        const promptValue = yield promptTemplate.invoke({
            context: req.body.context,
        });
        const response = yield llm.invoke(promptValue);
        res.json(response);
    }),
    categorize: (vectorUID, ownerUID, description, categories) => __awaiter(void 0, void 0, void 0, function* () {
        const labelsDataS = yield mongo_1.mongo.getCategs(ownerUID);
        if (labelsDataS.length == 0) {
            console.log("jhjlj");
            return "";
        }
        const llm = new openai_1.ChatOpenAI({
            model: "gpt-4o-mini",
            temperature: 0
        });
        let vectorStore;
        let indexPath = process.env.LANGCHAIN_INDEXES_LOC + vectorUID;
        // 13. Check if an existing vector store is available
        console.log("Checking for existing vector store...");
        //if (fs.existsSync(indexPath)) {
        // 14. Load the existing vector store
        console.log("Loading existing vector store...");
        vectorStore = yield hnswlib_1.HNSWLib.load(indexPath, new openai_1.OpenAIEmbeddings({
            modelName: 'text-embedding-3-small',
        }));
        const vectorStoreRetriever = vectorStore.asRetriever();
        console.log("Vector store loaded.");
        // 18. Create a retrieval chain using the language model and vector store
        console.log("Creating retrieval chain...");
        //const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever());
        const model = new openai_1.ChatOpenAI({
            model: "gpt-4o-mini",
        });
        let labels = "";
        for (var reli = 0; reli < labelsDataS.length; reli++) {
            labels += "-" + labelsDataS[reli].title + "\n";
        }
        const SYSTEM_TEMPLATE = `
            Use the following pieces of context to categorize it with only one of these labels to answer the question at the end:
                `
            +
                labels
            +
                `
            If you don't know, reply by the 'NOLABEL' lanel.
            Don't try to make up an answer, be concise and only reply by one of the labels listed bellow.
          ----------------
          {context}
          `;
        const prompt = prompts_1.ChatPromptTemplate.fromMessages([
            ["system", SYSTEM_TEMPLATE],
            ["human", "{question}"],
        ]);
        const chain = runnables_1.RunnableSequence.from([
            {
                context: vectorStoreRetriever.pipe(formatDocumentsAsString),
                question: new runnables_1.RunnablePassthrough(),
            },
            prompt,
            model,
            new output_parsers_1.StringOutputParser(),
        ]);
        const answer = yield chain.invoke("What is the category of this content ?");
        //UPDATE RECORD
        return (answer);
    })
};
