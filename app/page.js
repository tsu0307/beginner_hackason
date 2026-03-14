// 役割: トップページ "/" の入口で、メインの人生シミュレーター画面を表示する。
import LifeBranches from './components/life-branches';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', margin: 0, padding: 0 }}>
      <LifeBranches />
    </main>
  );
}
