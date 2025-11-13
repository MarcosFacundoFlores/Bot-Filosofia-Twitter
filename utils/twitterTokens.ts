// src/twitterTokens.ts
import { TwitterApi } from "twitter-api-v2";
import dotenv from "dotenv";

dotenv.config();

const CLIENT_ID = process.env.TWITTER_OAUTH2_CLIENT_ID!;
const CLIENT_SECRET = process.env.TWITTER_OAUTH2_CLIENT_ID_SECRET!;
const REFRESH_TOKEN = process.env.TWITTER_REFRESH_TOKEN!;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error("Missing Twitter env vars. Check Render dashboard.");
  process.exit(1);
}

class TwitterClient {
  private client: TwitterApi;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.client = new TwitterApi({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    });
  }

  private async ensureFreshToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt) {
      return this.accessToken;
    }

    console.log("Refreshing access token...");
    try {
      const {
        client: refreshedClient,
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn,
      } = await this.client.refreshOAuth2Token(REFRESH_TOKEN);

      this.accessToken = accessToken;
      this.tokenExpiresAt = now + expiresIn * 1000 - 60_000;
      this.client = refreshedClient;

      // Optional: Log if Twitter rotated refresh token
      if (newRefreshToken && newRefreshToken !== REFRESH_TOKEN) {
        console.log("NEW REFRESH TOKEN ISSUED! Update Render env var:");
        console.log(`TWITTER_REFRESH_TOKEN=${newRefreshToken}`);
        // DO NOT TRY TO WRITE TO .env
      }

      console.log(
        `Access token valid for ${(expiresIn / 3600).toFixed(1)} hours`,
      );
      return accessToken;
    } catch (err: any) {
      console.error("Token refresh failed:", err?.data || err.message);
      process.exit(1);
    }
  }

  public async getClient(): Promise<TwitterApi> {
    await this.ensureFreshToken();
    return this.client;
  }

  public async tweet(text: string): Promise<void> {
    const client = await this.getClient();
    const { data } = await client.v2.tweet(text);
    console.log(`Tweeted! ID: ${data.id}`);
  }
}

export const twitter = new TwitterClient();
