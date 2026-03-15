
export async function gemini(system, userMsg) {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data.content?.find((b) => b.type === "text")?.text || "";
  console.log("[Client] Gemini Raw Response:", text);
  return text;
}
