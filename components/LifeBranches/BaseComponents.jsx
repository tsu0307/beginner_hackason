
import { T } from "../../lib/life-branches/config";

/** シンプルなカードコンテナ */
export function Card({ children, style: s, accent }) {
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
export function Field({ label, value, onChange, placeholder, rows, type, hint }) {
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
export function Btn({ children, onClick, variant = "primary", disabled, full, small, style: s }) {
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
export function Badge({ label, color = T.textMuted }) {
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
export function Spinner({ label = "AIが考えています..." }) {
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
export function Label({ children }) {
  return (
    <p style={{ fontSize: "0.72rem", color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 0.5rem" }}>
      {children}
    </p>
  );
}

/** 区切り線 */
export function Divider({ style: s }) {
  return <div style={{ height: 1, background: T.border, margin: "1.25rem 0", ...s }} />;
}

export function TagSelector({ label, hint, options, selected, onChange, max = 4 }) {
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
