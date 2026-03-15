"use client";

import { useState } from "react";
import { T, promptBranch, promptResult, promptStory } from "../../lib/life-branches/config";
import { uid, parseJson } from "../../lib/life-branches/utils";
import { gemini } from "../../lib/life-branches/api";
import { Spinner } from "../../components/LifeBranches/BaseComponents";
import { SetupView, EventInputView, BranchesView, ResultView, TreeView, StoryView } from "../../components/LifeBranches/Views";

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
      const text = await gemini(sys, msg);
      const parsed = parseJson(text);
      if (!parsed?.branches?.length) throw new Error("Invalid response");
      const nb = parsed.branches.map(b => ({
        ...b, id: uid(), parentId: parentNode.id, selected: false,
      }));
      setBranches(nb); setView("branches");
    } catch (err) {
      setError(`分岐の生成に失敗しました: ${err.message}`);
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
      const text = await gemini(sys, msg);
      const parsed = parseJson(text);
      const sel = { ...branch, result: parsed.result || "結果を取得できませんでした", happiness: parsed.happiness || "medium", selected: true };
      const others = branches.filter(b => b.id !== branch.id);
      setNodes([...nodes, sel, ...others]); setCurrentNodeId(sel.id); setBranches([]); setView("result");
    } catch (err) {
      setError(`結果の生成に失敗しました: ${err.message}`);
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
      const text = await gemini(sys, msg);
      setStory(text); setPrevView(view); setView("story");
    } catch (err) {
      setError(`ストーリーの生成に失敗しました: ${err.message}`);
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
               <span style={{ fontSize: "0.75rem", color: T.textMuted }}>{profile.name} ({profile.currentAge})</span>
               <div style={{ width: 1, height: 10, background: T.border }} />
               <span style={{ fontSize: "0.75rem", color: T.accent }}>Step {stepCount}</span>
            </div>
          )}
        </header>
      )}

      <main className="fade">
        {loading ? (
          <Spinner label={loadingMsg} />
        ) : error ? (
          <div style={{ maxWidth: 400, margin: "6rem auto", textAlign: "center", padding: "2rem", background: T.errorBg, border: `1px solid ${T.errorBd}`, borderRadius: 12 }}>
            <p style={{ color: T.errorText, fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 1.5rem" }}>{error}</p>
            <button onClick={() => setError("")} style={{ padding: "8px 20px", borderRadius: 8, background: T.surface, color: T.text, border: `1px solid ${T.border}`, cursor: "pointer" }}>閉じる</button>
          </div>
        ) : (
          <>
            {view === "setup" && <SetupView onComplete={(p) => { setProfile(p); setView("event_input"); }} />}
            {view === "event_input" && <EventInputView profile={profile} onSubmit={handleEventSubmit} />}
            {view === "branches" && <BranchesView branches={branches} onSelect={handleSelectBranch} onAddCustom={handleAddCustomBranch} stepCount={stepCount} />}
            {view === "result" && <ResultView node={currentNode} onContinue={handleContinue} onViewTree={goToTree} onViewStory={handleGenerateStory} stepCount={stepCount} />}
            {view === "tree" && <TreeView nodes={nodes} profile={profile} onBack={() => setView(prevView)} />}
            {view === "story" && <StoryView story={story} profile={profile} onBack={() => setView(prevView)} />}
          </>
        )}
      </main>
    </div>
  );
}
