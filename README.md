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
- `sessionId` (number): ID of the session this translation belongs to
- `originalText` (string): The original text to translate
- `translatedText` (string): The translated text
- `language` (string): Target language code (e.g., "en", "de")

**Response:**
- Status: `201 Created` - Translation successfully created
- Status: `400 Bad Request` - Missing required fields or invalid sessionId

```bash
curl -X POST http://localhost:3001/api/translations \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": 1,
    "originalText": "Assalamu alaikum",
    "translatedText": "Peace be upon you",
    "language": "en"
  }'
```

#### PUT /api/translations/:id

Completely replaces an existing translation. All fields are required.

**Required Fields:**
- `sessionId` (number): ID of the session this translation belongs to
- `originalText` (string): Updated original text
- `translatedText` (string): Updated translated text
- `language` (string): Updated language code

**Response:**
- Status: `200 OK` - Translation successfully updated
- Status: `404 Not Found` - Translation does not exist
- Status: `400 Bad Request` - Missing required fields or invalid sessionId

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

## Data Schema

### User Object

Represents users in the system with different roles for accessing features.

**Fields:**
- `id` (number): Unique identifier for the user (auto-generated)
- `name` (string): Full real name of the user
- `role` (string): User role - either "imam" or "listener"
- `createdAt` (string): ISO 8601 timestamp of when the user was created

**Example:**
```json
{
  "id": 1,
  "name": "Ahmed Hassan",
  "role": "imam",
  "createdAt": "2026-04-01T00:00:00.000Z"
}
```

**Roles:**
- `imam`: Can input Turkish text and start sessions
- `listener`: Can view translations and participate in sessions

**Validation Rules:**
- `name` must be non-empty and represent a real person's name
- `role` must be either "imam" or "listener"

### Session Object

Represents translation sessions started by imams and joined by listeners.

**Fields:**
- `id` (number): Unique identifier for the session (auto-generated)
- `imamId` (number): ID of the imam who started the session
- `title` (string): Descriptive title for the session
- `isActive` (boolean): Whether the session is currently active
- `createdAt` (string): ISO 8601 timestamp of when the session was created
- `participants` (array): List of listener user IDs participating in the session

**Example:**
```json
{
  "id": 1,
  "imamId": 1,
  "title": "Friday Sermon Translation",
  "isActive": true,
  "createdAt": "2026-04-01T10:00:00.000Z",
  "participants": [2, 3, 4]
}
```

**Validation Rules:**
- `imamId` must reference an existing user with role "imam"
- `participants` array should contain valid listener user IDs
- Only imams can create and manage sessions

### Translation Object

The core data structure for storing sermon translations.

**Fields:**
- `id` (number): Unique identifier for the translation (auto-generated)
- `sessionId` (number): ID of the session this translation belongs to
- `originalText` (string): The original Turkish text being translated
- `translatedText` (string): The translated text in the target language
- `language` (string): Target language code (e.g., "en" for English, "de" for German)
- `createdAt` (string): ISO 8601 timestamp of when the translation was created

**Example:**
```json
{
  "id": 1,
  "sessionId": 1,
  "originalText": "Assalamu alaikum",
  "translatedText": "Peace be upon you",
  "language": "en",
  "createdAt": "2026-04-01T10:05:00.000Z"
}
```

**Validation Rules:**
- All fields except `id` and `createdAt` are required for POST/PUT operations
- `sessionId` must reference an existing session
- `originalText`, `translatedText`, and `language` must be non-empty strings
- `language` should be a valid language code (currently supports "en" and "de")
- `sessionId` must reference an existing active session

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