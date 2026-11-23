import { startServer } from './lib.mjs';
const server = await startServer();
console.log(`TodoMVC original disponível em ${server.origin}. Ctrl+C encerra.`);
process.on('SIGINT', async () => { await server.close(); process.exit(0); });
