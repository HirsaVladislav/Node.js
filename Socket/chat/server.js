const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
  },
  // set also 'polling' for allowing http protocol as fallbacks
  transports: ['websocket', 'polling'],
});
const PORT = 3000;

// Send html file by root path: http://localhost:3000/
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './front.html'))
});

// Run our server
server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});

io.on('connection', (socket) => {
  console.log(`User connected to socket by id: ${socket.id}`);

  // Listen event from client
  socket.on('message', (msg) => {
    console.log('Income message', msg);

    // Send message to client
    socket.emit('server_answer', 'I`m server')
  })
});

