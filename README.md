# Zermon

A sermon streaming service that translates spoken turkish into german/english.

## Features

- Real-time speech recognition in Turkish
- Automatic translation to German and English
- Web-based interface for easy access
- Live updates via WebSocket

## Tech Stack

- **Frontend**: Next.js with App Router (Port 5173)
- **Backend**: Express.js with Socket.IO (Port 3001)
- **Translation Service**: LibreTranslate API
- **Speech Recognition**: Web Speech API
- **Design System**: Figma

## Note

This application uses the browser's Web Speech API, which requires microphone access and is supported in modern browsers like Chrome and Edge.

## Braucht eure App SSR/Next.js – oder wäre Vite eigentlich besser geeignet? Begründet anhand von SEO und Interaktivität.

Klar CSR, da Websockets für meine Anwendung wichtig sind und diese besser mit CSR funktionieren. Die SEO ist hierbei zweitrangig, da es sich ohnehin bereits um ein nischiges Produkt handelt, welches somit besser konkurriert.

## Welche Ressourcen hat die App?

/register, /login, /logout, /me, /change-password, /users, /sessions, /translations, /forums, 

Hierarchie: /InputTurkish can only be accessed from the /Imam, who is also the only one who can start a /session
            /Translations can be viewed by everyone

Strukturentscheidung: "Flaches Design mit Query-Parametern", da meine App wenige Daten handelt, sondern der meiste Traffic in Echtzeit passiert.

## Welche Daten in eurer App müssten in der Datenbank liegen – und gibt es Daten, für die Redis oder ein Cloud Object Store (S3) langfristig sinnvoller wären? Begründet in 2–3 Sätzen.

In der Datenbank müssten Userinformationen liegen, da sich diese für eine Datenbank gut eignen. Da meine App viel auf Echtzeit-Traffic basiert, kann man diese Daten auch auf dem Cache speichern, obwohl ich auch überlege, Predigen zu speichern, diese müssten dann ebenfalls in einer Datenbank angelegt sein.

## Welche drei Dinge kann ein anonymer Nutzer mit eurer aktuellen API anstellen, die er nicht dürfte?

1. In dem GET api/users -Protokoll bekommt er alle User angezeigt, was Datenschutztechnisch schwierig wäre.
2. In dem GET api/sessions/:id Protokoll kann er einfach alle IDs durchtesten und somit sich durch Sessions surfen, zu denen er möglicherweise gar keinen Zugriff hat.
3. In dem DELETE api/translations/:id kann er einfach willkürlich Übersetzungen löschen.

## Was passiert, wenn jemand versuchen würde, den JWT-Payload manuell verändert (z.B. die userId auf eine fremde ändert)? Warum funktioniert das nicht?

Wenn Der Angreifer den Payload ändert, stimmt sie nicht mehr mit dem Token überein, da mit verändertem Inhalt (id) eine andere Signatur rauskommen würde und diese abgelehnt werden würde.

## Security Audit: 06-05-2026

Die App hat noch Broken Access Control issues hinsichtlich fehlender Authentifizierung, fehlender Berechtigungseinschränkungen und öffentliche Datenschutzdaten. Zu dem gibt es noch keine passwort strength validation oder rate limiting.

## Test Pyramide
Ebene-Was testen wir?-Tool

Unit-Textverarbeitung-Vitest
Integration-Session-path testen-Vitest
E2E-Login-Flow, Session start/participate-Cypress

Welche zwei Dinge würde am meisten Schaden, wenn es durch den Agenten kaputt geht?
      -Session erstellen und dass man Sessions beitreten kann.


## SSE oder Socket.io?

Gibt es Daten in eurer App, die sich ändern können, während ein anderer Nutzer die Seite offen hat? - Ja, die Forumbeiträge und deren Kommentare, die Live-Sessions, die Stored-Sessions und die Übersetzungen in den Sessions.
Müssen Änderungen sofort sichtbar sein – oder reicht ein Reload? - Also die Übersetzungen aus den Sessions sollte aufjedenfall sofort sichtbar sein, alles andere kann bei einem Reload getätigt werden
Ist die Kommunikation einseitig (Server → Client) oder bidirektional (beide senden)? - Bidirektional, da der Imam auch Information an den Server schickt, der diese dann verteilen soll.
Wie viele Clients könnten gleichzeitig verbunden sein? - Ich wollte den Scope der App eigentlich so setzen, dass Sessions nur lokal mit 3-25 Leuten geschehen, aber mittlerweile entwickelt es sich mehr zu einer Streaming plattform, also kann von 0-200 Leuten sein

Trefft danach eine begründete Technologieentscheidung: Also für die Stored-Sermons reicht SSE, für die Anzeige der Forumbeiträge reicht auch SSE aber für deren Kommentarsektion könnte man Websockets einbauen, und für die Übersetzungen aufjedenfall Websockets.

Kriterium 	      	SSE 	            WebSockets
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

## Deployement-Architektur

Bestandteil 	Läuft als 	      Hostname (Beispiel) 	      Wird ausgeliefert von
Frontend (React) 	statisches Build 	zermon.de 	                  Express
Backend (Express) Node.js-App       zermon.de/api	            konsoleH Node.js
Datenbank (SQL) 	MySQL/MariaDB 	zermonDB (auf dem Server) 	konsoleH DB-Verwaltung

## Codesniper Security Check

FIX 1: JWT Decoded Without Verification in Password Reset
-  The signature was never verified against the secret for passwort reset tokens. So it was very vulnerable to attackers.

FIX 2: Complete Lack of Authentication and Authorization on Socket.io Event Handlers
-  Events such as 'speech' were not authenticated, so anyone could potentially send speech data to the server or hijack sessions.

FIX 3: Insecure Direct Object Reference (IDOR) in Session Retrieval Endpoint
- Unauthorized users could still participate in sessions. There was no Authorization check to verify if the user was the imam or a registered participant.
