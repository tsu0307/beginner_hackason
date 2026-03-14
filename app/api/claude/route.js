import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { system, messages, model, max_tokens } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("DEBUG: ANTHROPIC_API_KEY is missing from environment variables.");
      return NextResponse.json({ error: "API key is not configured" }, { status: 500 });
    }
    console.log(`DEBUG: Calling Anthropic with key starting with: ${apiKey.substring(0, 7)}... (length: ${apiKey.length})`);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-3-5-sonnet-20240620",
        max_tokens: max_tokens || 1000,
        system,
        messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Anthropic API Error:", JSON.stringify(errorData, null, 2));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Claude API Proxy Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
