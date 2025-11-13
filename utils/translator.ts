import * as deepl from "deepl-node";
import dotenv from "dotenv";
dotenv.config();

const deeplClient = new deepl.DeepLClient(process.env.DEEPL_API_KEY!);

export default async function translateText(enText: string): Promise<string> {
  return (await deeplClient.translateText(enText, "en", "es")).text;
}
