# Sermon Translator

A real-time sermon translation application that converts spoken Turkish into German and English translations instantly.

## Features

- Real-time speech recognition in Turkish
- Automatic translation to German and English
- Web-based interface for easy access
- Live updates via WebSocket

## Tech Stack

- **Frontend**: React + Vite (Port 5173)
- **Backend**: Express.js with Socket.IO (Port 3000)
- **Translation**: LibreTranslate API
- **Speech Recognition**: Web Speech API

## Setup

1. Install dependencies for both frontend and backend:
   ```bash
   cd client
   npm install

   cd ../server
   npm install
   ```

2. **Configure MCP (Model Context Protocol) for design system integration:**
   ```bash
   # Copy the example configuration
   cp mcp.config.example.json mcp.config.json

   # Edit mcp.config.json and replace YOUR_STITCH_API_KEY_HERE with your actual API key
   # Get your API key from: https://console.cloud.google.com/apis/credentials
   ```

3. Start the backend server:
   ```bash
   cd server
   npm start
   ```

4. Start the frontend development server:
   ```bash
   cd client
   npm run dev
   ```

5. Open http://localhost:5173 in your browser.

## Usage

1. Click "Start Listening" to begin speech recognition.
2. Speak in Turkish.
3. The original text and translations will appear in real-time.
4. Click "Stop Listening" to end.

## Note

This application uses the browser's Web Speech API, which requires microphone access and is supported in modern browsers like Chrome and Edge.

## Braucht eure App SSR/Next.js – oder wäre Vite eigentlich besser geeignet? Begründet anhand von SEO und Interaktivität.

Klar CSR, da Websockets für meine Anwendung wichtig sind und diese besser mit CSR funktionieren. Die SEO ist hierbei zweitrangig, da es sich ohnehin bereits um ein nischiges Produkt handelt.

## Welche Ressourcen hat die App?

/TranslationEnglish, /TranslationGerman, /InputTurkish, /Imam, /Listener, /sessions

Hierarchie: /InputTurkish can only be accessed from the /Imam, who is also the only one who can start a /session
            /Translations can only be viewed by the /Listener, who can participate in a session

Strukturentscheidung: "Flaches Design mit Query-Parametern", da meine App wenige Daten handelt, sondern der meiste Traffic in Echtzeit passiert.