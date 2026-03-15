import { NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";


export async function POST(req) {
  try {
    const { system, messages, model, max_tokens } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("DEBUG: API key is missing from environment variables.");
      return NextResponse.json({ error: "API key is not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = model || process.env.GEMINI_MODEL || "gemini-2.0-flash";

    // 安全設定を緩和
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    const modelInstance = genAI.getGenerativeModel({
      model: geminiModel,
      systemInstruction: system,
      safetySettings,
    });

    const userMessage = messages.find(m => m.role === "user")?.content || "";

    console.log(`[Gemini Request] Model: ${geminiModel}`);

    // リトライ処理の実装
    let result;
    let lastError;
    const maxRetries = 3;
    const initialDelay = 1000; // 1秒

    for (let i = 0; i < maxRetries; i++) {
      try {
        result = await modelInstance.generateContent({
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: {
            maxOutputTokens: max_tokens || 2000,
            temperature: 0, // 決定論的な出力を得て JSON を安定させる
            responseMimeType: "application/json", // JSON モードを再有効化
          }
        });
        // 成功した場合はループを抜ける
        break;
      } catch (error) {
        lastError = error;
        const status = error.status || (error.response ? error.response.status : null);

        // 429 (Too Many Requests) の場合のみリトライ
        if (status === 429 && i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i); // 指数バックオフ: 1s, 2s, 4s
          console.warn(`Gemini API 429 detected. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // それ以外のエラーまたは最大リトライ回数に達した場合はスロー
        throw error;
      }
    }

    const response = await result.response;
    const text = response.text();
    
    console.log(`[Gemini Response] Length: ${text.length}`);
    console.log("--- RAW RESPONSE START ---");
    console.log(text);
    console.log("--- RAW RESPONSE END ---");

    const formattedResponse = {
      content: [
        { type: "text", text: text }
      ]
    };

    return NextResponse.json(formattedResponse);
  } catch (error) {
    console.error("Gemini API Proxy Error:", error);

    // エラーレスポンスの構築
    const status = error.status || 500;
    let errorMessage = error.message || "Internal Server Error";

    if (status === 429) {
      errorMessage = "Gemini APIの利用制限（レート制限）に達しました。しばらく待ってから再度お試しください。";
    }

    return NextResponse.json({
      error: errorMessage,
      details: error.details || []
    }, { status: status });
  }
}
