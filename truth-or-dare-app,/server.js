// Truth or Dare game server: serves the app and relays messages between players in a room.
// No dependencies. Run with: node server.js
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const PORT = process.env.PORT || 3000;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png" };
const FILES = new Set(["index.html", "manifest.webmanifest", "sw.js", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"]);
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ", MAX_ROOMS = 500, MAX_PLAYERS = 12;
const rooms = new Map();
const rid = () => crypto.randomBytes(6).toString("hex");
const newCode = () => { for (let i = 0; i < 60; i++) { const c = Array.from({ length: 4 }, () => LETTERS[crypto.randomInt(LETTERS.length)]).join(""); if (!rooms.has(c)) return c; } return null; };
const push = (m, o) => { if (m.res) m.res.write("data: " + JSON.stringify(o) + "\n\n"); };
const bcast = (room, o, except) => { for (const [id, m] of room.members) if (id !== except) push(m, o); };
function remove(code, id) {
  const room = rooms.get(code); if (!room || !room.members.has(id)) return;
  const m = room.members.get(id); clearTimeout(m.timer); if (m.res) { try { m.res.end(); } catch (e) {} }
  room.members.delete(id); bcast(room, { sys: "leave", id });
  if (!room.members.size) rooms.delete(code);
}
const add = (code, room) => { const id = rid(); const m = { res: null, timer: setTimeout(() => remove(code, id), 30000) }; room.members.set(id, m); return id; };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };
const json = (res, code, o) => { res.writeHead(code, { "Content-Type": "application/json", ...cors }); res.end(JSON.stringify(o)); };
const body = req => new Promise((ok, no) => { let s = ""; req.on("data", d => { s += d; if (s.length > 65536) { no(new Error("big")); req.destroy(); } }); req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { no(e); } }); req.on("error", no); });
let ICE = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];
try { if (process.env.ICE_SERVERS) ICE = JSON.parse(process.env.ICE_SERVERS); } catch (e) { console.log("ICE_SERVERS is not valid JSON, using defaults"); }

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x"), p = url.pathname;
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  try {
    if (p === "/api/ice") return json(res, 200, { iceServers: ICE });
    if (p === "/api/host" && req.method === "POST") {
      if (rooms.size >= MAX_ROOMS) return json(res, 503, { error: "busy" });
      const code = newCode(); if (!code) return json(res, 503, { error: "busy" });
      const room = { host: null, members: new Map() }; rooms.set(code, room);
      room.host = add(code, room); return json(res, 200, { code, id: room.host });
    }
    if (p === "/api/join" && req.method === "POST") {
      const b = await body(req), code = String(b.code || "").toUpperCase(), room = rooms.get(code);
      if (!room) return json(res, 404, { error: "no such game" });
      if (room.members.size >= MAX_PLAYERS) return json(res, 409, { error: "full" });
      return json(res, 200, { id: add(code, room), host: room.host });
    }
    if (p === "/api/events" && req.method === "GET") {
      const code = url.searchParams.get("room"), id = url.searchParams.get("id"), room = rooms.get(code), m = room && room.members.get(id);
      if (!m) return json(res, 404, { error: "gone" });
      if (m.res) { try { m.res.end(); } catch (e) {} }
      clearTimeout(m.timer); m.res = res;
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no", ...cors });
      res.write("retry: 3000\n\n"); push(m, { sys: "ready" }); bcast(room, { sys: "join", id }, id);
      req.on("close", () => { if (m.res === res) { m.res = null; m.timer = setTimeout(() => remove(code, id), 10000); } });
      return;
    }
    if (p === "/api/send" && req.method === "POST") {
      const b = await body(req), room = rooms.get(b.room);
      if (!room || !room.members.has(b.id)) return json(res, 404, { error: "gone" });
      const msg = { from: b.id, data: b.data };
      if (b.to === "*") bcast(room, msg, b.id); else if (room.members.has(b.to)) push(room.members.get(b.to), msg);
      res.writeHead(204, cors); return res.end();
    }
    if (p === "/api/leave" && req.method === "POST") { const b = await body(req); remove(b.room, b.id); res.writeHead(204, cors); return res.end(); }
    if (req.method === "GET" || req.method === "HEAD") {
      const f = p === "/" ? "index.html" : p.slice(1);
      if (FILES.has(f)) {
        const data = fs.readFileSync(path.join(__dirname, f));
        res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": f === "sw.js" || f === "index.html" ? "no-cache" : "public, max-age=86400" });
        return res.end(req.method === "HEAD" ? undefined : data);
      }
    }
    res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found");
  } catch (e) { try { json(res, 400, { error: "bad request" }); } catch (x) {} }
}).listen(PORT, () => console.log("Truth or Dare is running on port " + PORT));
setInterval(() => { for (const room of rooms.values()) for (const m of room.members.values()) if (m.res) m.res.write(": ping\n\n"); }, 20000);
