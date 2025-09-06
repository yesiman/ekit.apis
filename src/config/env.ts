import dotenv from 'dotenv';
dotenv.config();

export const env = {
    MONGOHQ_URL:process.env.MONGOHQ_URL ?? "mongodb://127.0.0.1:27017",
    MONGOHQ_DB:process.env.MONGOHQ_DB ?? "ekit",
    JWT:process.env.JWT ?? "abcdefg",
    PORT:process.env.PORT ?? 3000
}