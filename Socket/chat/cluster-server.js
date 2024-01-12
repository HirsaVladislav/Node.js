const cluster = require("cluster");
const path = require('path');
const express = require('express');
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const numCPUs = require("os").cpus().length;
const { setupMaster, setupWorker } = require("@socket.io/sticky");
const { createAdapter, setupPrimary } = require("@socket.io/cluster-adapter");
const PORT = 3000;


if (cluster.isMaster) {
  // Master process

  console.log(`Master ${process.pid} is running`);

  const server = http.createServer(app);

  // setup sticky sessions
  setupMaster(server, {
    loadBalancingMethod: "least-connection",
  });

  // setup connections between the workers
  setupPrimary();

  // needed for packets containing buffers (you can ignore it if you only send plaintext objects)
  // Node.js < 16.0.0
  // cluster.setupMaster({
  //   serialization: "advanced",
  // });

  // Node.js > 16.0.0
  cluster.setupPrimary({
    serialization: "advanced",
  });

  // Run our server
  server.listen(PORT, () => {
    console.log(`Listening on http://localhost:${PORT}`);
  });

  // creates so many process as you have CPUs
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Listen workers 'exit' event and recreate them if they died
  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Functionality for workers

  console.log(`Worker ${process.pid} started`);

  // Create server for each worker
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      // set also 'polling' for allowing http protocol as fallbacks
      origin: ["http://localhost:3000"],
    },
    transports: ['websocket', 'polling'],
  });

  // Send html file by root path: http://localhost:3000/
  app.get('/', (req, res) => {
    console.log(`Worker ${process.pid} get request.`);

    res.sendFile(path.join(__dirname, './front.html'))
  });

  // use the cluster adapter
  io.adapter(createAdapter());

  // setup connection with the primary process
  // Socket connection and messaging by sockets with client will be only with one (primary) worker
  setupWorker(io);

  // Listen socket 'connection' event, from client
  io.on("connection", (socket) => {
    console.log(`User connected to socket by id: ${socket.id}`);

    // Listen 'message' event from client
    socket.on('message', (msg) => {
      console.log('Income message', msg);
      console.log(`Worker ${process.pid} get message.`);

      // Send message to the client
      socket.emit('server_answer', 'I`m cluster server')
    })
  });
}