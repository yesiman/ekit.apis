import { createApp } from './app';
import { env } from './config/env';
//
const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`⚡️ `+new Date()+`: [server]: Server is running at http://localhost:${env.PORT}`);
});
process.on('SIGINT',() => {
  server.close(() => process.exit(0));
}) 
//

