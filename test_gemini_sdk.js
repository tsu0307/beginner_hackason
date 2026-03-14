const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");

function loadEnv() {
  const content = fs.readFileSync(".env.local", "utf8");
  const env = {};
  content.split("\n").forEach(line => {
    const [key, ...value] = line.split("=");
    if (key && value) {
      env[key.trim()] = value.join("=").trim();
    }
  });
  return env;
}

async function main() {
  const env = loadEnv();
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in .env.local");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Say 'SDK integration successful!' in Japanese."
    });
    console.log(response.text);
  } catch (error) {
    console.error("Error during SDK test:", error);
  }
}

main();
