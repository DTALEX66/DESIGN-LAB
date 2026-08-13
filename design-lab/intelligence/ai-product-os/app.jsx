// ── Prototyping Kit — app router, overlays, state, mount ─────────────────────
const { useState, useEffect, useRef } = React;

const TAB_ROOT = { home: 'home', profile: 'profile' };

const SCREENS = {
  launcher: window.LauncherScreen,
  home: window.HomeScreen,
  profile: window.ProfileScreen,
};

const NAV_PRESS_DELAY_MS = 50;
const NAV_TRANS_MS = 280;
const NAV_EASE = 'ease-in-out';

function App() {
  const D = window.DATA;
  let uidc = useRef(1);
  const newUid = () => ++uidc.current;

  const [activeTab, setActiveTab] = useState('home');
  const [stack, setStack] = useState([{ screen: window.INITIAL_SCREEN || 'launcher', params: {}, uid: 1 }]);
  const [leaving, setLeaving] = useState(false);

  // Overlays
  const [toast, setToast] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [sheetExit, setSheetExit] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [dialogExit, setDialogExit] = useState(false);

  // Navigation API
  const push = (screen, params = {}) => {
    document.activeElement?.blur();
    setTimeout(() => setStack(s => [...s, { screen, params, uid: newUid() }]), NAV_PRESS_DELAY_MS);
  };

  const pop = () => {
    document.activeElement?.blur();
    setTimeout(() => {
      setStack(s => {
        if (s.length <= 1) return s;
        setLeaving(true);
        setTimeout(() => { setStack(cur => cur.slice(0, -1)); setLeaving(false); }, NAV_TRANS_MS);
        return s;
      });
    }, NAV_PRESS_DELAY_MS);
  };

  const setTab = (tab) => {
    if (tab === activeTab && stack.length === 1 && stack[0].screen === TAB_ROOT[tab]) return;
    setLeaving(false);
    setActiveTab(tab);
    setStack([{ screen: TAB_ROOT[tab], params: {}, uid: newUid() }]);
  };

  const showToast = (msg) => {
    const id = Date.now();
    setToast({ msg, id });
    setTimeout(() => setToast(t => (t && t.id === id ? null : t)), 2000);
  };

  const openSheet = (node) => { setSheetExit(false); setSheet(node); };
  const closeSheet = () => { setSheetExit(true); setTimeout(() => { setSheet(null); setSheetExit(false); }, 240); };
  const openDialog = (node) => { setDialogExit(false); setDialog(node); };
  const closeDialog = () => { setDialogExit(true); setTimeout(() => { setDialog(null); setDialogExit(false); }, 200); };

  const resetToLauncher = () => {
    setStack([{ screen: 'launcher', params: {}, uid: newUid() }]);
  };

  const api = {
    push, pop, setTab, resetToLauncher,
    toast: showToast, sheet: openSheet, closeSheet, dialog: openDialog, closeDialog,
  };

  const n = stack.length;
  const effTop = leaving ? n - 2 : n - 1;
  const currentScreen = stack[n - 1]?.screen;
  const showNav = ['home', 'profile'].includes(currentScreen);

  const cubic = 'cubic-bezier(.32,.72,0,1)';
  const layers = stack.map((item, i) => {
    const Comp = SCREENS[item.screen] || (() => <div style={{ padding: 20 }}>Screen "{item.screen}" not found. Ensure it is loaded and registered in app.jsx SCREENS map.</div>);
    let x = '0%', z = 1 + i, dim = 0, anim = 'none', shadow = 'none', opacity = 1, trans = `transform ${NAV_TRANS_MS}ms ${NAV_EASE}, opacity ${NAV_TRANS_MS}ms ${NAV_EASE}`;
    if (leaving && i === n - 1) { 
      x = '0%'; 
      opacity = 0; 
      z = 30 + i; 
    }
    else if (i === effTop) { 
      x = '0%'; 
      z = 20 + i; 
      if (i > 0) { 
        anim = leaving ? 'none' : `slideInRight ${NAV_TRANS_MS}ms ${NAV_EASE}`; 
        shadow = leaving ? 'none' : '-8px 0 24px rgba(0,0,0,0.1)'; 
      }
    }
    else { 
      x = '-10%'; 
      dim = 0.12; 
      z = 1 + i; 
    }
    const interactive = i === effTop && !(leaving && i === n - 1);
    return (
      <div key={item.uid} style={{
        position: 'absolute', inset: 0, background: '#fff', display: 'flex', flexDirection: 'column',
        transform: `translateX(${x})`, zIndex: z, transition: trans, animation: anim, boxShadow: shadow, willChange: 'transform, opacity',
        opacity: opacity,
        pointerEvents: interactive ? 'auto' : 'none',
      }}>
        <Comp params={item.params} />
        {dim > 0 && <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${dim})`, pointerEvents: 'none' }} />}
      </div>
    );
  });

  return (
    <AppCtx.Provider value={api}>
      <div className="app-root">
        {layers}

        {/* Bottom Navigation */}
        {showNav && <BottomNav activeTab={activeTab} onTab={setTab} />}

        {/* Toast Notification */}
        {toast && <Toast key={toast.id} msg={toast.msg} />}

        {/* Bottom Sheet */}
        {sheet && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 70 }}>
            <div onClick={closeSheet} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', animation: sheetExit ? 'scrimIn .24s reverse forwards' : 'scrimIn .24s ease' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#fff', borderRadius: '20px 20px 0 0', padding: '10px 16px 30px', boxShadow: T.md, animation: sheetExit ? 'sheetUp .24s reverse forwards' : `sheetUp .28s ${cubic}`, maxHeight: '82%', overflowY: 'auto' }}>
              <div style={{ width: 38, height: 5, borderRadius: 3, background: '#e5e7eb', margin: '0 auto 14px' }} />
              {sheet}
            </div>
          </div>
        )}

        {/* Dialog Alert */}
        {dialog && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
            <div onClick={closeDialog} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', animation: dialogExit ? 'scrimIn .2s reverse forwards' : 'scrimIn .2s ease' }} />
            <div style={{ position: 'relative', width: '100%', background: '#fff', borderRadius: 20, padding: 22, boxShadow: T.md, animation: dialogExit ? 'popIn .18s reverse forwards' : 'popIn .24s cubic-bezier(.2,.7,.3,1.3)' }}>
              {dialog}
            </div>
          </div>
        )}
      </div>
    </AppCtx.Provider>
  );
}

// Bottom Tab Navigation Bar
function BottomNav({ activeTab, onTab }) {
  const tabs = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'profile', icon: 'user', label: 'Profile' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40,
      height: NAV_H, paddingBottom: 22, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(16px)',
      borderTop: `1px solid ${T.sep}`, boxShadow: T.lg, display: 'flex',
    }}>
      {tabs.map(t => {
        const on = activeTab === t.id;
        return (
          <button key={t.id} className="press-sm" onClick={() => onTab(t.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 8 }}>
            <div style={{
              width: 58, height: 30, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: on ? T.brand3 : 'transparent', transition: 'background .18s ease',
            }}>
              <Ph n={t.icon} size={20} color={on ? T.brand : T.label2} />
            </div>
            <span style={{ fontSize: 11, fontWeight: on ? 600 : 500, color: on ? T.brand : T.label2 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Toast({ msg }) {
  return (
    <div style={{
      position: 'absolute', left: '50%', top: '50%', zIndex: 66, transform: 'translate(-50%, -50%)',
      background: 'rgba(20,20,20,0.94)', color: '#fff', fontSize: 14, fontWeight: 500,
      padding: '11px 18px', borderRadius: 24, whiteSpace: 'nowrap', boxShadow: T.md,
      animation: 'toastPop .24s ease both', maxWidth: '88%',
    }}>{msg}</div>
  );
}

function Stage() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: T.bg, overflow: 'hidden' }}>
      <App />
    </div>
  );
}

function Root() {
  return <Stage />;
}

document.addEventListener('touchstart', function () {}, { passive: true });

function mountApp() {
  const el = document.getElementById('root');
  if (el) ReactDOM.createRoot(el).render(<Root />);
}

if (document.fonts && document.fonts.load) {
  Promise.race([
    document.fonts.load("600 16px Geist"),
    new Promise(res => setTimeout(res, 1200)),
  ]).then(mountApp);
} else {
  mountApp();
}

Object.assign(window, { App, BottomNav, Toast, Root });
