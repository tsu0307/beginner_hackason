
// ============================================================
// DESIGN TOKENS
// ============================================================
export const T = {
  bg:          "#0e0e10",
  surface:     "#161618",
  surface2:    "#1c1c1f",
  border:      "#28282c",
  borderSub:   "#222225",
  text:        "#e4e4e7",
  textSub:     "#a1a1aa",
  textMuted:   "#71717a",
  textFaint:   "#3f3f46",
  accent:      "#c9b99a",
  accentBg:    "rgba(201,185,154,0.08)",
  accentBd:    "rgba(201,185,154,0.22)",
  errorText:   "#f87171",
  errorBg:     "rgba(248,113,113,0.07)",
  errorBd:     "rgba(248,113,113,0.18)",
};

// ============================================================
// CONSTANTS
// ============================================================
export const LVL = { high: "高", medium: "中", low: "低" };
export const HAPP_ICON  = { high: "○", medium: "△", low: "×" };
export const HAPP_LABEL = { high: "充実している", medium: "まあまあ", low: "辛い時期" };

// Muted monochrome badge colors
export const STAB_C = { high: "#a1a1aa", medium: "#71717a", low: "#52525b" };
export const CHAL_C = { high: "#c9b99a", medium: "#a1a1aa", low: "#52525b" };
export const HAPP_C = { high: "#c9b99a", medium: "#a1a1aa", low: "#52525b" };

export const INTERESTS_OPTIONS = ["音楽","映画","読書","旅行","スポーツ","料理","テクノロジー","アート","ゲーム","ファッション","自然・アウトドア","ビジネス","語学","写真","筋トレ","ボランティア","投資","サイエンス","アニメ","ダンス"];
export const PERSONALITY_OPTIONS = ["慎重派","行動派","計画的","直感的","内向的","外向的","論理的","感情的","楽観的","慎重楽観","完璧主義","おおらか","リーダー気質","サポート気質","こだわり強め","柔軟"];

// ============================================================
// PROMPTS
// ============================================================
export function promptBranch(p, event, hist) {
  const h = hist.length ? `\nこれまでの流れ: ${hist.join(" → ")}` : "";
  return {
    sys: `あなたは人生シミュレーターのAIです。必ずJSON形式のみで回答してください。前置きや説明は不要です。\nユーザー: ${p.name}(${p.currentAge}歳), 興味: ${p.values}, 性格: ${p.personality}`,
    msg: `現在の状況:「${event}」${h}\n\n1〜3年後に起こりうる次の展開を2つ生成してください。大きすぎず小さすぎない、自然なペースで人生が進む場面を描いてください。\n- branches[0]: 安定寄り (stability:high, challenge:low〜medium)\n- branches[1]: 挑戦寄り (stability:low〜medium, challenge:high)\n\n{"branches":[{"event":"50字以内","stability":"high","challenge":"low"},{"event":"50字以内","stability":"low","challenge":"high"}]}`,
  };
}

export function promptResult(p, event, hist) {
  const h = hist.slice(-4).join(" → ");
  return {
    sys: `あなたは人生シミュレーターのAIです。必ずJSON形式のみで回答してください。\nユーザー: ${p.name}(${p.currentAge}歳)`,
    msg: `選択:「${event}」\n経緯: ${h}\n\nその選択から1〜2年後の現実を描いてください。変化が少しずつ見えてきた段階で、成果だけでなく葛藤・課題・手応えを含めてください:\n\n{"result":"80〜120字","happiness":"high|medium|low"}`,
  };
}

export function promptStory(p, nodes) {
  const path = nodes
    .map(n => `${n.event}${n.result ? `\n 結果: ${n.result} (幸福度:${LVL[n.happiness] || "?"})` : ""}`)
    .join("\n\n");
  return {
    sys: `あなたは人生ストーリーライターです。${p.name}の選択の歴史を読み返せる物語として要約します。`,
    msg: `以下の選択履歴を200〜300字の物語として要約してください。「充実していた時期」「迷いが大きかった時期」「転換点」などを含む自然な物語に。JSON不要、文章のみ。\n\n${path}`,
  };
}

export function promptFormat(p, input, currentEvent) {
  return {
    sys: `あなたは人生シミュレーターのAIです。必ずJSON形式のみで回答。`,
    msg: `ユーザーの分岐案:「${input}」\n現在:「${currentEvent}」\nユーザー: ${p.name}(${p.currentAge}歳)\n\n整形してJSON:\n{"event":"50字以内","stability":"high|medium|low","challenge":"high|medium|low"}`,
  };
}
