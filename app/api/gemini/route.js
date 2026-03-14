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
    const geminiModel = model || "gemini-flash-latest"; 
    
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

    const result = await modelInstance.generateContent({
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: {
        maxOutputTokens: max_tokens || 2000,
        temperature: 0, // 決定論的な出力を得て JSON を安定させる
        responseMimeType: "application/json", // JSON モードを再有効化
      }
    });

    const response = await result.response;
    const text = response.text();
    
    console.log(`[Gemini Response] Length: ${text.length}`);

    const formattedResponse = {
      content: [
        { type: "text", text: text }
      ]
    };

    return NextResponse.json(formattedResponse);
  } catch (error) {
    console.error("Gemini API Proxy Error:", error);
    
    // 404 エラー（モデル未発見）の場合、gemini-pro にフォールバックを試みるなどの処理も検討可能
    const status = error.status || 500;
    const errorMessage = error.message || "Internal Server Error";
    
    return NextResponse.json({ 
      error: errorMessage, 
      details: error.details || [] 
    }, { status: status });
  }
}
