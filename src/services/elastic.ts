import { Client, ClientOptions } from "@elastic/elasticsearch";
import { ElasticClientArgs, ElasticVectorSearch } from "@langchain/community/vectorstores/elasticsearch";
import { Document } from "@langchain/core/documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { VectorStoreRetriever } from "@langchain/core/vectorstores";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Request, Response } from "express";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { env } from "../config/env";
const esConfig: ClientOptions = {
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
  if (env.ELASTIC_API_KEY) {
    esConfig.auth = {
      apiKey: env.ELASTIC_API_KEY,
    }
  }
  esConfig.auth = {
      username: env.ELASTIC_USER as string,
      password: env.ELASTIC_PWD as string,
    };
  
  
  const embeddings = new OpenAIEmbeddings({
    modelName: 'text-embedding-3-small',
  });
  //const embeddings = new OpenAIEmbeddings({model:"text-embedding-3-large"});
  
  
  const formatDocumentsAsString = (documents: Document[]) => {
      return documents.map((document) => document.pageContent).join("\n\n");
    };

  export const elastic = {
    insertVector:async (content:string,metas:any,chunkuid:string) => {
        const esClientArgs: ElasticClientArgs = {
          client: new Client(esConfig),    
          indexName: env.ELASTIC_INDEX+"_"+metas.ownerUID,
        };
        const esVectorStore = new ElasticVectorSearch(embeddings, esClientArgs);
        const ids = await esVectorStore.addDocuments([{
            pageContent: content,
            metadata: metas
          }],{ids:[chunkuid]});
    },
    insertVectors:async (indexName:string,docs:any[],docsIds:any[]) => {
      const esClientArgs: ElasticClientArgs = {
        client: new Client(esConfig),    
        indexName: env.ELASTIC_INDEX+"_"+indexName,
      };
      const esVectorStore = new ElasticVectorSearch(embeddings, esClientArgs);
      const ids = await esVectorStore.addDocuments(docs,{ids:docsIds});
    },
    //SUPPRESSION VECTORS STORES
    deleteVectors: async (req: Request, res: Response) => {
      const esClientArgs: ElasticClientArgs = {
        client: new Client(esConfig),    
        indexName: env.ELASTIC_INDEX+"_"+ req.body.ownerUID,
      };
      const esVectorStore = new ElasticVectorSearch(embeddings, esClientArgs);
      const result = await esVectorStore.delete({ids:req.body.docsIds});
      res.json({ret:"ok"});
  },
    similaritySearch:async(question:string,k:number,filter:any,ownerUID:string) => {
      const esClientArgs: ElasticClientArgs = {
        client: new Client(esConfig),    
        indexName: env.ELASTIC_INDEX+"_"+ownerUID,
      };
      const esVectorStore = new ElasticVectorSearch(embeddings, esClientArgs);
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

      return await esVectorStore.similaritySearch(question,k,filter)
    },
    similaritySearchWithScore:async(question:string,k:number,filter:any,ownerUID:string) => {
      const esClientArgs: ElasticClientArgs = {
        client: new Client(esConfig),    
        indexName: env.ELASTIC_INDEX+"_"+ownerUID,
      };
      const esVectorStore = new ElasticVectorSearch(embeddings, esClientArgs);
      
      
      return await esVectorStore.similaritySearchWithScore(question,k,filter)
    },
    cleanDB: async (req: Request, res: Response) => {
      const esClientArgs: ElasticClientArgs = {
        client: new Client(esConfig),    
        indexName: env.ELASTIC_INDEX+"_"+req.body.ownerUID,
      };
      const esVectorStore = new ElasticVectorSearch(embeddings, esClientArgs);
        return await esClientArgs.client.indices.delete({
          index: (env.ELASTIC_INDEX+"_"+req.body.ownerUID) as string,
        });
      }
  }