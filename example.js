import http from 'http';
import isPortReachable from 'is-port-reachable';
import kill from './index.js';
const port = 3000

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  })

  res.end('Hi!')
})

async function chekPort() {
    const isOccupied = await isPortReachable(port, { host: 'localhost' });

    if(isOccupied) {
        await kill(port);
    }

    server.listen(port, () => {
      console.log('started listening on port', port)
      setTimeout(() => {
        console.log('killing port', port)
        kill(port)
          .then(console.log)
          .catch(console.log)
      }, 1000)
    })
}

chekPort()