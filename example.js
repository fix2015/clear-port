import http from 'http';
import isPortReachable from 'is-port-reachable';
import portUtil from './index.js';

const PORT = 3000;
const SERVER_OPTIONS = {
  method: 'tcp',
  verbose: true,
  action: 'kill'
};

async function checkPortAndStartServer(port) {
  try {
    const isOccupied = await isPortReachable(port, { host: 'localhost' });
    console.log(`Port ${port} is ${isOccupied ? 'occupied' : 'available'}`);

    if (isOccupied) {
      console.log(`Attempting to free up port ${port}...`);
      await portUtil(port, { action: 'kill', method: 'tcp', verbose: true });
    }

    startServer(port);
  } catch (error) {
    console.error(`Error checking port ${port}:`, error);
  }
}

function startServer(port) {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hi!');
  });

  server.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });
}

(async function main() {
  try {
    console.log('Starting port utility...');
    await portUtil(PORT, SERVER_OPTIONS);
    console.log('Port existence check completed.');
    await checkPortAndStartServer(PORT);
  } catch (error) {
    console.error('Error during initialization:', error);
  }
})();
