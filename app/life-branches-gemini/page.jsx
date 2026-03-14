"use client";

import { useState } from "react";


// ============================================================
// UTILITIES  (Gemini API version)
// ============================================================
const uid = () => Math.random().toString(36).slice(2, 9);
import { GoogleGenAI } from "@google/genai";

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Explain how AI works in a few words",
  });
  console.log(response.text);
}

main();

async function gemini(system, userMsg) {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemini-1.5-flash",
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  // Proxy がすでに Claude 形式に整形してくれていることを想定
  return data.content?.find((b) => b.type === "text")?.text || "";
}

function parseJson(text) {
  const s = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try { return JSON.parse(s); } catch {
    const m = s.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch {}
    throw new Error("JSONのパースに失敗しました");
  }
}

// ============================================================
// DESIGN TOKENS
// ============================================================
const T = {
  bg:          "var(--bg)",
  surface:     "var(--surface)",
  surface2:    "var(--surface-hover)",
  border:      "var(--border)",
  borderSub:   "var(--border)",
  text:        "var(--text)",
  textSub:     "var(--text-sub)",
  textMuted:   "var(--text-muted)",
  textFaint:   "rgba(255,255,255,0.1)",
  accent:      "var(--accent)",
  accentBg:    "var(--accent-dim)",
  accentBd:    "var(--accent-glow)",
  errorText:   "var(--error)",
  errorBg:     "rgba(239, 68, 68, 0.1)",
  errorBd:     "rgba(239, 68, 68, 0.2)",
};

const MOCK_RESPONSE = {
  branch: {
    branches: [
      { event: "地元の伝統工芸を現代風にアレンジする工房を立ち上げ、SNSで話題になる。", stability: "medium", challenge: "high" },
      { event: "大手のデザイン事務所に就職し、安定した環境で基礎からスキルを磨く。", stability: "high", challenge: "low" }
    ]
  },
  result: {
    result: "あなたの選択は予想以上の反響を呼びました。初期の苦労はありましたが、独自の視点が評価され、新しいコミュニティが形成されつつあります。日々に確かな手応えを感じています。",
    happiness: "high"
  },
  story: "あなたは安定よりも自分の直感を信じ、独自の道を切り拓きました。最初は周囲の反対もありましたが、地道な努力と創造性が実を結び、現在では多くの人々にインスピレーションを与える存在となっています。"
};

// ============================================================
// CONSTANTS
// ============================================================
const LVL = { high: "高", medium: "中", low: "低" };
const HAPP_ICON  = { high: "○", medium: "△", low: "×" };
const HAPP_LABEL = { high: "充実している", medium: "まあまあ", low: "辛い時期" };

const STAB_C = { high: "#a1a1aa", medium: "#71717a", low: "#52525b" };
const CHAL_C = { high: "#c9b99a", medium: "#a1a1aa", low: "#52525b" };
const HAPP_C = { high: "#c9b99a", medium: "#a1a1aa", low: "#52525b" };

// ============================================================
// PROMPTS
// ============================================================
function promptBranch(p, event, hist) {
  const h = hist.length ? `\nこれまでの流れ: ${hist.join(" → ")}` : "";
  return {
    sys: `あなたは人生シミュレーターのAIです。必ずJSON形式のみで回答してください。前置きや説明は不要です。\nユーザー: ${p.name}(${p.currentAge}歳), 興味: ${p.values}, 性格: ${p.personality}`,
    msg: `現在の状況:「${event}」${h}\n\n1〜3年後に起こりうる次の展開を2つ生成してください。大きすぎず小さすぎない、自然なペースで人生が進む場面を描いてください。\n- branches[0]: 安定寄り (stability:high, challenge:low〜medium)\n- branches[1]: 挑戦寄り (stability:low〜medium, challenge:high)\n\n{"branches":[{"event":"50字以内","stability":"high","challenge":"low"},{"event":"50字以内","stability":"low","challenge":"high"}]}`,
  };
}

function promptResult(p, event, hist) {
  const h = hist.slice(-4).join(" → ");
  return {
    sys: `あなたは人生シミュレーターのAIです。必ずJSON形式のみで回答してください。\nユーザー: ${p.name}(${p.currentAge}歳)`,
    msg: `選択:「${event}」\n経緯: ${h}\n\nその選択から1〜2年後の現実を描いてください。変化が少しずつ見えてきた段階で、成果だけでなく葛藤・課題・手応えを含めてください:\n\n{"result":"80〜120字","happiness":"high|medium|low"}`,
  };
}

function promptStory(p, nodes) {
  const path = nodes
    .map(n => `${n.event}${n.result ? `\n 結果: ${n.result} (幸福度:${LVL[n.happiness] || "?"})` : ""}`)
    .join("\n\n");
  return {
    sys: `あなたは人生ストーリーライターです。${p.name}の選択の歴史を読み返せる物語として要約します。`,
    msg: `以下の選択履歴を200〜300字の物語として要約してください。「充実していた時期」「迷いが大きかった時期」「転換点」などを含む自然な物語に。JSON不要、文章のみ。\n\n${path}`,
  };
}

function promptFormat(p, input, currentEvent) {
  return {
    sys: `あなたは人生シミュレーターのAIです。必ずJSON形式のみで回答。`,
    msg: `ユーザーの分岐案:「${input}」\n現在:「${currentEvent}」\nユーザー: ${p.name}(${p.currentAge}歳)\n\n整形してJSON:\n{"event":"50字以内","stability":"high|medium|low","challenge":"high|medium|low"}`,
  };
}

// ============================================================
// BASE COMPONENTS
// ============================================================
function Card({ children, style: s, accent }) {
  return (
    <div style={{
      background: T.surface,
      backdropFilter: "var(--glass-blur)",
      WebkitBackdropFilter: "var(--glass-blur)",
      border: `1px solid ${accent ? "var(--border-strong)" : T.border}`,
      borderRadius: 16,
      padding: "1.75rem",
      boxShadow: "var(--shadow-sm)",
      ...s,
    }} className="fade-in">
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, rows, type, hint }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {label && (
        <label style={{ display: "block", marginBottom: 6, color: T.textSub, fontSize: "0.8rem", letterSpacing: "0.02em" }}>
          {label}
        </label>
      )}
      {rows ? (
        <textarea
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} rows={rows}
          style={fieldStyle()}
        />
      ) : (
        <input
          type={type || "text"} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...fieldStyle(), resize: undefined }}
        />
      )}
      {hint && <p style={{ marginTop: 5, fontSize: "0.74rem", color: T.textMuted }}>{hint}</p>}
    </div>
  );
}

function fieldStyle() {
  return {
    width: "100%", padding: "10px 13px",
    background: T.surface2,
    border: `1px solid ${T.border}`,
    borderRadius: 8, color: T.text, fontSize: "0.92rem",
    outline: "none", boxSizing: "border-box",
    fontFamily: "inherit", resize: "vertical",
    transition: "border-color 0.15s",
  };
}

function Btn({ children, onClick, variant = "primary", disabled, full, small, style: s }) {
  const [hov, setHov] = useState(false);
  const styles = {
    primary: {
      background: "var(--accent)", color: "#0a0a0c",
      border: "none", fontWeight: 600,
      boxShadow: hov ? "0 0 20px var(--accent-glow)" : "none",
    },
    secondary: {
      background: "transparent", color: "var(--text)",
      border: `1px solid var(--border-strong)`,
    },
    ghost: {
      background: "transparent", color: "var(--text-muted)",
      border: "none",
    },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: small ? "7px 16px" : "12px 24px",
        borderRadius: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: small ? "0.78rem" : "0.9rem",
        transition: "var(--transition)",
        opacity: disabled ? 0.4 : 1,
        width: full ? "100%" : undefined,
        fontFamily: "inherit",
        letterSpacing: "0.02em",
        transform: hov && !disabled ? "scale(1.02)" : "scale(1)",
        ...styles[variant],
        ...s,
      }}
    >
      {children}
    </button>
  );
}

function Badge({ label, color = T.textMuted }) {
  return (
    <span style={{
      padding: "3px 9px", borderRadius: 4, fontSize: "0.72rem",
      color, background: color + "14",
      border: `1px solid ${color}28`,
      letterSpacing: "0.02em", whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

function Spinner({ label = "AIが可能性を紡いでいます..." }) {
  return (
    <div style={{ textAlign: "center", padding: "6rem 1rem", animation: "fadeIn 0.5s ease-out" }}>
      <div style={{ position: "relative", width: 40, height: 40, margin: "0 auto 2rem" }}>
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
          borderRadius: "50%", border: "2px solid var(--border)",
        }} />
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
          borderRadius: "50%", border: "2px solid transparent", borderTopColor: "var(--accent)",
          animation: "spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite",
        }} />
      </div>
      <p style={{ color: "var(--text-sub)", fontSize: "0.9rem", fontWeight: 300, letterSpacing: "0.05em" }}>{label}</p>
    </div>
  );
}

function Label({ children }) {
  return (
    <p style={{ fontSize: "0.72rem", color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 0.5rem" }}>
      {children}
    </p>
  );
}

function Divider({ style: s }) {
  return <div style={{ height: 1, background: T.border, margin: "1.25rem 0", ...s }} />;
}

// ============================================================
// TAG SELECTOR
// ============================================================
const INTERESTS_OPTIONS = ["音楽","映画","読書","旅行","スポーツ","料理","テクノロジー","アート","ゲーム","ファッション","自然・アウトドア","ビジネス","語学","写真","筋トレ","ボランティア","投資","サイエンス","アニメ","ダンス"];
const PERSONALITY_OPTIONS = ["慎重派","行動派","計画的","直感的","内向的","外向的","論理的","感情的","楽観的","慎重楽観","完璧主義","おおらか","リーダー気質","サポート気質","こだわり強め","柔軟"];

function TagSelector({ label, hint, options, selected, onChange, max = 4 }) {
  const toggle = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter(s => s !== opt));
    else if (selected.length < max) onChange([...selected, opt]);
  };
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <label style={{ fontSize: "0.8rem", color: T.textSub, letterSpacing: "0.02em" }}>{label}</label>
        <span style={{ fontSize: "0.72rem", color: T.textFaint }}>
          {selected.length} / {max}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map(opt => {
          const sel = selected.includes(opt);
          const full = !sel && selected.length >= max;
          return (
            <button key={opt} onClick={() => toggle(opt)} style={{
              padding: "5px 12px", borderRadius: 6, fontSize: "0.78rem",
              cursor: full ? "default" : "pointer", transition: "all 0.13s",
              border: `1px solid ${sel ? T.accent : T.border}`,
              background: sel ? T.accentBg : "transparent",
              color: sel ? T.accent : full ? T.textFaint : T.textSub,
              fontFamily: "inherit",
            }}>
              {opt}
            </button>
          );
        })}
      </div>
      {hint && <p style={{ marginTop: 6, fontSize: "0.74rem", color: T.textMuted }}>{hint}</p>}
    </div>
  );
}

// ============================================================
// SETUP VIEW
// ============================================================
function SetupView({ onComplete }) {
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState(String(new Date().getFullYear() - 23));
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedPersonality, setSelectedPersonality] = useState([]);
  const age = new Date().getFullYear() - parseInt(birthYear || "0");
  const valid = name.trim() && selectedInterests.length > 0 && selectedPersonality.length > 0 && age > 0 && age < 100;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "4rem 1.5rem 6rem", animation: "fadeIn 0.8s ease-out" }}>
      <div style={{ marginBottom: "3.5rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.75rem", color: "var(--accent)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "1rem" }}>
          Life Simulator
        </p>
        <h1 style={{ fontSize: "3rem", color: "var(--text)", margin: 0, fontWeight: 300, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
          人生の分岐点
        </h1>
        <div style={{ width: 40, height: 2, background: "var(--accent)", margin: "1.5rem auto" }} />
        <p style={{ color: "var(--text-sub)", marginTop: "1rem", fontSize: "0.95rem", lineHeight: 1.8, maxWidth: "400px", margin: "0 auto" }}>
          あなたのプロフィールをもとに、AIがまだ見ぬ人生の可能性を紡ぎ出します。
        </p>
      </div>

      <Card>
        <Field label="名前" value={name} onChange={setName} placeholder="山田 太郎" />
        <Field label="生まれ年" value={birthYear} onChange={setBirthYear} placeholder="2001" type="number"
          hint={age > 0 && age < 100 ? `現在 ${age} 歳` : undefined} />
        <Divider />
        <TagSelector
          label="興味のあるもの"
          hint="最大4つまで選択できます"
          options={INTERESTS_OPTIONS}
          selected={selectedInterests}
          onChange={setSelectedInterests}
          max={4}
        />
        <TagSelector
          label="自分の性格・傾向"
          hint="最大3つまで選択できます"
          options={PERSONALITY_OPTIONS}
          selected={selectedPersonality}
          onChange={setSelectedPersonality}
          max={3}
        />
        <Divider style={{ marginTop: "0.5rem" }} />
        <Btn
          onClick={() => valid && onComplete({
            name: name.trim(), birthYear: parseInt(birthYear), currentAge: age,
            values: selectedInterests.join("・"), personality: selectedPersonality.join("・"),
          })}
          disabled={!valid} full
        >
          シミュレーションを開始する
        </Btn>
      </Card>
    </div>
  );
}

// ============================================================
// EVENT INPUT VIEW
// ============================================================
function EventInputView({ profile, onSubmit }) {
  const [event, setEvent] = useState("");

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "4rem 1.5rem", animation: "fadeIn 0.6s ease-out" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <Label>Step 1</Label>
        <h2 style={{ fontSize: "2rem", color: "var(--text)", margin: "0 0 0.75rem", fontWeight: 400 }}>
          人生の分岐点を描く
        </h2>
        <p style={{ color: "var(--text-sub)", fontSize: "0.9rem", lineHeight: 1.8, margin: 0 }}>
          あなたの人生において、重要だった決断や、これから起こりうる選択を教えてください。
        </p>
      </div>

      <Card>
        <Field
          label="分岐点となった出来事"
          value={event} onChange={setEvent}
          placeholder="例：大学卒業後、第一志望の内定を得たが、海外留学の機会も生まれ、どちらを選ぶか迷っている。"
          rows={4}
          hint="進学・就職・転職・留学・起業・恋愛など"
        />
        <Btn onClick={() => event.trim() && onSubmit(event.trim())} disabled={!event.trim()} full>
          分岐を生成する
        </Btn>
      </Card>
    </div>
  );
}

// ============================================================
// BRANCH CARD
// ============================================================
function BranchCard({ branch, onSelect, index }) {
  const [hov, setHov] = useState(false);
  const isStable = branch.stability === "high" || (branch.stability !== "low" && branch.challenge !== "high");
  const typeLabel = isStable ? "安定ルート" : "挑戦ルート";

  return (
    <div
      onClick={() => onSelect(branch)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? T.surface2 : T.surface,
        border: `1px solid ${hov ? T.accentBd : T.border}`,
        borderRadius: 12, padding: "1.4rem",
        cursor: "pointer", transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.9rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.68rem", color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Option {index + 1}
          </span>
          <span style={{ width: 1, height: 11, background: T.border, display: "inline-block" }} />
          <span style={{ fontSize: "0.72rem", color: isStable ? T.textSub : T.accent }}>
            {typeLabel}
          </span>
        </div>
      </div>

      <p style={{ fontSize: "0.96rem", lineHeight: 1.8, color: T.text, margin: "0 0 1rem" }}>
        {branch.event}
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <Badge label={`安定 ${LVL[branch.stability]}`} color={STAB_C[branch.stability]} />
          <Badge label={`挑戦 ${LVL[branch.challenge]}`} color={CHAL_C[branch.challenge]} />
        </div>
        <span style={{ fontSize: "0.78rem", color: hov ? T.accent : T.textFaint, transition: "color 0.15s" }}>
          選ぶ →
        </span>
      </div>
    </div>
  );
}

// ============================================================
// BRANCHES VIEW
// ============================================================
function BranchesView({ branches, onSelect, onAddCustom, currentNode, stepCount }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [addError, setAddError] = useState("");

  const handleAdd = () => {
    if (!customInput.trim()) return;
    try { onAddCustom(customInput.trim()); setCustomInput(""); setShowCustom(false); }
    catch { setAddError("追加に失敗しました。もう一度お試しください。"); }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "4rem 1.5rem", animation: "fadeIn 0.6s ease-out" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <Label>Step {stepCount + 1}</Label>
        <h2 style={{ fontSize: "2rem", color: "var(--text)", margin: "0 0 0.5rem", fontWeight: 400 }}>
          選ぶべき二つの路
        </h2>
        <p style={{ color: "var(--text-sub)", fontSize: "0.9rem", margin: 0 }}>どちらの可能性を探索しますか？</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {branches.map((b, i) => <BranchCard key={b.id} branch={b} onSelect={onSelect} index={i} />)}
      </div>

      {!showCustom ? (
        <Btn variant="ghost" onClick={() => setShowCustom(true)} small>
          + 自分で分岐を追加する
        </Btn>
      ) : (
        <Card style={{ marginTop: 4 }}>
          <Field
            label="別の選択肢"
            value={customInput} onChange={setCustomInput}
            placeholder="例：思い切って起業の道を選ぶ"
            rows={2}
          />
          {addError && <p style={{ color: T.errorText, fontSize: "0.8rem", marginBottom: 10 }}>{addError}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={handleAdd} disabled={!customInput.trim()}>追加する</Btn>
            <Btn variant="secondary" onClick={() => { setShowCustom(false); setCustomInput(""); }}>
              キャンセル
            </Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// RESULT VIEW
// ============================================================
function ResultView({ node, onContinue, onViewTree, onViewStory, stepCount }) {
  const hc = HAPP_C[node.happiness] || T.textSub;
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "4rem 1.5rem", animation: "fadeIn 0.6s ease-out" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "2rem", color: "var(--text)", margin: 0, fontWeight: 400 }}>
          辿り着いた未来
        </h2>
      </div>

      <Card style={{ marginBottom: "0.75rem" }}>
        <Label>選んだ道</Label>
        <p style={{ fontSize: "0.96rem", color: T.accent, lineHeight: 1.8, margin: 0 }}>{node.event}</p>
      </Card>

      <Card style={{ marginBottom: "0.75rem" }}>
        <Label>その後の現実</Label>
        <p style={{ fontSize: "0.94rem", lineHeight: 1.9, color: T.text, margin: 0 }}>{node.result}</p>
      </Card>

      <Card accent style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "1.4rem", color: hc, flexShrink: 0, fontFamily: "monospace" }}>
            {HAPP_ICON[node.happiness]}
          </span>
          <div>
            <Label>この時期の幸福度</Label>
            <p style={{ color: hc, fontSize: "0.94rem", margin: 0, fontWeight: 500 }}>
              {LVL[node.happiness]} — {HAPP_LABEL[node.happiness]}
            </p>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <Btn onClick={onContinue} full>この先の人生を続ける</Btn>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Btn variant="secondary" onClick={onViewTree} style={{ flex: 1 }}>人生ツリー</Btn>
          {stepCount >= 2 && (
            <Btn variant="secondary" onClick={onViewStory} style={{ flex: 1 }}>ストーリー要約</Btn>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TREE VIEW
// ============================================================
function TreeView({ nodes, onBack, profile }) {
  const root = nodes.find(n => n.parentId === null);
  if (!root) return null;

  function buildChain(start) {
    const ch = [start]; let cur = start;
    while (true) {
      const nxt = nodes.find(n => n.parentId === cur.id && n.selected);
      if (!nxt) break; ch.push(nxt); cur = nxt;
    }
    return ch;
  }

  const chain = buildChain(root);
  const NW = 160, NH = 84, HG = 44, VG = 12, PAD = 20;
  const positions = {};

  chain.forEach((node, xi) => {
    const x = PAD + xi * (NW + HG);
    positions[node.id] = { x, y: PAD };
    const unselCh = nodes.filter(n => n.parentId === node.id && !n.selected);
    const nextX = PAD + (xi + 1) * (NW + HG);
    unselCh.forEach((child, ji) => {
      positions[child.id] = { x: nextX, y: PAD + (ji + 1) * (NH + VG) };
    });
  });

  const allPos = nodes.filter(n => positions[n.id]);
  const maxY = Math.max(...allPos.map(n => positions[n.id].y + NH));
  const svgW = PAD * 2 + chain.length * (NW + HG);
  const svgH = maxY + PAD;

  return (
    <div style={{ padding: "2rem 1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.75rem" }}>
        <Btn variant="ghost" onClick={onBack} small>← 戻る</Btn>
        <div>
          <h2 style={{ fontSize: "1.3rem", color: T.text, margin: 0, fontWeight: 400 }}>人生ツリー</h2>
          <p style={{ color: T.textMuted, fontSize: "0.78rem", margin: "3px 0 0" }}>{profile.name}の選択の記録</p>
        </div>
      </div>

      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "65vh", borderRadius: 8 }}>
        <svg width={Math.max(svgW, 300)} height={Math.max(svgH, 120)} style={{ display: "block" }}>
          {allPos.map(node => {
            if (!node.parentId || !positions[node.parentId]) return null;
            const p = positions[node.parentId], c = positions[node.id];
            const px = p.x + NW, py = p.y + NH / 2, cx = c.x, cy = c.y + NH / 2;
            const sel = node.selected;
            return (
              <path key={`e-${node.id}`}
                d={`M${px},${py} C${px + HG / 2},${py} ${cx - HG / 2},${cy} ${cx},${cy}`}
                fill="none"
                stroke={sel ? "var(--accent)" : "var(--border)"}
                strokeWidth={sel ? 2 : 1}
                strokeDasharray={sel ? "none" : "4,4"}
                style={{ opacity: sel ? 1 : 0.4 }}
              />
            );
          })}
          {allPos.map(node => {
            const pos = positions[node.id];
            const sel = node.selected;
            const hc = node.happiness ? HAPP_C[node.happiness] : null;
            return (
              <g key={node.id} className="fade-in">
                <rect x={pos.x} y={pos.y} width={NW} height={NH} rx={12}
                  fill={sel ? "rgba(var(--accent-rgb), 0.08)" : "var(--surface)"}
                  stroke={sel ? "var(--accent)" : "var(--border)"}
                  strokeWidth={sel ? 1.5 : 1}
                  style={{ backdropFilter: "var(--glass-blur)" }}
                />
                <foreignObject x={pos.x + 12} y={pos.y + 12} width={NW - 24} height={NH - 24}>
                  <div xmlns="http://www.w3.org/1999/xhtml" style={{
                    fontSize: "10.5px", lineHeight: "1.6",
                    color: sel ? "var(--text)" : "var(--text-muted)",
                    fontFamily: "var(--font-inter)",
                    overflow: "hidden", display: "-webkit-box",
                    WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                  }}>
                    {node.event}
                  </div>
                </foreignObject>
                {node.happiness && (
                  <g>
                    <circle cx={pos.x + NW - 12} cy={pos.y + NH - 12} r="8" fill="var(--bg)" stroke="var(--border)" strokeWidth="0.5" />
                    <text x={pos.x + NW - 12} y={pos.y + NH - 9} fill={HAPP_C[node.happiness]} fontSize="9" fontFamily="sans-serif" textAnchor="middle">{HAPP_ICON[node.happiness]}</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ marginTop: "1.25rem", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        {[
          { line: true, sel: true, label: "選択したルート" },
          { line: true, sel: false, label: "選ばなかったルート" },
          { symbol: "○", color: HAPP_C.high, label: "幸福度 高" },
          { symbol: "△", color: HAPP_C.medium, label: "幸福度 中" },
          { symbol: "×", color: HAPP_C.low, label: "幸福度 低" },
        ].map((item, i) => (
          <span key={i} style={{ color: T.textMuted, fontSize: "0.72rem", display: "flex", alignItems: "center", gap: 7 }}>
            {item.symbol
              ? <span style={{ color: item.color, fontFamily: "system-ui", fontSize: "0.82rem" }}>{item.symbol}</span>
              : <span style={{ width: 20, height: 1, background: item.sel ? T.accent : T.border, display: "inline-block", borderTop: item.sel ? "none" : `1px dashed ${T.border}` }} />
            }
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// STORY VIEW
// ============================================================
function StoryView({ story, profile, onBack }) {
  return (
    <div style={{ maxWidth: 540, margin: "0 auto", padding: "3rem 1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <Btn variant="ghost" onClick={onBack} small>← 戻る</Btn>
        <div>
          <h2 style={{ fontSize: "1.3rem", color: T.text, margin: 0, fontWeight: 400 }}>人生ストーリー</h2>
          <p style={{ color: T.textMuted, fontSize: "0.78rem", margin: "3px 0 0" }}>{profile.name}の歩み</p>
        </div>
      </div>
      <Card accent>
        <p style={{ fontSize: "0.96rem", lineHeight: 2.1, color: T.text, whiteSpace: "pre-wrap", margin: 0 }}>
          {story}
        </p>
      </Card>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [view, setView] = useState("setup");
  const [profile, setProfile] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("AIが考えています...");
  const [error, setError] = useState("");
  const [story, setStory] = useState("");
  const [useMock, setUseMock] = useState(true); // Default to Mock for development
  const [prevView, setPrevView] = useState("result");

  async function callAI(sys, msg, type) {
    if (useMock) {
      await new Promise(r => setTimeout(r, 1000));
      return JSON.stringify(MOCK_RESPONSE[type] || { text: MOCK_RESPONSE.story });
    }
    return await gemini(sys, msg);
  }

  const currentNode = nodes.find(n => n.id === currentNodeId) || null;
  const selectedNodes = nodes.filter(n => n.selected);
  const stepCount = selectedNodes.length;

  async function doGenBranches(parentNode, prof, history) {
    setLoading(true); setLoadingMsg("分岐を生成しています..."); setError("");
    try {
      const { sys, msg } = promptBranch(prof, parentNode.event, history);
      const text = await callAI(sys, msg, "branch");
      const parsed = parseJson(text);
      if (!parsed?.branches?.length) throw new Error("Invalid response");
      const nb = parsed.branches.map(b => ({
        ...b, id: uid(), parentId: parentNode.id, selected: false,
      }));
      setBranches(nb); setView("branches");
    } catch {
      setError("分岐の生成に失敗しました。もう一度お試しください。");
    } finally { setLoading(false); }
  }

  async function handleEventSubmit(event) {
    const rootNode = {
      id: uid(), event, stability: "medium", challenge: "medium",
      parentId: null, selected: true,
    };
    setNodes([rootNode]); setCurrentNodeId(rootNode.id);
    await doGenBranches(rootNode, profile, []);
  }

  async function handleSelectBranch(branch) {
    setLoading(true); setLoadingMsg("結果を生成しています..."); setError("");
    try {
      const history = nodes.filter(n => n.selected).map(n => n.event);
      const { sys, msg } = promptResult(profile, branch.event, history);
      const text = await callAI(sys, msg, "result");
      const parsed = parseJson(text);
      const sel = { ...branch, result: parsed.result || "結果を取得できませんでした", happiness: parsed.happiness || "medium", selected: true };
      const others = branches.filter(b => b.id !== branch.id);
      setNodes([...nodes, sel, ...others]); setCurrentNodeId(sel.id); setBranches([]); setView("result");
    } catch {
      setError("結果の生成に失敗しました。もう一度お試しください。");
    } finally { setLoading(false); }
  }

  function handleAddCustomBranch(input) {
    const parentId = branches[0]?.parentId;
    const parentNode = nodes.find(n => n.id === parentId) || currentNode;
    if (!parentNode) throw new Error("親ノードが見つかりません");
    const custom = {
      id: uid(), parentId: parentNode.id, selected: false,
      event: input, stability: "medium", challenge: "medium",
    };
    setBranches(prev => [...prev, custom]);
  }

  async function handleContinue() {
    if (!currentNode) return;
    const history = nodes.filter(n => n.selected).map(n => n.event);
    await doGenBranches(currentNode, profile, history);
  }

  async function handleGenerateStory() {
    setLoading(true); setLoadingMsg("ストーリーを生成しています..."); setError("");
    try {
      const { sys, msg } = promptStory(profile, nodes.filter(n => n.selected));
      const text = await callAI(sys, msg, "story");
      setStory(text.startsWith("{") ? JSON.parse(text).text : text); 
      setView("story");
    } catch {
      setError("ストーリーの生成に失敗しました。");
    } finally { setLoading(false); }
  }

  function goToTree() { setPrevView(view); setView("tree"); }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "-apple-system,BlinkMacSystemFont,'Hiragino Sans','Yu Gothic UI',sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        ::placeholder { color: ${T.textFaint} !important; }
        input:focus, textarea:focus { border-color: ${T.accentBd} !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .fade { animation: fadeIn 0.25s ease both; }
        button { font-family: inherit; }
      `}</style>

      {/* Header */}
      {view !== "setup" && (
        <header style={{
          height: 52, padding: "0 1.5rem",
          borderBottom: `1px solid ${T.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "sticky", top: 0, zIndex: 10,
          background: T.bg,
        }}>
          <span style={{ fontSize: "0.82rem", color: T.textSub, letterSpacing: "0.02em" }}>
            人生の分岐点 (Gemini)
          </span>
          {profile && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {view !== "input" && (
                <>
                  <Btn variant="ghost" onClick={goToTree} small>ツリー</Btn>
                  {stepCount >= 2 && (
                    <Btn variant="ghost" onClick={handleGenerateStory} disabled={loading} small>ストーリー</Btn>
                  )}
                </>
              )}
              <span style={{ width: 1, height: 14, background: T.border, display: "inline-block", margin: "0 2px" }} />
              <span style={{ color: T.textFaint, fontSize: "0.76rem" }}>
                {profile.name} · {stepCount}選択
              </span>
              <Btn 
                variant="ghost" 
                small 
                onClick={() => setUseMock(!useMock)}
                style={{ color: useMock ? "var(--success)" : "var(--text-muted)", fontSize: "0.65rem", padding: "4px 8px" }}
              >
                {useMock ? "MOCK ON" : "MOCK OFF"}
              </Btn>
            </div>
          )}
        </header>
      )}

      {/* Error */}
      {error && (
        <div style={{
          margin: "0.75rem 1.25rem", padding: "0.8rem 1rem",
          background: T.errorBg, border: `1px solid ${T.errorBd}`,
          borderRadius: 8, color: T.errorText, fontSize: "0.82rem",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", padding: "0 4px", fontSize: "1rem" }}>×</button>
        </div>
      )}

      {/* Views */}
      <div className="fade" key={view}>
        {view === "setup" && <SetupView onComplete={p => { setProfile(p); setView("input"); }} />}

        {view === "input" && (loading ? <Spinner label={loadingMsg} /> : <EventInputView profile={profile} onSubmit={handleEventSubmit} />)}

        {view === "branches" && (loading ? <Spinner label={loadingMsg} /> : <BranchesView branches={branches} onSelect={handleSelectBranch} onAddCustom={handleAddCustomBranch} currentNode={currentNode} stepCount={stepCount} />)}

        {view === "result" && currentNode && (loading ? <Spinner label={loadingMsg} /> : <ResultView node={currentNode} onContinue={handleContinue} onViewTree={goToTree} onViewStory={handleGenerateStory} stepCount={stepCount} />)}

        {view === "tree" && <TreeView nodes={nodes} onBack={() => setView(prevView || "result")} profile={profile} />}

        {view === "story" && (loading ? <Spinner label={loadingMsg} /> : <StoryView story={story} profile={profile} onBack={() => setView("result")} />)}
      </div>
    </div>
  );
}
