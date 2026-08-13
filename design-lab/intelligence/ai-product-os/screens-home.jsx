// ── Prototyping Kit — home and profile screens ───────────────────────────
function HomeScreen() {
  const api = useApp();
  const D = window.DATA;
  const { scrolled, onScroll } = useStickyHeader();

  const openSampleSheet = () => {
    api.sheet(
      <div style={{ padding: '8px 4px', color: T.label }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Interactive Bottom Sheet</h3>
        <p style={{ fontSize: 14, color: T.label2, lineHeight: 1.5, margin: '0 0 20px' }}>
          This bottom sheet is loaded dynamically via `api.sheet()`. It handles its own touch gestures and fits perfectly on any device viewport.
        </p>
        <PrimaryBtn onClick={() => {
          api.closeSheet();
          api.toast('Action from sheet completed');
        }}>
          Got it
        </PrimaryBtn>
      </div>
    );
  };

  const openSampleDialog = () => {
    api.dialog(
      <div style={{ textAlign: 'center', color: T.label }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: T.redTint,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <Ph n="bell" size={24} color={T.red} />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Action Required</h3>
        <p style={{ fontSize: 14, color: T.label2, lineHeight: 1.45, margin: '0 0 24px' }}>
          This dialog serves as a modal override to confirm crucial state decisions with the user.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="press" onClick={() => api.closeDialog()} style={{ flex: 1, height: 44, borderRadius: 22, background: T.bg2, color: T.label, fontWeight: 600, fontSize: 14 }}>
            Dismiss
          </button>
          <PrimaryBtn onClick={() => {
            api.closeDialog();
            api.toast('Confirmed');
          }} style={{ flex: 1, height: 44 }}>
            Confirm
          </PrimaryBtn>
        </div>
      </div>
    );
  };

  return (
    <div className="layer">
      <TopBar title="AI Prototype Dashboard" center={true} right={
        <button className="press-sm" onClick={() => api.toast('Notification clicked')} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContents: 'center' }}>
          <Ph n="bell" size={20} color={T.brand} />
        </button>
      } shadow={scrolled} />
      
      <div className="scroll" style={{ flex: 1, padding: `16px 16px ${NAV_H + 24}px` }} onScroll={onScroll}>
        {/* Welcome Card */}
        <Card style={{ marginBottom: 20, background: T.accentGrad, color: '#fff', border: 'none' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>Hello, {D.user.name}!</h2>
          <p style={{ fontSize: 13, opacity: 0.8, margin: '0 0 16px' }}>Ready to review the interactive flows.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="press" onClick={openSampleSheet} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 16 }}>
              Open Sheet
            </button>
            <button className="press" onClick={openSampleDialog} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 16 }}>
              Open Dialog
            </button>
          </div>
        </Card>

        {/* Data List Section */}
        <div style={{ fontSize: 14, fontWeight: 700, color: T.label, marginBottom: 12 }}>SAMPLE DATA RECORDS</div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {D.items.map(item => (
            <Card key={item.id} onClick={() => api.toast(`Clicked: ${item.name}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.label }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: T.label2, marginTop: 2 }}>{item.category}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: item.status === 'Active' ? T.greenTint : T.amberTint,
                    color: item.status === 'Active' ? T.green : T.amberText,
                  }}>{item.status}</span>
                  <Ph n="chevron-right" size={16} color={T.label3} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileScreen() {
  const api = useApp();
  const D = window.DATA;
  const { scrolled, onScroll } = useStickyHeader();

  return (
    <div className="layer">
      <TopBar title="User Profile" shadow={scrolled} />
      <div className="scroll" style={{ flex: 1, padding: `24px 16px ${NAV_H + 24}px` }} onScroll={onScroll}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 32, background: T.brand3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, color: T.brand,
          }}>
            {D.user.avatar}
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: T.label, margin: 0 }}>{D.user.name}</h3>
            <p style={{ fontSize: 13, color: T.label2, margin: '4px 0 0' }}>{D.user.email}</p>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: T.label2, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>SYSTEM OPTIONS</div>
        
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <button className="press" onClick={() => api.resetToLauncher()} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderBottom: `1px solid ${T.sep}` }}>
            <Ph n="home" size={20} color={T.brand} />
            <div style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 500, color: T.label }}>Return to Launcher</div>
            <Ph n="chevron-right" size={16} color={T.label3} />
          </button>
          
          <button className="press" onClick={() => api.toast('Settings are placeholder')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
            <Ph n="settings" size={20} color={T.brand} />
            <div style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 500, color: T.label }}>Preferences</div>
            <Ph n="chevron-right" size={16} color={T.label3} />
          </button>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen, ProfileScreen });
