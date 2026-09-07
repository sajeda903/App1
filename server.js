const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 10000000 });

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

io.on('connection', (socket) => {
  let key = null, name = null, announced = false;

  socket.on('join', (data) => {
    if (!data) return;
    if (key) socket.leave(key);
    key = String(data.room || '').trim() + '::' + String(data.secret || '').trim();
    name = String(data.name || 'someone').slice(0, 20);
    socket.join(key);
    if (!announced) { announced = true; io.to(key).emit('sys', name + ' এসেছে'); }
  });

  socket.on('leave', () => { if (key) socket.leave(key); });

  socket.on('msg', (data) => {
    if (!key || !name) return;
    if (typeof data === 'string') data = { text: data };
    const text = String((data && data.text) || '').slice(0, 1000).trim();
    let img = String((data && data.img) || '');
    if (img && !img.startsWith('data:image/')) img = '';
    if (img.length > 9000000) img = '';
    if (!text && !img) return;
    const id = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    io.to(key).emit('msg', { id: id, name: name, text: text, img: img, ts: Date.now(), from: socket.id });
  });

  socket.on('seen', (id) => {
    if (!key) return;
    socket.to(key).emit('seen', String(id).slice(0, 40));
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
