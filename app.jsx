const { useState: useStateA, useEffect: useEffectA } = React;
const { CARDS: DEFAULT_CARDS } = window.CardBData;

const TABS = [
  { id: 'home',      label: '홈',     icon: 'home' },
  { id: 'cards',     label: '내 카드', icon: 'wallet' },
  { id: 'recommend', label: '추천',   icon: 'sparkles' },
  { id: 'settings',  label: '설정',   icon: 'settings' },
];

function StatusBar() {
  return (
    <div
      className="flex items-center justify-between"
      style={{ height: 44, padding: '0 24px', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}
    >
      <span className="tnum">9:41</span>
      <div className="flex items-center gap-1.5" style={{ opacity: .85 }}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
          <rect x="0" y="7" width="3" height="4" rx=".5"/>
          <rect x="4.5" y="5" width="3" height="6" rx=".5"/>
          <rect x="9" y="2.5" width="3" height="8.5" rx=".5"/>
          <rect x="13.5" y="0" width="3" height="11" rx=".5"/>
        </svg>
        <svg width="15" height="11" viewBox="0 0 16 11" fill="currentColor">
          <path d="M8 11a1.4 1.4 0 1 0 0-2.8A1.4 1.4 0 0 0 8 11Zm-4-4 1.5 1.5a3.5 3.5 0 0 1 5 0L12 7a5.5 5.5 0 0 0-8 0Zm-3-3 1.5 1.5a7.5 7.5 0 0 1 11 0L15 4a9.5 9.5 0 0 0-14 0Z"/>
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
          <rect x=".5" y=".5" width="22" height="11" rx="2.6" stroke="currentColor" opacity=".5"/>
          <rect x="23.5" y="3.5" width="1.5" height="5" rx=".5" fill="currentColor" opacity=".5"/>
          <rect x="2" y="2" width="17" height="8" rx="1.6" fill="currentColor"/>
        </svg>
      </div>
    </div>
  );
}

function TabBar({ active, onChange }) {
  return (
    <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', paddingBottom: 18 }}>
      <div className="flex" style={{ height: 60 }}>
        {TABS.map(t => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className="press flex-1 flex flex-col items-center justify-center gap-0.5"
              style={{ color: on ? 'var(--ink)' : 'var(--ink-3)', transition: 'color 200ms ease' }}
            >
              <Icon name={t.icon} size={22} stroke={on ? 2.2 : 1.75} />
              <span className="t-tab">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function App() {
  /* ── auth ── */
  const [user, setUser] = useStateA(() => {
    try { return JSON.parse(localStorage.getItem('cardb_user')); } catch { return null; }
  });

  /* ── nav ── */
  const [tab, setTab]             = useStateA('home');
  const [homeStep, setHomeStep]   = useStateA('input');
  const [amount, setAmount]       = useStateA('');
  const [store, setStore]         = useStateA(null);
  const [direction, setDirection] = useStateA('tab');
  const [animKey, setAnimKey]     = useStateA(0);
  const [darkMode, setDarkMode]   = useStateA(() => {
    try { return localStorage.getItem('cardb_dark') === '1'; } catch { return false; }
  });

  /* ── userCards ── persisted per user */
  const [userCards, setUserCardsRaw] = useStateA(() => {
    if (!user) return [];
    const saved = AuthLS.getCards(user.id);
    return saved !== null ? saved : DEFAULT_CARDS.map(c => ({ ...c }));
  });

  /* wrap setUserCards to also persist */
  const setUserCards = (updater) => {
    setUserCardsRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (user) AuthLS.saveCards(user.id, next);
      return next;
    });
  };

  /* darkMode persistence */
  useEffectA(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try { localStorage.setItem('cardb_dark', darkMode ? '1' : '0'); } catch {}
  }, [darkMode]);

  /* when user logs in, load their cards */
  const handleAuth = (session) => {
    setUser(session);
    const saved = AuthLS.getCards(session.id);
    setUserCardsRaw(saved !== null ? saved : DEFAULT_CARDS.map(c => ({ ...c })));
    setTab('home');
  };

  const handleLogout = () => {
    AuthLS.clearSession();
    setUser(null);
    setUserCardsRaw([]);
    setTab('home');
    setHomeStep('input');
  };

  /* ── tab nav ── */
  const goTab = (id) => {
    if (id === tab) return;
    setDirection('tab');
    setTab(id);
    setHomeStep('input');
    setAnimKey(k => k + 1);
  };

  const goResult = () => {
    setDirection('forward');
    setHomeStep('result');
    setAnimKey(k => k + 1);
  };
  const backToInput = () => {
    setDirection('back');
    setHomeStep('input');
    setAnimKey(k => k + 1);
  };
  const resetAndSearch = () => {
    setAmount('');
    setStore(null);
    backToInput();
  };

  const screenClass =
    direction === 'forward' ? 'screen-enter-forward' :
    direction === 'back'    ? 'screen-enter-back'    :
                              'screen-enter-tab';

  /* ── not logged in → show auth ── */
  if (!user) {
    return (
      <div className="w-screen h-screen flex items-center justify-center" style={{ overflow: 'hidden' }}>
        <div
          className="relative device-frame"
          style={{
            width: 412, height: 868, borderRadius: 54, padding: 11,
            boxShadow: '0 40px 80px -30px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04) inset',
          }}
        >
          <div
            className="app-shell relative overflow-hidden"
            style={{ width: 390, height: 846, borderRadius: 44 }}
          >
            <StatusBar />
            <div className="absolute" style={{
              top: 10, left: '50%', transform: 'translateX(-50%)',
              width: 110, height: 28, borderRadius: 999, background: '#000',
            }} />
            <div style={{ height: 'calc(100% - 44px)', position: 'relative' }}>
              <AuthScreen onAuth={handleAuth} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── main app ── */
  let body;
  if (tab === 'home') {
    body = homeStep === 'input'
      ? <HomeScreen
          amount={amount} setAmount={setAmount}
          store={store} setStore={setStore}
          onSubmit={goResult}
          userCards={userCards}
        />
      : <ResultScreen
          amount={Number(amount || 0)}
          store={store}
          userCards={userCards}
          onBack={backToInput}
          onReset={resetAndSearch}
        />;
  } else if (tab === 'cards') {
    body = <MyCardsScreen userCards={userCards} setUserCards={setUserCards} />;
  } else if (tab === 'recommend') {
    body = <RecommendScreen />;
  } else if (tab === 'settings') {
    body = <SettingsScreen
      darkMode={darkMode} setDarkMode={setDarkMode}
      userCards={userCards} setUserCards={setUserCards}
      user={user} onLogout={handleLogout}
    />;
  }

  return (
    <div className="w-screen h-screen flex items-center justify-center" style={{ overflow: 'hidden' }}>
      <div
        className="relative device-frame"
        style={{
          width: 412, height: 868, borderRadius: 54, padding: 11,
          boxShadow: '0 40px 80px -30px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04) inset',
        }}
      >
        <div
          className="app-shell relative overflow-hidden"
          style={{ width: 390, height: 846, borderRadius: 44 }}
        >
          <StatusBar />
          <div className="absolute" style={{
            top: 10, left: '50%', transform: 'translateX(-50%)',
            width: 110, height: 28, borderRadius: 999, background: '#000',
          }} />

          <div style={{ height: 'calc(100% - 44px - 78px)', position: 'relative' }}>
            <div key={animKey} className={`absolute inset-0 ${screenClass}`}>
              {body}
            </div>
          </div>

          <TabBar active={tab} onChange={goTab} />

          <div className="absolute" style={{
            bottom: 6, left: '50%', transform: 'translateX(-50%)',
            width: 134, height: 5, borderRadius: 999, background: 'var(--ink)', opacity: .6,
          }} />
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
