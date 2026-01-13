import { createServer } from './server/index.js';
import { Config } from './config/index.js';

async function main(): Promise<void> {
  const config = Config.load();
  const server = createServer();

  server.listen(config.port, () => {
    console.log(`PROJECTNAME API running on port ${config.port}`);
  });

  process.on('SIGTERM', () => {
    console.log('Shutting down...');
    server.close();
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
