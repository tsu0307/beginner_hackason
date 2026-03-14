"use client";

import { useState } from "react";


// ============================================================
// UTILITIES  (unchanged)
// ============================================================
const uid = () => Math.random().toString(36).slice(2, 9);

async function claude(system, userMsg) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
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
// CONSTANTS  (unchanged)
// ============================================================
const LVL = { high: "高", medium: "中", low: "低" };
const HAPP_ICON  = { high: "○", medium: "△", low: "×" };
const HAPP_LABEL = { high: "充実している", medium: "まあまあ", low: "辛い時期" };

// Muted monochrome badge colors
const STAB_C = { high: "#a1a1aa", medium: "#71717a", low: "#52525b" };
const CHAL_C = { high: "#c9b99a", medium: "#a1a1aa", low: "#52525b" };
const HAPP_C = { high: "#c9b99a", medium: "#a1a1aa", low: "#52525b" };

// ============================================================
// PROMPTS  (unchanged)
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

/** シンプルなカードコンテナ */
function Card({ children, style: s, accent }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${accent ? T.accentBd : T.border}`,
      borderRadius: 12,
      padding: "1.5rem",
      ...s,
    }}>
      {children}
    </div>
  );
}

/** テキスト入力・テキストエリア共通 */
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

/** ボタン */
function Btn({ children, onClick, variant = "primary", disabled, full, small, style: s }) {
  const styles = {
    primary: {
      background: T.accent, color: "#0e0e10",
      border: "none", fontWeight: 600,
    },
    secondary: {
      background: "transparent", color: T.textSub,
      border: `1px solid ${T.border}`,
    },
    ghost: {
      background: "transparent", color: T.textMuted,
      border: "none",
    },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        padding: small ? "6px 14px" : "10px 22px",
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: small ? "0.78rem" : "0.88rem",
        transition: "opacity 0.15s, background 0.15s",
        opacity: disabled ? 0.4 : 1,
        width: full ? "100%" : undefined,
        fontFamily: "inherit",
        letterSpacing: "0.01em",
        ...styles[variant],
        ...s,
      }}
    >
      {children}
    </button>
  );
}

/** ラベルバッジ */
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

/** ローディング */
function Spinner({ label = "AIが考えています..." }) {
  return (
    <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", margin: "0 auto 1.25rem",
        border: `2px solid ${T.border}`, borderTopColor: T.accent,
        animation: "spin 0.9s linear infinite",
      }} />
      <p style={{ color: T.textMuted, fontSize: "0.84rem" }}>{label}</p>
    </div>
  );
}

/** セクションラベル（小見出し） */
function Label({ children }) {
  return (
    <p style={{ fontSize: "0.72rem", color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 0.5rem" }}>
      {children}
    </p>
  );
}

/** 区切り線 */
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
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "3.5rem 1.25rem 4rem" }}>
      <div style={{ marginBottom: "2.75rem" }}>
        <p style={{ fontSize: "0.7rem", color: T.textMuted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
          Life Simulator
        </p>
        <h1 style={{ fontSize: "2.2rem", color: T.text, margin: 0, fontWeight: 300, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
          人生の分岐点
        </h1>
        <p style={{ color: T.textMuted, marginTop: "0.9rem", fontSize: "0.86rem", lineHeight: 1.8 }}>
          あなたのプロフィールをもとに、AIが人生の選択肢を生成します。
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
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "3rem 1.25rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Label>Step 1</Label>
        <h2 style={{ fontSize: "1.5rem", color: T.text, margin: "0 0 0.5rem", fontWeight: 400, letterSpacing: "-0.01em" }}>
          人生の分岐点を教えて
        </h2>
        <p style={{ color: T.textMuted, fontSize: "0.84rem", lineHeight: 1.75, margin: 0 }}>
          選択を迫られた出来事を入力してください。
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
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "3rem 1.25rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Label>Step {stepCount + 1}</Label>
        <h2 style={{ fontSize: "1.5rem", color: T.text, margin: "0 0 0.4rem", fontWeight: 400, letterSpacing: "-0.01em" }}>
          2つの分岐
        </h2>
        <p style={{ color: T.textMuted, fontSize: "0.84rem", margin: 0 }}>どちらの道を選びますか？</p>
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
    <div style={{ maxWidth: 530, margin: "0 auto", padding: "3rem 1.25rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", color: T.text, margin: 0, fontWeight: 400, letterSpacing: "-0.01em" }}>
          選択の結果
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
                stroke={sel ? T.accent : T.border}
                strokeWidth={sel ? 1.5 : 1}
                strokeDasharray={sel ? "none" : "4,3"}
              />
            );
          })}
          {allPos.map(node => {
            const pos = positions[node.id];
            const sel = node.selected;
            const hc = node.happiness ? HAPP_C[node.happiness] : null;
            return (
              <g key={node.id}>
                <rect x={pos.x} y={pos.y} width={NW} height={NH} rx={8}
                  fill={sel ? "rgba(201,185,154,0.05)" : T.surface}
                  stroke={sel ? T.accentBd : T.border}
                  strokeWidth={1}
                />
                <foreignObject x={pos.x + 9} y={pos.y + 10} width={NW - 18} height={NH - 18}>
                  <div xmlns="http://www.w3.org/1999/xhtml" style={{
                    fontSize: "10px", lineHeight: "1.55",
                    color: sel ? T.text : T.textMuted,
                    fontFamily: "system-ui",
                    overflow: "hidden", display: "-webkit-box",
                    WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                  }}>
                    {node.event}
                  </div>
                </foreignObject>
                {node.happiness && <text x={pos.x + NW - 12} y={pos.y + NH - 6} fill={HAPP_C[node.happiness]} fontSize="10" fontFamily="system-ui" textAnchor="middle">{HAPP_ICON[node.happiness]}</text>}
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
  const [prevView, setPrevView] = useState("result");

  const currentNode = nodes.find(n => n.id === currentNodeId) || null;
  const selectedNodes = nodes.filter(n => n.selected);
  const stepCount = selectedNodes.length;

  async function doGenBranches(parentNode, prof, history) {
    setLoading(true); setLoadingMsg("分岐を生成しています..."); setError("");
    try {
      const { sys, msg } = promptBranch(prof, parentNode.event, history);
      const text = await claude(sys, msg);
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
      const text = await claude(sys, msg);
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
      const text = await claude(sys, msg);
      setStory(text); setPrevView(view); setView("story");
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
            人生の分岐点
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
