import express, { Express } from "express";

const app: Express = express();
const PORT = process.env.PORT || 3000;

app.get("/ping", (req, res) => {
  res.send("I'm awake! @BotFilosofia is running.");
  console.log(`Ping received at ${new Date().toISOString()}`);
});

app.get("/", (req, res) => {
  res.send(`<h1>@BotFilosofia Bot</h1><p>Ping: <a href="/ping">/ping</a></p>`);
});

// Start server only once
let serverStarted = false;

export function startServer() {
  if (serverStarted) return;
  serverStarted = true;

  app.listen(PORT, () => {
    console.log(`Keep-awake server running on port ${PORT}`);
    console.log(`→ Ping URL: http://localhost:${PORT}/ping`);
  });
}

// Auto-start when executed directly (CommonJS)
if (require.main === module) {
  startServer();
}
