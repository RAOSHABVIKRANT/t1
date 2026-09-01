# Tic Tac Toe — LAN Multiplayer

A real-time, two-player Tic Tac Toe game with a polished glassmorphism UI, meant to be hosted from one computer and played by two people on the same Wi‑Fi / local network (phones, laptops, etc. all work — no app install needed, just a browser).

## Requirements
- [Node.js](https://nodejs.org) 16 or newer (v18+ recommended)

## Setup

```bash
cd lan-tic-tac-toe
npm install
npm start
```

You'll see something like:

```
🎮 Tic Tac Toe server running!

   Local:   http://localhost:3000
   Network: http://192.168.1.23:3000

Share the "Network" link with the other player on your Wi-Fi/LAN.
```

## How to play
1. On the **host** machine, open the `Local` link in a browser and click **"Host a new game"**. You'll get a 4-letter room code and a shareable link.
2. On the **other player's** device (phone, tablet, or laptop connected to the **same Wi‑Fi/router**), open the `Network` link shown in the terminal (e.g. `http://192.168.1.23:3000`) and either:
   - Tap the shared link (auto-joins the room), or
   - Enter the 4-letter room code on the lobby screen and hit **Join**.
3. Play! Turns, the win/draw check, animated winning line, and live scoreboard are all synced instantly between both players. Hit **Rematch** to play again — scores carry over.

## Notes
- Both devices must be on the same local network for the `Network` link to work (this won't work over the public internet as-is).
- If a player disconnects, the app will try to auto-reconnect them to the same room.
- A third device opening the same room code will join as a spectator.
- To run on a different port: `PORT=8080 npm start`.

## Tech
Node.js + Express (static hosting) + `ws` (WebSocket) for real-time sync, vanilla HTML/CSS/JS on the frontend — no build step required.

---

## Putting it on GitHub

```bash
cd lan-tic-tac-toe
git init
git add .
git commit -m "Initial commit"
```

Then create a new empty repo on [github.com/new](https://github.com/new) (don't initialize it with a README) and push:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

## Deploying so anyone can play online (not just LAN)

**GitHub Pages can't run this app** — Pages only serves static files (HTML/CSS/JS), but this game needs a live Node.js server to keep both players' moves in sync over WebSockets. Instead, deploy it to a free host that runs Node servers and can pull straight from your GitHub repo. The code already works over HTTPS with no changes — `wss://` is used automatically when the page is served securely.

### Option A — Render (recommended, free, easiest)
1. Push the repo to GitHub (above).
2. Go to [render.com](https://render.com) → **New** → **Web Service** → connect your GitHub repo.
3. Render will detect the included `render.yaml` and auto-fill the build/start commands (`npm install` / `npm start`). Just click **Create Web Service**.
4. After it deploys, you'll get a public URL like `https://lan-tic-tac-toe.onrender.com` — share that instead of the LAN link, and both players can be anywhere, not just the same network.

### Option B — Railway
1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Railway auto-detects Node and runs `npm start`. It assigns a public URL automatically.

### Option C — Fly.io / Glitch
Any host that runs a persistent Node.js process (not just static files) and supports WebSockets will work the same way — connect the GitHub repo, let it run `npm install && npm start`.

> Note: the free tiers of most of these hosts "sleep" the server after a period of inactivity, so the first player to open the link after a while may see a ~10–30 second delay while it wakes up.
