import dotenv from 'dotenv';
dotenv.config();

export const env = {
    MONGOHQ_URL:process.env.MONGOHQ_URL ?? "mongodb://127.0.0.1:27017",
    MONGOHQ_DB:process.env.MONGOHQ_DB ?? "ekit",
    JWT:process.env.JWT ?? "abcdefg",
    PORT:process.env.PORT ?? 3000,
    GOOGLE_CLIENT_ID:process.env.GOOGLE_CLIENT_ID ?? "XXXXXX",
    ELASTIC_API_KEY:process.env.ELASTIC_API_KEY ?? "XXXXXXXX",
    ELASTIC_INDEX:process.env.ELASTIC_INDEX ?? "index",
    ELASTIC_USER:process.env.ELASTIC_API_KEY ?? "ELASTIC_USER",
    ELASTIC_PWD:process.env.ELASTIC_API_KEY ?? "ELASTIC_PWD"
}