# Sermon Translator

A real-time sermon translation application that converts spoken Turkish into German and English translations instantly.

## Features

- Real-time speech recognition in Turkish
- Automatic translation to German and English
- Web-based interface for easy access
- Live updates via WebSocket

## Tech Stack

- **Frontend**: Next.js with App Router (Port 5173)
- **Backend**: Express.js with Socket.IO (Port 3000)
- **Translation API**: Express.js REST API (Port 3001)
- **Translation Service**: LibreTranslate API
- **Speech Recognition**: Web Speech API
- **Design System**: Stitch with Material Design 3

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

3. Start the backend server (Socket.IO for real-time translations):
   ```bash
   cd server
   npm start
   ```

4. **(Optional) Start the Translation API server** (REST API for managing translations):
   ```bash
   cd server
   node translations-api.js
   ```
   The API will be available at `http://localhost:3001/api/translations`

5. Start the frontend development server:
   ```bash
   cd client
   npm run dev
   ```

6. Open http://localhost:5173 in your browser.

## API Endpoints

### Translation API (Port 3001)

The Translation API provides CRUD operations for managing translations. All endpoints are prefixed with `/api/translations`.

#### GET /api/translations

Returns all translations stored in the system.

**Response:**
- Status: `200 OK`
- Body: Array of translation objects

```bash
curl http://localhost:3001/api/translations
```

#### GET /api/translations/:id

Returns a specific translation by ID.

**Response:**
- Status: `200 OK` - Translation found
- Status: `404 Not Found` - Translation does not exist

```bash
curl http://localhost:3001/api/translations/1
```

#### POST /api/translations

Creates a new translation. All fields are required.

**Required Fields:**
- `originalText` (string): The original text to translate
- `translatedText` (string): The translated text
- `language` (string): Target language code (e.g., "en", "de")

**Response:**
- Status: `201 Created` - Translation successfully created
- Status: `400 Bad Request` - Missing required fields

```bash
curl -X POST http://localhost:3001/api/translations \
  -H "Content-Type: application/json" \
  -d '{
    "originalText": "Assalamu alaikum",
    "translatedText": "Peace be upon you",
    "language": "en"
  }'
```

#### PUT /api/translations/:id

Completely replaces an existing translation. All fields are required.

**Required Fields:**
- `originalText` (string): Updated original text
- `translatedText` (string): Updated translated text
- `language` (string): Updated language code

**Response:**
- Status: `200 OK` - Translation successfully updated
- Status: `404 Not Found` - Translation does not exist
- Status: `400 Bad Request` - Missing required fields

```bash
curl -X PUT http://localhost:3001/api/translations/1 \
  -H "Content-Type: application/json" \
  -d '{
    "originalText": "Wa alaikum assalam",
    "translatedText": "And upon you be peace",
    "language": "en"
  }'
```

#### DELETE /api/translations/:id

Deletes a translation from the system.

**Response:**
- Status: `204 No Content` - Translation successfully deleted
- Status: `404 Not Found` - Translation does not exist

```bash
curl -X DELETE http://localhost:3001/api/translations/1
```

## Testing the API

### Using Postman/HoppScotch

A complete Postman collection is provided for easy API testing:

1. **Download the collection:**
   - File: `server/translations-api.postman_collection.json`

2. **Import in Postman:**
   - Open Postman → Click "Import" → Select the JSON file
   - All endpoints, request bodies, and test scripts will be pre-configured

3. **Import in HoppScotch:**
   - Visit https://hoppscotch.io
   - Click "Import" → "Paste Raw Text" → Copy-paste the JSON collection content
   - All requests are ready to use

4. **Run requests:**
   - Make sure the API server is running (`node translations-api.js`)
   - The base URL is pre-configured as `http://localhost:3001`
   - Click any request and send to test the endpoint

The collection includes:
- ✅ All 5 endpoints with example requests
- ✅ Pre-configured headers and request bodies
- ✅ Multiple response examples (success and error cases)
- ✅ Automated tests for status codes and response validation
- ✅ Environment variable for the base URL

### Troubleshooting "400 Bad Request" Errors

If you receive `400 Bad Request` errors when testing POST or PUT endpoints, follow these steps:

#### For HoppScotch:

1. **Verify Content-Type Header:**
   - Click the request → "Headers" tab
   - Ensure `Content-Type: application/json` is set
   - If missing, add it manually: Key: `Content-Type`, Value: `application/json`

2. **Check Request Body:**
   - Click the request → "Body" tab
   - Select "JSON" as the body type (not Text)
   - Ensure the JSON is valid with all required fields:
     ```json
     {
       "originalText": "Your Turkish text",
       "translatedText": "Your translation",
       "language": "en"
     }
     ```

3. **Validate JSON Format:**
   - Use an online JSON validator to ensure the JSON is properly formatted
   - Check for missing quotes, brackets, or commas

4. **API Error Details:**
   - Check the response body for detailed error messages
   - The API now provides helpful error messages indicating which fields are missing or invalid

#### For Postman:

1. **Import the Pre-configured Collection:**
   - Use the provided `translations-api.postman_collection.json` which has all headers and bodies pre-configured
   - This avoids manual configuration errors

2. **Use "Send" Button:**
   - After importing, just click "Send" on any request
   - No additional configuration needed

#### Common Issues:

| Issue | Solution |
|-------|----------|
| "Request body is empty" | Ensure Body tab has JSON content with all required fields |
| "Missing required fields" | Check that `originalText`, `translatedText`, and `language` are all present |
| "Invalid field types" | Ensure all fields are strings, not numbers or booleans |
| Content-Type error | Manually set header `Content-Type: application/json` |

#### Server Logging:

If issues persist, check the server logs by running the API:
```bash
cd server
node translations-api.js
```

The server will log all incoming requests, showing exactly what was received. This helps identify if the Content-Type header or request body isn't being sent correctly.

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