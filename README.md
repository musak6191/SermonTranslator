# Zermon

A sermon streaming service that translates spoken turkish into german/english.

## Features

- Real-time speech recognition in Turkish
- Automatic translation to German and English
- Web-based interface for easy access
- Live updates via WebSocket

## Tech Stack

- **Frontend**: Next.js & and React with App Router
- **Backend**: Node.js with Socket.IO and Express
- **Translation Service**: LibreTranslate API with free Google Web API Fallback
- **Speech Recognition**: Web Speech API
- **Database**: Prisma & SQLite
- **Auth**: JWT,bycript and cookies
- **Notifications**: Web push support
- **Testing**: Vitest for unit/integration tests and Cypress for end2end

## Note

This application uses the browser's Web Speech API, which requires microphone access and is supported in modern browsers like Chrome and Edge.

Die meisten Prompt Iterationen waren Bug fixes, basierend auf dem ersten Prompt. Zudem wurden auch nicht jede Prompts dokumentiert, da ich mir das nicht recht angewöhnt habe.

# Session 1: Full-Stack Setup

Init Prompt: "Ich will als Prediger, dass meine Predigen auf Zielsprachen übersetzt werden in Echtzeit."

# Session 2: Frontend-Architektur

## Prompts:

„Ersetze mein Vite-Frontend durch Next.js mit App Router und Tailwind. Das Express-Backend auf Port 3000 bleibt unverändert. Die Startseite soll "für den Prediger die Predigen in Echtzeit übersetzen" umsetzen – diesmal als Server Component, die Daten direkt beim Laden vom Backend fetcht, ohne useEffect."

„Als Zuhörer möchte ich die Endsprache ändern, ohne dass die Seite neu lädt, damit der Ablauf flüssig bleibt."

## Braucht eure App SSR/Next.js – oder wäre Vite eigentlich besser geeignet? Begründet anhand von SEO und Interaktivität.

Klar CSR, da Websockets für meine Anwendung wichtig sind und diese besser mit CSR funktionieren. Die SEO ist hierbei zweitrangig, da es sich ohnehin bereits um ein nischiges Produkt handelt, welches somit besser konkurriert.

# Session 3: API Design

## Prompts:

„Meine API soll sessions verwalten. Stack: Express.js auf Port 3001, Daten als Array im RAM (noch keine Datenbank). Implementiere:

    GET /api/session – alle Sessions zurückgeben
    GET /api/session/:id – einzelne Session zurückgeben, 404 wenn nicht gefunden
    POST /api/session – neue Session anlegen, 400 wenn Titel fehlt
    DELETE /api/session/:id – Session löschen, 204 als Antwort

Nutze korrekte HTTP-Status-Codes für alle Fälle."

„Generiere mir eine HoppScotch/Postman-Collection für diese API."

## Welche Ressourcen hat die App?

/register, /login, /logout, /me, /change-password, /users, /sessions, /translations, /forums /comments, 

Hierarchie: 1 - /Iman can start 1 - /session
            n - /Translations gehören zu 1 - /session
            n - /listeners participate 1 - /session

Strukturentscheidung: "Flaches Design mit Query-Parametern", da meine App wenige Daten handelt, sondern der meiste Traffic in Echtzeit passiert.

# Session 4: Datenhaltung & Persistenz

## Prompts

„Ich habe ein Express-Backend auf Port 3001. Richte Prisma als ORM ein. Nutze als Datenbank SQLite mit dem Paket better-sqlite3. Mein Datenmodell:'users(id, name, email, password, role)
sessions(id, title, description, imamId, isActive, createdAt)
translations(id, sessionId, originalText, translatedText, language, createdAt)
forum_posts(id, title, content, authorId, createdAt)
forum_comments(id, postId, authorId, content, parentId, repliedToName, createdAt)
push_subscriptions(id, userId, endpoint, p256dh, auth, createdAt)'. Erstelle das prisma/schema.prisma, installiere die nötigen Pakete und führe die erste Migration durch."

„Ersetze den GET /api/session-Handler. Bisher: res.json(session). Neu: Alle Tasks aus der Datenbank laden mit prisma und als JSON zurückgeben. Fehlerbehandlung mit try/catch und 500-Status."

## Data scheme

users(id, name, email, password, role)
sessions(id, title, description, imamId, isActive, createdAt)
translations(id, sessionId, originalText, translatedText, language, createdAt)
forum_posts(id, title, content, authorId, createdAt)
forum_comments(id, postId, authorId, content, parentId, repliedToName, createdAt)
push_subscriptions(id, userId, endpoint, p256dh, auth, createdAt)

## Welche Daten in eurer App müssten in der Datenbank liegen – und gibt es Daten, für die Redis oder ein Cloud Object Store (S3) langfristig sinnvoller wären? Begründet in 2–3 Sätzen.

In der Datenbank müssten Userinformationen liegen, da sich diese für eine Datenbank gut eignen. Da meine App viel auf Echtzeit-Traffic basiert, kann man diese Daten auch auf dem Cache speichern, obwohl ich auch überlege, Predigen zu speichern, diese müssten dann ebenfalls in einer Datenbank angelegt sein.

# Session 5: Security

## Prompts:

„Implementiere zwei neue Routen in meinem Express-Backend: POST /api/auth/register und POST /api/auth/login. Stack: Express, Prisma, PostgreSQL. Anforderungen: Passwörter werden mit bcrypt gehasht gespeichert (niemals im Klartext). Nach erfolgreichem Login wird ein JWT ausgestellt, das userId und email im Payload enthält und nach 24 Stunden abläuft. Der JWT-Secret kommt aus der .env-Datei. Fehlerfall: Wenn E-Mail bereits vergeben ist → 409. Wenn Passwort/Username falsch → 401. Wichtig: Die Fehlermeldung bei falscher E-Mail und bei falschem Passwort muss identisch sein ('E-Mail oder Passwort ungültig.'

Füge in meinem Frontend zwei Seiten: /login und /register hinzu. Nicht eingeloggte User kommen auf die Login-Seite und können sich dort über E-Mail + Passwort einloggen. Ein Klick auf Registrieren bringt sie zu /register. Beide Formulare senden die Daten per POST an /api/auth/login bzw. /api/auth/register im Express-Backend. Nach erfolgreichem Login wird der JWT als HttpOnly Cookie gespeichert und der Nutzer auf die Startseite weitergeleitet. Bei Fehler (401, 409) wird eine kurze Fehlermeldung angezeigt."

„Schreibe eine Express-Middleware authenticate, die den JWT verifiziert und req.user mit dem Payload befüllt. Wenn kein Token vorhanden oder ungültig → 401. Binde die Middleware in alle relevanten Routen ein."

„Passe das Backend an: Es soll Datenbankabfragen mit Authorisierung verbinden, also die userId aus req.user berücksichtigen. <-- Für jeden Handler

Erstelle im Frontend eine zentrale Hilfsfunktion authFetch(url, options), die bei jedem Request automatisch den JWT mitschickt. Wenn der Server 401 zurückgibt, soll der Token gelöscht und der Nutzer zur /login-Seite weitergeleitet werden. Ersetze alle bestehenden fetch()-Aufrufe im Frontend durch authFetch()."

„Prüfe meinen Express-Backend-Code auf die folgenden Sicherheitsprobleme aus den OWASP Top 10 und gib für jeden Punkt an, ob er in meinem Code abgedeckt ist, fehlt oder verbesserungswürdig ist:

    A01 Broken Access Control: Gibt es Routen, die keine Authentifizierung erfordern, aber sollten? Gibt es Ownership-Checks in allen DB-Queries auf nutzereigene Ressourcen?
    A02 Cryptographic Failures: Sind Passwörter gehasht (bcrypt)? Liegt der JWT-Secret in .env? 
    A03 Injection: Werden alle DB-Zugriffe über Prisma (Prepared Statements) gemacht? Gibt es irgendwo String-Konkatenation in SQL? Sind XSS Angriffe möglich?
    A07 Authentication Failures: Ist die Fehlermeldung bei falschem Login einheitlich (User Enumeration)? Sind schwache Passwörter möglich?

Gib für jeden Punkt eine konkrete Code-Stelle an, falls etwas fehlt oder verbesserungswürdig ist, und schlag einen Fix vor."

## Welche drei Dinge kann ein anonymer Nutzer mit eurer aktuellen API anstellen, die er nicht dürfte?

1. In dem GET api/users -Protokoll bekommt er alle User angezeigt, was Datenschutztechnisch schwierig wäre.
2. In dem GET api/sessions/:id Protokoll kann er einfach alle IDs durchtesten und somit sich durch Sessions surfen, zu denen er möglicherweise gar keinen Zugriff hat.
3. In dem DELETE api/translations/:id kann er einfach willkürlich Übersetzungen löschen.

## Was passiert, wenn jemand versuchen würde, den JWT-Payload manuell verändert (z.B. die userId auf eine fremde ändert)? Warum funktioniert das nicht?

Wenn Der Angreifer den Payload ändert, stimmt sie nicht mehr mit dem Token überein, da mit verändertem Inhalt (id) eine andere Signatur rauskommen würde und diese abgelehnt werden würde.

## Security Audit: 06-05-2026

Die App hat noch Broken Access Control issues hinsichtlich fehlender Authentifizierung, fehlender Berechtigungseinschränkungen und öffentliche Datenschutzdaten. Zu dem gibt es noch keine passwort strength validation oder rate limiting.

# Session 6: Testing

## Prompts:

„Schreibe Vitest Unit Tests für Login-inputs. Decke folgende Fälle ab: Normalfall, leerer Input, ungültiger Typ."

„Füge einen Cypress-Test hinzu, der prüft, ob beim Login mit falschem Passwort die Fehlermeldung 'E-Mail oder Passwort ungültig.' angezeigt wird. Nutze cy.get('[data-cy="error-message"]') für den Assert."

## Test Pyramide
Ebene       -Was testen wir?        -Tool

Unit        -Textverarbeitung       -Vitest
Integration -Session-path testen    -Vitest
E2E-Login-  -Session start          -Cypress
Flow,        /participate

## Welche zwei Dinge würde am meisten Schaden, wenn es durch den Agenten kaputt geht?
      -Session erstellen und dass man Sessions beitreten kann.

# Session 7: Real-time Web

## Prompts: 

„Implementiere einen SSE-Endpoint GET /api/events in meinem Express-Backend. Wenn eine neue [eure Ressource, z.B. Session/Translation/Forumpost] via POST angelegt wird, soll der Server allen verbundenen Clients ein Event schicken, das sie dazu bringt, ihre Liste neu zu laden. Im Frontend soll ein useEffect einen EventSource-Listener öffnen, der auf dieses Event reagiert und die Liste aktualisiert – ohne Seiten-Reload."

„Integriere socket.io in mein Express-Backend (Port [euer Port]). Wenn ein Client ein Event sendet – z.B. new-translation mit den Daten des neuen Eintrags – soll der Server dieses Event an alle anderen verbundenen Clients weiterleiten (socket.broadcast.emit), damit deren Listen live aktualisiert werden. Im Frontend soll beim Anlegen eines neuen Eintrags zusätzlich zum API-Call ein socket-Event abgefeuert werden. Andere geöffnete Clients sollen das Update sofort ohne Reload sehen."

## SSE oder Socket.io?

Gibt es Daten in eurer App, die sich ändern können, während ein anderer Nutzer die Seite offen hat? - Ja, die Forumbeiträge und deren Kommentare, die Live-Sessions, die Stored-Sessions und die Übersetzungen in den Sessions.
Müssen Änderungen sofort sichtbar sein – oder reicht ein Reload? - Also die Übersetzungen aus den Sessions sollte aufjedenfall sofort sichtbar sein, alles andere kann bei einem Reload getätigt werden
Ist die Kommunikation einseitig (Server → Client) oder bidirektional (beide senden)? - Bidirektional, da der Imam auch Information an den Server schickt, der diese dann verteilen soll.
Wie viele Clients könnten gleichzeitig verbunden sein? - Ich wollte den Scope der App eigentlich so setzen, dass Sessions nur lokal mit 3-25 Leuten geschehen, aber mittlerweile entwickelt es sich mehr zu einer Streaming plattform, also kann von 0-200 Leuten sein

Trefft danach eine begründete Technologieentscheidung: Also für die Stored-Sermons reicht SSE, für die Anzeige der Forumbeiträge reicht auch SSE aber für deren Kommentarsektion könnte man Websockets einbauen, und für die Übersetzungen aufjedenfall Websockets.

Kriterium 	      	SSE 	            WebSockets
-------------------------------------------------------------
Richtung 	      	Server → Client 	Bidirektional

Komplexität  	      Gering 	      Mittel
im Code

Reconnect bei  	      Automatisch      	Manuell / socket.io übernimmt
Verbindungs-
abbruch

Geeignet für euer  	✅     	   	✅
Projekt

Warum? 	  	  	Für die Forumbei-    Für die Übersetzungen brauche ich
                        träge, da SSE für    Websockets, da ich eine bidirektio-
                        diese ausreichend    nale Kommunikation brauche
                        ist, aber auch Web-
                        sockets gut passen
                        würden.

## Was passiert in eurer aktuellen Implementierung, wenn der Server neu startet – verlieren verbundene Clients ihre Verbindung, und wie verhält sich die App dann?
Kommt drauf an, was der User gerade macht. Aber sowohl die EventSource API als auch die Socket.io library haben eine eingebundene automatische reconnect Funktion.
Wenn der User einen Sermon Stream benutzt, während der Server neustartet, dann wird er für die Sekunden in denen der Server neustartet, die Verbindung verlieren, danach wird es aber automatisch wiederhergestellt.
Wenn er genau dann einen Forum Post macht, wo der Server offline ist. Sollte der Post zwar in der Datenbank gespeichert werden, der Server schickt allerdings nie die "Push Benachrichtigung" raus, dass es einen neuen Beitrag gibt. Er müsste die Seite reloaden.

## Welche Teile meiner App würden langfristig von Echtzeit-Kommunikation profitieren, welche nicht? Wo wäre Polling (z.B. alle 5 Sekunden ein GET) die ehrlichere Lösung? Begründe anhand meines konkreten Codes.
Die Live Speech Translation sollte aufjedenfall eine websocket implementierung haben, da es sich um bidirektionale Kommunikation handelt.
Das Auflisten von Sessions oder Foren sollte von SSE Stack zu Polling wechseln, da hier der Kostengrund überwiegt.
Die Thread Comments sollten ebenfalls von SSE auf Polling umswitchen, da Diskussionen Kommentare asynchron passieren, und polling skaliert besser mit stateless Servern.
Diese Changes setzte ich um.

# Session 8: Async Messaging

## Prompts:

„Implementiere E-Mail-Benachrichtigungen für Password Resets. Stack: Express-Backend, Resend als Mail-API, React Email für das Template. Anforderungen: Das Passwort soll einen Link zu einer Passwort Reset Page enthalten. Der Mailversand darf den HTTP-Request nicht blockieren. Fehlerbehandlung mit try/catch. Der API-Key kommt aus der .env-Datei."

„Implementiere Web Push für, wenn eine Session beendet wird. Anforderungen: VAPID-Keys aus der .env. Ein Service Worker unter /public/sw.js empfängt Push-Events und zeigt eine Notification mit Titel, Body und einem direkten Link zur relevanten Seite. Im Frontend: Nach Login wird der Nutzer nach Push-Erlaubnis gefragt (Notification.requestPermission()), die Subscription wird per POST an /api/push/subscribe gespeichert. HTTP 410-Antworten des Push Service (abgelaufene Subscriptions) müssen aus der DB gelöscht werden."

## Notification-Bedarf der App

Events            Notification sinnvoll?        Typ               Kanal       Begründung

Imam startet      Nein                          Transactional     Web         Nicht klar, ob
neues Session                                                                 User den Stream
                                                                              überhaupt hören will.
Neuer Forum       Nein                          Transactional     Web         Auch hier nicht 
Post                                                                          nicht klar, ob
                                                                              User ihn lesen will.
Session endet     Ja                            Transactional     Web         User sollte wissen
                                                                              warum die Session nicht mehr da ist.

Die Sinnhaftigkeit der Notification würde im Laufe der Entwicklung variieren, vorallem wenn mehr Features hinzukommen würden.

Für das Ende einer Session, ist bereits eine Push-Benachrichtigung eingesetzt. Für das Ändern vom Passwort sollte man noch eine transactional E-Mail rausschicken.

## Template kritisch prüfen

✅ Enthält das Template alle Infos, die der Nutzer braucht – ohne sich einloggen zu müssen?

      Es gibt keine Benachrichtigung, die der Nutzer sehen muss, wenn er nicht eingeloggt ist.

✅ Gibt es einen direkten Deep Link zur betroffenen Ansicht (nicht nur zur Startseite)?

      Ja von der Passwort-Reset Mail zur Passwort-Change Page

✅ Ist Betreff / Notification-Titel klar, was das Event war – in unter 50 Zeichen?

      Ja, relativ knapp gehalten immer.

✅ Ist der Notification-Body unter 120 Zeichen?

      Ja, auch.

# Session 9: Monolithen vs. Microservices

## Prompts:

„Refactore meinen POST /api/session-Handler (Alle Handler durch iterieren). Die Validierung und die Prisma-Abfrage sollen in eine neue Datei habits/habits.service.js als Funktion createHabit(data, userId) ausgelagert werden. Der Route-Handler bleibt schlank: Input aus req.body nehmen, createHabit aufrufen, Ergebnis zurückgeben. Fehlerbehandlung mit try/catch und passenden HTTP-Status-Codes."

„Restrukturiere mein Express-Backend nach diesem Muster: Jeder Bounded Context (Session, Auth, Translation) bekommt einen eigenen Ordner unter modules/. Darin liegen: [kontext].routes.js, [kontext].service.js. In server.js werden die Routen mit app.use('/api/translation', translationRouter) eingebunden. Bestehende Logik aus routes/ soll in die neue Struktur überführt werden, ohne Funktionalität zu ändern."

## Bestandsaufnahme

Datei                   Wofür verantwortlich?                     Zugriff auf andere Dateien?

api/auth                Login/Register                            Auf api/user
api/user                Create/Lies User                          -
api/session             Create sessions& verify Users hierfür     Auf api/user
api/translation         Handling von Translation-Daten & Veri-    Auf api/user & api/session
                        fizierung von Usern & Session hierfür
api/forums              Create/Read Forumbeiträge und stored      Auf api/forums/:id/comments
                        die Kommentare dazu
api/push/subscribe      Für die Web-Pushbenachrichtigungen        -

### Aktuelle monolithische Mixxes

- Auth Logic
- Password reset logic
- session management
- translation ownership validation
- forum CRUD
- push subscription persistence

## Bounded Context

Session Context           Translations Context            User Context             Forum Context
---------------           --------------------            ------------             -------------
Session                   Translation                     User                     Forum
Session entry                                             Session-JWT              Forum entry
                                                          Password-Reset           Comment

### Welche Contexte kommunizieren miteinander?

Session braucht vom User die User Rollen zur Verifizierung. Translations braucht von Session die Session, die aber einem User zugewiesen ist.

### Modulschnittstellen

auth.service.js----------------------------

öffentlich: getCurrentUserInfo, registerUser, loginUser, logoutUser
intern: validatePassword, requestPasswordChange, resetPasswordWithToken

forums.service.js--------------------------

öffentlich: 
intern: getAllForums, createForumPost, createComment, getSpecificComments

push.service.js----------------------------

öffentlich: -
intern: savePushSubscription

session.service.js-------------------------

öffentlich: createSession, joinSession, endSession
intern: getSession, getAllSession

translations.service.js--------------------

öffentlich: createTranslation, replaceTranslation, deleteTranslation
intern: getAllTranslations, getTranslation

users.service.js---------------------------

öffentlich: createUser
intern: getAllUser

### Architektur-Review by Agent

sendPasswordResetEmail() should be put into its own email service. Socket.io is currently emitting side effects out of session.routes.js, this should happen better in a session service or transport helper. Good news: Service layer is isolated from other modules and the most extractable module is push, followed by forums.

# Session 10: Deployment

## Prompts:

„Mein Frontend ruft das Backend bisher über http://localhost:5173 auf. Ich deploye jetzt Frontend und Backend als eine Node.js-App auf derselben Domain, die API hängt unter dem Pfad /api. Stelle authFetch() und alle anderen API-Aufrufe auf relative Pfade um (z. B. /api/login statt http://localhost:3001/login). Richte außerdem in vite.config.js einen Dev-Proxy ein, der im Dev alle /api-Anfragen an http://localhost:3001 weiterleitet, damit dieselben relativen Pfade lokal und in Produktion funktionieren."

Mein Express-Server soll in einer App sowohl eine API unter dem Pfad /api als auch ein statisches React-Build ausliefern. Schreibe die Server-Konfiguration mit korrekter Middleware-Reihenfolge: (1) API-Routen unter /api zuerst, inkl. JSON-404 für unbekannte /api-Pfade; (2) express.static für den Build-Ordner mit Cache-Headern – gehashte Dateien im assets/-Ordner lang & immutable cachen; (3) SPA-Fallback, der alle übrigen Pfade auf index.html umschreibt und index.html nicht cachen lässt. Berücksichtige, dass die App hinter einem Reverse-Proxy (Apache) läuft (trust proxy). Kommentiere jeden Block kurz und weise mich auf Unterschiede zwischen Express 4 und 5 beim Wildcard-Routing hin."

„Mein Express-Server lauscht aktuell auf einem festen Port (app.listen(3000)). Stelle das so um, dass er den Port aus process.env.PORT liest und nur als Fallback auf 3000 zurückfällt. Erkläre mir kurz, warum das in einer gemanagten Hosting-Umgebung wichtig ist."

„Mein Express-Backend und mein React-Frontend laufen jetzt als eine App auf derselben Domain (zermon.de), die API hängt unter /api. Ich nutze einen HttpOnly-Cookie für die JWT-Auth. Konfiguriere den Login-Handler so, dass der Cookie mit httpOnly: true, sameSite: 'lax' und secure: process.env.NODE_ENV === 'production' gesetzt wird, damit derselbe Code lokal über HTTP und in Produktion über HTTPS funktioniert. Erkläre mir, warum ich hier keine CORS-Middleware und kein SameSite=None brauche, und warum app.set('trust proxy', 1) hinter dem Apache-Reverse-Proxy sinnvoll ist. Zeige mir außerdem, wie ich den Cookie beim Logout mit denselben Attributen wieder lösche."

## Deployement-Architektur

Bestandteil 	Läuft als 	      Hostname (Beispiel) 	      Wird ausgeliefert von
Frontend (React) 	statisches Build 	zermon.de 	                  Express
Backend (Express) Node.js-App       zermon.de/api	            konsoleH Node.js
Datenbank (SQL) 	MySQL/MariaDB 	zermonDB (auf dem Server) 	konsoleH DB-Verwaltung

# Session 11: Polish

## Prompts:

"You are implementing a new landing page screen for an existing web application.

I will provide a PNG design mockup. Your task is to recreate that landing page as accurately as possible based on the PNG.

Important requirements:

1. Scope strictly limited to the new landing page

   * Do not modify any existing pages, components, routes, layouts, styles, business logic, APIs, or functionality outside of what is required for this new landing page.
   * Do not refactor unrelated code.
   * Do not introduce architectural changes.
   * Only add the new landing page and the minimal code necessary to integrate it.

2. Use the PNG as a layout and content reference

   * Recreate the structure, hierarchy, spacing, sections, and overall user experience shown in the PNG.
   * Use the PNG as a reference for content organization and layout.
   * If there are implementation ambiguities, choose the solution that best matches the existing application patterns.

3. Preserve the application's existing design system

   * The PNG may use a different visual style than the current application.
   * Do NOT copy the PNG's colors, fonts, component styling, shadows, border radii, animations, or design tokens if they conflict with the existing application.
   * Instead, adapt the landing page to the application's current design system.
   * Reuse existing colors, typography, spacing scales, components, icons, styling conventions, and design tokens already present in the codebase.
   * Do not invent new design rules, UI patterns, or visual styles.
   * The final result should feel like a natural part of the existing application while preserving the layout and content structure of the PNG.

4. Responsive implementation required

   * The landing page must be fully responsive.
   * Optimize the layout for:

     * Mobile
     * Tablet
     * Desktop/Web
   * Ensure proper spacing, typography scaling, section stacking, and usability across all breakpoints.
   * Follow the application's existing responsive patterns and breakpoint system.

5. Implementation quality

   * Use existing reusable components whenever possible.
   * Follow existing project conventions and coding standards.
   * Keep the implementation clean, maintainable, and consistent with the rest of the codebase.

Before implementing, first analyze the existing application styles, components, typography, colors, spacing system, and responsive patterns. Then recreate the landing page from the PNG using those existing design rules rather than the styling shown in the PNG."

## Codesniper Security Check

FIX 1: JWT Decoded Without Verification in Password Reset
-  The signature was never verified against the secret for passwort reset tokens. So it was very vulnerable to attackers.

FIX 2: Complete Lack of Authentication and Authorization on Socket.io Event Handlers
-  Events such as 'speech' were not authenticated, so anyone could potentially send speech data to the server or hijack sessions.

FIX 3: Insecure Direct Object Reference (IDOR) in Session Retrieval Endpoint
- Unauthorized users could still participate in sessions. There was no Authorization check to verify if the user was the imam or a registered participant.
