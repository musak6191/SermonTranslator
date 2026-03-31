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

app.use(cors());
app.use(express.json());

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
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

  // Handle speech input and translation
  socket.on('speech', async (data) => {
    const german = await translateText(data.text, 'de');
    const english = await translateText(data.text, 'en');
    socket.emit('translation', { original: data.text, german, english });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});