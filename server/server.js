const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

let connectedClients = 0;
let sessionActive = false;

app.get('/status', (req, res) => {
  res.json({ status: 'running', clients: connectedClients, sessionActive });
});

async function translateText(text, targetLang) {
  try {
    const response = await axios.post('https://libretranslate.com/translate', {
      q: text,
      source: 'tr',
      target: targetLang,
      format: 'text'
    });
    return response.data.translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // fallback
  }
}

io.on('connection', (socket) => {
  connectedClients++;
  console.log(`A user connected. Total clients: ${connectedClients}`);

  // Send current status to new client
  socket.emit('listenerCount', connectedClients);
  socket.emit('sessionStatus', { active: sessionActive });

  socket.on('disconnect', () => {
    connectedClients--;
    console.log(`User disconnected. Total clients: ${connectedClients}`);
    io.emit('listenerCount', connectedClients);
  });

  // Handle speech input and translation
  socket.on('speech', async (data) => {
    if (sessionActive) {
      const german = await translateText(data.text, 'de');
      const english = await translateText(data.text, 'en');
      io.emit('translation', { original: data.text, german, english });
    }
  });

  // Handle session management
  socket.on('startSession', () => {
    sessionActive = true;
    io.emit('sessionStatus', { active: true });
    console.log('Session started');
  });

  socket.on('endSession', () => {
    sessionActive = false;
    io.emit('sessionStatus', { active: false });
    io.emit('sessionEnded');
    console.log('Session ended');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});