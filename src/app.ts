import express, { Router } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import router from './routes/index'

export function createApp() {
    const app = express();
    // HEADER MIDDLE INJECTION
    app.use(helmet());
    const allowedOrigins = [
      'http://localhost:4200'
    ];
    const corsOptions: cors.CorsOptions = {
      origin: allowedOrigins
    };
    app.use(cors(corsOptions));
    app.use(express.json());
    app.use(morgan('dev'));

    app.use('/api',router);

    return app;
}