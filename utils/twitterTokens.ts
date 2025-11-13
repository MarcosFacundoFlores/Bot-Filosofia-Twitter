// twitterTokens.ts
import { TwitterApi } from "twitter-api-v2";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

/* ------------------------------------------------------------------ */
/* 1. Environment variables (fail fast if something is missing)     */
/* ------------------------------------------------------------------ */
const CLIENT_ID = process.env.TWITTER_OAUTH2_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITTER_OAUTH2_CLIENT_ID_SECRET;
let REFRESH_TOKEN = process.env.TWITTER_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error(
    "Missing required env vars: TWITTER_OAUTH2_CLIENT_ID, TWITTER_OAUTH2_CLIENT_ID_SECRET, TWITTER_REFRESH_TOKEN",
  );
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 2. Helper – write a new value back to .env                        */
/* ------------------------------------------------------------------ */
function updateEnv(key: string, value: string) {
  const envPath = path.resolve(".env");
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const newLine = `${key}=${value}`;

  if (content.includes(`${key}=`)) {
    content = content.replace(new RegExp(`${key}=.*`), newLine);
  } else {
    content = content.trim() + "\n" + newLine;
  }

  fs.writeFileSync(envPath, content + "\n");
  console.log(`Updated .env → ${key}`);
}

/* ------------------------------------------------------------------ */
/* 3. The real client (singleton)                                    */
/* ------------------------------------------------------------------ */
class TwitterClient {
  private client: TwitterApi;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0; // ms since epoch

  constructor() {
    // Start with the *refresh token* – the library will fetch the first access token for us.
    this.client = new TwitterApi({
      clientId: CLIENT_ID!,
      clientSecret: CLIENT_SECRET!,
    });
  }

  /** Refresh (or fetch the first) access token */
  private async ensureFreshToken(): Promise<string> {
    const now = Date.now();

    // If we already have a valid token → return it
    if (this.accessToken && now < this.tokenExpiresAt) {
      return this.accessToken;
    }

    console.log("Refreshing OAuth2 access token…");
    try {
      const {
        client: refreshedClient,
        accessToken,
        refreshToken,
        expiresIn,
      } = await this.client.refreshOAuth2Token(REFRESH_TOKEN!);

      // Store the new values
      this.accessToken = accessToken;
      this.tokenExpiresAt = now + expiresIn * 1000 - 60_000; // 1 min safety buffer
      this.client = refreshedClient; // important – the lib returns a *new* client instance

      // Twitter may rotate the refresh token – save it if it changed
      if (refreshToken && refreshToken !== REFRESH_TOKEN) {
        REFRESH_TOKEN = refreshToken;
        updateEnv("TWITTER_REFRESH_TOKEN", refreshToken);
      }

      console.log("Access token refreshed (valid for ~2 h)");
      return accessToken;
    } catch (err: any) {
      console.error("Token refresh failed:", err?.data ?? err);
      throw err;
    }
  }

  /** Public method used by other modules */
  public async getClient(): Promise<TwitterApi> {
    await this.ensureFreshToken();
    return this.client;
  }

  /** Convenience – post a tweet directly */
  public async tweet(text: string): Promise<void> {
    const client = await this.getClient();
    const { data } = await client.v2.tweet(text);
    console.log(`Tweeted! ID: ${data.id}`);
  }
}

/* ------------------------------------------------------------------ */
/* 4. Export a **singleton** (so every import gets the same client)   */
/* ------------------------------------------------------------------ */
export const twitter = new TwitterClient();
