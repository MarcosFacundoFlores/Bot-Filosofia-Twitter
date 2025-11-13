import fs from "node:fs";
import { Quote, RawQuoteData } from "./interfaces/interfaces";
import translateText from "./utils/translator";
import { twitter } from "./utils/twitterTokens";
import cron from "node-cron";

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

async function twittRandomQuote() {
  try {
    const randomQuote: Quote = await fetchRandomQuote();
    const twittText: string = formatTweet(randomQuote);
    console.log(twittText);
    twitter.tweet(twittText);
  } catch (e) {
    console.log(e);
  }
}

cron.schedule("0 */2 * * *", twittRandomQuote);

// Keep the process alive (for hosting)
console.log("Bot started! Scheduling quotes every 2 hours.");
twittRandomQuote(); // Run once on start
