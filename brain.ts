import fs from "node:fs";
import { Quote, RawQuoteData } from "./interfaces/interfaces";
import translateText from "./utils/translator";
import { twitter } from "./utils/twitterTokens";
import { startServer } from "./utils/keepAwake";
import cron from "node-cron";

const MAX_TWEET_LENGTH: number = 280;
const MAX_RETRIES: number = 10; // Prevent infinite loop

function formatTweet(quoteData: Quote): string {
  const { quote, philosopher, year, school } = quoteData;
  return `${quote}\n\n— ${philosopher}, ${year}, ${school}`;
}

function getRandomUUIDfromCache(): string {
  const uuids: string[] = JSON.parse(fs.readFileSync("./uuids.json", "utf-8"));
  const randomUUID: string = uuids[Math.floor(Math.random() * uuids.length)]!;
  return randomUUID;
}

async function filterQuoteData(rawData: RawQuoteData): Promise<Quote> {
  const rawSchool: string = rawData.philosopher.school || rawData.school;
  const [esQuote, esSchool] = await Promise.all([
    translateText(rawData.quote),
    translateText(rawSchool),
  ]);

  return {
    year: rawData.year || "Año Desconocido",
    quote: esQuote,
    philosopher: rawData.philosopher.name || rawData.philosopher.wikiTitle,
    school: esSchool,
  };
}

async function fetchRandomQuote(): Promise<Quote> {
  const randomUUID: string = getRandomUUIDfromCache();
  const res: Response = await fetch(
    `https://philosophersapi.com/api/quotes/${randomUUID}`,
  );
  const rawData: RawQuoteData = await res.json();
  const quoteData: Quote = await filterQuoteData(rawData);
  return quoteData;
}

async function twittRandomQuote(attempt: number = 1): Promise<void> {
  if (attempt > MAX_RETRIES) {
    console.error("Too many retries. Skipping this round.");
    return;
  }

  try {
    const randomQuote: Quote = await fetchRandomQuote();
    const tweetText: string = formatTweet(randomQuote);

    if (tweetText.length > MAX_TWEET_LENGTH) {
      console.log(
        `Quote too long (${tweetText.length} chars). Retrying... (${attempt}/${MAX_RETRIES})`,
      );
      return twittRandomQuote(attempt + 1); // Try again
    }

    console.log(`Tweeting (${tweetText.length} chars):`);
    console.log(tweetText);
    await twitter.tweet(tweetText);
    console.log("Tweeted successfully!");
  } catch (error: any) {
    console.error("Failed to tweet:", error?.message || error);
    // Optional: retry on network/auth error
    if (attempt < 3) {
      console.log(`Retrying due to error... (${attempt}/3)`);
      setTimeout(() => twittRandomQuote(attempt + 1), 5000);
    }
  }
}

cron.schedule("0 */2 * * *", () => {
  console.log(`Scheduled tweet at ${new Date().toISOString()}`);
  twittRandomQuote();
});

startServer();
console.log("Bot started! Scheduling quotes every 2 hours.");
twittRandomQuote().catch(console.error);
