
export const uid = () => Math.random().toString(36).slice(2, 9);

export function parseJson(text) {
  if (!text) throw new Error("AIからのレスポンスが空です");
  console.log("[parseJson] Raw text:", text);
  let s = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(s);
  } catch (e) {
    console.warn("JSON.parse failed, attempting healing:", text);
    if (s.includes('"branches":') && !s.includes(']}')) {
       if (s.endsWith('"')) s += '}]}';
       else if (s.endsWith(',')) s += '{}]}';
       else s += '"}]}';
       try { return JSON.parse(s); } catch(e3) {}
    }
    const m = s.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch (e2) {}
    }
    console.error("Final parse failure. Text:", text);
    throw new Error(`JSONのパースに失敗しました (内容が途切れている可能性があります)`);
  }
}
