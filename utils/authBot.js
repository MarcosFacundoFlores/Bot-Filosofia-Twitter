// bot.js
require("dotenv").config();
const axios = require("axios");
const qs = require("querystring");

// Environment Variables
const CLIENT_ID = process.env.TWITTER_OAUTH2_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITTER_OAUTH2_CLIENT_ID_SECRET;
const REFRESH_TOKEN = process.env.TWITTER_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error("Missing required environment variables!");
  process.exit(1);
}

// Base64 encode client_id:client_secret
const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
  "base64",
);

let accessToken = null;

// Step 1: Refresh Access Token
async function refreshAccessToken() {
  try {
    const response = await axios.post(
      "https://api.twitter.com/2/oauth2/token",
      qs.stringify({
        refresh_token: REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${authHeader}`,
        },
      },
    );

    accessToken = response.data.access_token;
    console.log("Access token refreshed successfully.");
    return accessToken;
  } catch (error) {
    console.error(
      "Failed to refresh token:",
      error.response?.data || error.message,
    );
    process.exit(1);
  }
}

// Step 2: Post a Tweet as @BotFilosofia
async function postTweet(text) {
  if (!accessToken) {
    await refreshAccessToken();
  }

  try {
    const response = await axios.post(
      "https://api.twitter.com/2/tweets",
      { text },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("Tweet posted successfully!");
    console.log("Tweet ID:", response.data.data.id);
    console.log("Text:", text);
  } catch (error) {
    console.error(
      "Failed to post tweet:",
      error.response?.data || error.message,
    );
  }
}

// === MAIN: Post a test tweet ===
const tweetText =
  "Hello from @BotFilosofia! 🤖 This tweet was posted via OAuth 2.0 in Node.js!";

postTweet(tweetText);
