import express, { Router } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import router from './routes/index'
import { errorHandler } from './middles/error';
import { setupSwagger } from './config/swagger';
import { setupHandleBars } from './config/handlebars';

export function createApp() {
    const app = express();
    // HEADER SECURITY INJECTION
    app.use(
      helmet({
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            // ajoute le 4200
            "frame-ancestors": ["'self'", "http://localhost:4200"],
          },
        },
        // si tu avais un X-Frame-Options, désactive-le (obsolète et conflit)
        frameguard: false,
      })
    );

    const allowedOrigins = [
      'http://localhost:4200',
      'http://app.ekit.ekoal.org'
    ];
    const corsOptions: cors.CorsOptions = {
      origin: allowedOrigins
    };
    // CALLERS DOMAIN ORIGINS LIMITATION
    app.use(cors(corsOptions));
    
    // JSON
    app.use(express.json({ limit: '25mb' }));        // ajuste à ton besoin

    // x-www-form-urlencoded (form classique)
    app.use(express.urlencoded({ limit: '25mb', extended: true }));

    // Si tu envoies du texte brut
    app.use(express.text({ limit: '25mb', type: 'text/*' }));

    // Si tu reçois du binaire (raw)
    app.use(express.raw({ limit: '50mb', type: 'application/octet-stream' }));


    app.use(express.json());
    app.use(morgan('dev'));
    //
    setupSwagger(app);
    setupHandleBars(app);
    //
    app.use('/api',router);
    //
    app.use(errorHandler);
    return app;
}