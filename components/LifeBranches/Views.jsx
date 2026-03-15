
import { useState } from "react";
import { T, LVL, HAPP_ICON, HAPP_LABEL, STAB_C, CHAL_C, HAPP_C, INTERESTS_OPTIONS, PERSONALITY_OPTIONS } from "../../lib/life-branches/config";
import { Card, Field, Btn, Badge, Label, Divider, TagSelector } from "./BaseComponents";

// ============================================================
// SETUP VIEW
// ============================================================
export function SetupView({ onComplete }) {
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
export function EventInputView({ profile, onSubmit }) {
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
export function BranchCard({ branch, onSelect, index }) {
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
export function BranchesView({ branches, onSelect, onAddCustom, stepCount }) {
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
export function ResultView({ node, onContinue, onViewTree, onViewStory, stepCount }) {
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
export function TreeView({ nodes, onBack, profile }) {
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
export function StoryView({ story, profile, onBack }) {
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
