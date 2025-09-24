import express, { Router } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import router from './routes/index'
import { errorHandler } from './middles/error';
import { setupSwagger } from './config/swagger';

export function createApp() {
    const app = express();
    // HEADER SECURITY INJECTION
    app.use(helmet());
    const allowedOrigins = [
      'http://localhost:4200' 
    ];
    const corsOptions: cors.CorsOptions = {
      origin: allowedOrigins
    };
    // CALLERS DOMAIN ORIGINS LIMITATION
    app.use(cors(corsOptions));
    app.use(express.json());
    app.use(morgan('dev'));
    //
    setupSwagger(app);
    //
    app.use('/api',router);
    //
    app.use(errorHandler);
    return app;
}