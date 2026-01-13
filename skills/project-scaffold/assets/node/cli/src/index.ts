import { Config } from './config/index.js';

async function main(): Promise<void> {
  const config = Config.load();
  console.log(`PROJECTNAME running in ${config.env} mode`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
