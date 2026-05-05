import { HomeForm } from './components/HomeForm';

export default function HomePage() {
  return (
    <main className="main">
      <div style={{ display: 'flex', alignItems: 'center', padding: '20px 36px 0', flexShrink: 0 }}>
        <span className="topbar-title">심사숙고</span>
      </div>
      <HomeForm />
    </main>
  );
}
