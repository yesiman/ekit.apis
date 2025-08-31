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
exports.elastic = void 0;
const elasticsearch_1 = require("@elastic/elasticsearch");
const elasticsearch_2 = require("@langchain/community/vectorstores/elasticsearch");
const openai_1 = require("@langchain/openai");
const esConfig = {
    node: 'http://localhost:9200',
    requestTimeout: 60000, // Augmenté à 60 secondes
    maxRetries: 5,
    compression: true, // Ajout de la compression
    //suggestCompression: true,
    // Réduire la charge
    //bulk: {
    //  queue: {
    //    concurrency: 2, // Réduit la concurrence
    //    queueSize: 1000
    //  }
    //}
};
if (process.env.ELASTIC_API_KEY) {
    esConfig.auth = {
        apiKey: process.env.ELASTIC_API_KEY,
    };
}
esConfig.auth = {
    username: process.env.ELASTIC_USER,
    password: process.env.ELASTIC_PWD,
};
const embeddings = new openai_1.OpenAIEmbeddings({
    modelName: 'text-embedding-3-small',
});
//const embeddings = new OpenAIEmbeddings({model:"text-embedding-3-large"});
const formatDocumentsAsString = (documents) => {
    return documents.map((document) => document.pageContent).join("\n\n");
};
exports.elastic = {
    insertVector: (content, metas, chunkuid) => __awaiter(void 0, void 0, void 0, function* () {
        const esClientArgs = {
            client: new elasticsearch_1.Client(esConfig),
            indexName: process.env.ELASTIC_INDEX + "_" + metas.ownerUID,
        };
        const esVectorStore = new elasticsearch_2.ElasticVectorSearch(embeddings, esClientArgs);
        const ids = yield esVectorStore.addDocuments([{
                pageContent: content,
                metadata: metas
            }], { ids: [chunkuid] });
    }),
    insertVectors: (indexName, docs, docsIds) => __awaiter(void 0, void 0, void 0, function* () {
        const esClientArgs = {
            client: new elasticsearch_1.Client(esConfig),
            indexName: process.env.ELASTIC_INDEX + "_" + indexName,
        };
        const esVectorStore = new elasticsearch_2.ElasticVectorSearch(embeddings, esClientArgs);
        const ids = yield esVectorStore.addDocuments(docs, { ids: docsIds });
    }),
    //SUPPRESSION VECTORS STORES
    deleteVectors: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const esClientArgs = {
            client: new elasticsearch_1.Client(esConfig),
            indexName: process.env.ELASTIC_INDEX + "_" + req.body.ownerUID,
        };
        const esVectorStore = new elasticsearch_2.ElasticVectorSearch(embeddings, esClientArgs);
        const result = yield esVectorStore.delete({ ids: req.body.docsIds });
        res.json({ ret: "ok" });
    }),
    similaritySearch: (question, k, filter, ownerUID) => __awaiter(void 0, void 0, void 0, function* () {
        const esClientArgs = {
            client: new elasticsearch_1.Client(esConfig),
            indexName: process.env.ELASTIC_INDEX + "_" + ownerUID,
        };
        const esVectorStore = new elasticsearch_2.ElasticVectorSearch(embeddings, esClientArgs);
        //return await esVectorStore.similaritySearch(question,k,filter)
        //return await esVectorStore.asRetriever();
        /*const vectorStoreRetriever = esVectorStore.asRetriever({filter:filter});
  
        const SYSTEM_TEMPLATE = `Use the following pieces of context to answer the question at the end.
        If you don't know the answer, just say that you don't know, don't try to make up an answer.
        ----------------
        {context}`;
  
        const model = new ChatOpenAI({
          model: "gpt-4o-mini",
        });
  
        const prompt = ChatPromptTemplate.fromMessages([
          ["system", SYSTEM_TEMPLATE],
          ["human", "{question}"],
        ]);
  
        
        const chain = RunnableSequence.from([
          {
            context: vectorStoreRetriever.pipe(formatDocumentsAsString),
            question: new RunnablePassthrough(),
          },
          prompt,
          model,
          new StringOutputParser(),
        ]);
  
        console.log("retriver",await chain.invoke(
          question
        ));
  
  
  
        // Define prompt
   const prompt = PromptTemplate.fromTemplate(
    "Summarize retrieved doc: {context}"
  );
  
  // Instantiate
  const chain = await createStuffDocumentsChain({
    llm: model,
    outputParser: new StringOutputParser(),
    prompt
  });
  
  // Invoke
  const result = await chain.invoke({ context: esVectorStore.asRetriever({filter:filter}) });
  
  
  
  
  
  
  
  
  
  */
        return yield esVectorStore.similaritySearch(question, k, filter);
    }),
    similaritySearchWithScore: (question, k, filter, ownerUID) => __awaiter(void 0, void 0, void 0, function* () {
        const esClientArgs = {
            client: new elasticsearch_1.Client(esConfig),
            indexName: process.env.ELASTIC_INDEX + "_" + ownerUID,
        };
        const esVectorStore = new elasticsearch_2.ElasticVectorSearch(embeddings, esClientArgs);
        return yield esVectorStore.similaritySearchWithScore(question, k, filter);
    }),
    cleanDB: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const esClientArgs = {
            client: new elasticsearch_1.Client(esConfig),
            indexName: process.env.ELASTIC_INDEX + "_" + req.body.ownerUID,
        };
        const esVectorStore = new elasticsearch_2.ElasticVectorSearch(embeddings, esClientArgs);
        return yield esClientArgs.client.indices.delete({
            index: (process.env.ELASTIC_INDEX + "_" + req.body.ownerUID),
        });
    })
};
