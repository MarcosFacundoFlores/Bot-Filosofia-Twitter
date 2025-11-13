// auth.js - FIXED for open v9+
require("dotenv").config();
const axios = require("axios");
const express = require("express");
const crypto = require("crypto");
const open = require("open"); // <-- Correct import

const CLIENT_ID = process.env.TWITTER_OAUTH2_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITTER_OAUTH2_CLIENT_ID_SECRET;
const REDIRECT_URI = "http://localhost:3000/callback";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing CLIENT_ID or CLIENT_SECRET in .env");
  process.exit(1);
}

// PKCE: plain method
const codeVerifier = crypto.randomBytes(32).toString("base64url");
const codeChallenge = codeVerifier;

const app = express();
let server;

// Step 1: Login route
app.get("/login", async (req, res) => {
  const authUrl =
    `https://twitter.com/i/oauth2/authorize?` +
    `response_type=code` +
    `&client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=tweet.read%20tweet.write%20users.read%20offline.access` +
    `&state=state123` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=plain`;

  console.log("Opening Twitter login in your browser...");

  try {
    await open(authUrl); // <-- Now works!
  } catch (err) {
    console.error("Failed to open browser. Manually visit this URL:");
    console.log(authUrl);
  }

  res.send(`
    <h2>Check your browser!</h2>
    <p>Log in as <strong>@BotFilosofia</strong> and authorize the app.</p>
    <p><a href="${authUrl}" target="_blank">Click here if browser didn't open</a></p>
  `);
});

// Step 2: Callback
app.get("/callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code || state !== "state123") {
    return res.status(400).send("Invalid or missing code/state.");
  }

  res.send(`
    <h1>Success!</h1>
    <p>Code received. Getting tokens...</p>
    <p>You can close this tab.</p>
  `);

  await exchangeCodeForTokens(code);
  server.close();
  console.log("Server closed.");
});

// Step 3: Exchange code for tokens
async function exchangeCodeForTokens(code) {
  try {
    const response = await axios.post(
      "https://api.twitter.com/2/oauth2/token",
      new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
        },
      },
    );

    const { access_token, refresh_token } = response.data;

    console.log("\nSUCCESS! Here's your refresh token:\n");
    console.log(`TWITTER_REFRESH_TOKEN=${refresh_token}\n`);
    console.log("Add this to your .env file!");

    // Auto-update .env
    const fs = require("fs");
    const envPath = ".env";
    let envContent = fs.existsSync(envPath)
      ? fs.readFileSync(envPath, "utf8")
      : "";
    const newLine = `TWITTER_REFRESH_TOKEN=${refresh_token}`;

    if (envContent.includes("TWITTER_REFRESH_TOKEN=")) {
      envContent = envContent.replace(/TWITTER_REFRESH_TOKEN=.*/g, newLine);
    } else {
      envContent += `\n${newLine}`;
    }

    fs.writeFileSync(envPath, envContent.trim() + "\n");
    console.log(".env file updated!");
  } catch (error) {
    console.error("Token exchange failed:");
    console.error(error.response?.data || error.message);
  } finally {
    process.exit(0);
  }
}

// Start server
server = app.listen(3000, () => {
  console.log("Go to: http://localhost:3000/login");
  console.log("Or run: npx open http://localhost:3000/login");
});
