// ── Prototyping Kit — onboarding & launcher screens ───────────────────────────
function LauncherScreen() {
  const api = useApp();
  return (
    <div className="layer" style={{ background: '#0f0f13', color: '#fff', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, background: T.accentGrad,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
          boxShadow: '0 8px 30px rgba(99,102,241,0.3)',
        }}>
          <Ph n="home" size={36} color="#fff" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>Launch Prototype</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, margin: '0 0 32px' }}>
          This launcher bypasses production gates to walk you straight through the interactive flows.
        </p>

        <PrimaryBtn onClick={() => {
          api.toast('Welcome to the prototype!');
          api.setTab('home');
        }}>
          Enter Application
        </PrimaryBtn>
      </div>
    </div>
  );
}

Object.assign(window, { LauncherScreen });
