import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";

if (!process.env.ARCJET_KEY && process.env.NODE_ENV !== "test") {
  throw new Error("ARCJET_KEY is not set in .env file");
}

export const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    // Shield protects your app from common attacks e.g. SQL injection
    shield({ mode: "LIVE" }),
    // Create a bot detection rule
    detectBot({
      mode: "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
    }),
    // Rate Limiting
    slidingWindow({
      mode: "LIVE",
      interval: "2s",
      max: 5,
    }),
  ],
});
