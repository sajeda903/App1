const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

io.on('connection', (socket) => {
  let key = null, name = null;

  socket.on('join', (data) => {
    if (!data) return;
    if (key) socket.leave(key);
    key = String(data.room || '').trim() + '::' + String(data.secret || '').trim();
    name = String(data.name || 'someone').slice(0, 20);
    socket.join(key);
    io.to(key).emit('sys', name + ' এসেছে');
  });

  socket.on('msg', (text) => {
    if (!key || !name) return;
    const t = String(text || '').trim().slice(0, 1000);
    if (!t) return;
    io.to(key).emit('msg', { name: name, text: t, ts: Date.now() });
  });

  socket.on('typing', () => {
    if (!key || !name) return;
    socket.to(key).emit('typing', name);
  });

  socket.on('disconnect', () => {
    if (key && name) io.to(key).emit('sys', name + ' চলে গেছে');
  });
});

server.listen(process.env.PORT || 3000, () => console.log('still running'));
