TRUTH OR DARE - SERVER VERSION
================================
This folder is the whole game: the app AND the small server that connects your players.

PUT IT ONLINE (free, about 10 minutes)
1. Go to github.com and make a free account. Click the + at the top right, then "New repository".
   Name it truth-or-dare, keep it Public, click "Create repository".
2. Click "uploading an existing file". On your PC, open this folder, select EVERYTHING inside it
   (server.js, package.json, index.html, manifest.webmanifest, sw.js and the icons folder)
   and drag it all onto the GitHub page. Click "Commit changes".
3. Go to render.com and sign up with your GitHub account.
4. Click "New +", then "Web Service", then pick your truth-or-dare repository.
5. Set: Runtime = Node, Build Command = npm install, Start Command = npm start, Instance Type = Free.
   Click "Create Web Service".
6. After a couple of minutes Render shows your link (something.onrender.com). Open it on your phone,
   then Add to Home Screen. Send the same link to your friends.

NOTES
- Free Render servers go to sleep after about 15 minutes with nobody playing. The first open after
  that takes 30 to 60 seconds. Rooms are gone when it sleeps, so just host a new game.
- You can now use the Render link instead of the Netlify one. The Netlify copy will not have online play.
- Test on your PC first (optional): install Node.js, open this folder in a terminal, run: node server.js
  then open http://localhost:3000

IF VIDEO CALLS WON'T CONNECT FOR SOME FRIENDS
Some networks block direct calls and need a relay (TURN). Get free credentials at metered.ca, then in
Render open your service, go to Environment, add a variable named ICE_SERVERS with this kind of value
(use the details Metered gives you):
[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:YOUR-TURN-HOST:443","username":"YOUR-USER","credential":"YOUR-PASS"}]
