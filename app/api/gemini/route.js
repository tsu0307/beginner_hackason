import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req) {
  try {
    const { system, messages, model, max_tokens } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("DEBUG: API key is missing from environment variables.");
      return NextResponse.json({ error: "API key is not configured" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const geminiModel = model || "gemini-2.0-flash";
    
    // 最初のリクエストを送信する形式に合わせる
    const userMessage = messages.find(m => m.role === "user")?.content || "";

    const response = await ai.models.generateContent({
      model: geminiModel,
      systemInstruction: system,
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: {
        maxOutputTokens: max_tokens || 1000,
        temperature: 0.7,
      }
    });

    const text = response.text || "";
    
    // フロントエンドが期待する Claude 形式のレスポンスに変換
    const formattedResponse = {
      content: [
        { type: "text", text: text }
      ]
    };

    return NextResponse.json(formattedResponse);
  } catch (error) {
    console.error("Gemini API Proxy Error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error.message 
    }, { status: 500 });
  }
}
