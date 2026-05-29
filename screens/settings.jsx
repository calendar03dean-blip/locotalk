const { CARD_CATALOG } = window.CardBData;

function SettingsScreen({ darkMode, setDarkMode, userCards, setUserCards, user, onLogout }) {
  const [notif, setNotif]     = React.useState(true);
  const [autoBest, setAutoBest] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);

  const Row = ({ icon, title, sub, right, onClick, danger }) => (
    <button
      onClick={onClick}
      className="press w-full flex items-center gap-3"
      style={{ padding: '14px 18px', textAlign: 'left' }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 12,
        background: 'var(--surface-2)',
        color: danger ? 'var(--danger)' : 'var(--ink-2)',
        display: 'grid', placeItems: 'center',
      }}>
        <Icon name={icon} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="t-body-s" style={{ color: danger ? 'var(--danger)' : 'var(--ink)' }}>{title}</div>
        {sub && <div className="t-caption text-ink-3 truncate">{sub}</div>}
      </div>
      {right}
    </button>
  );

  const Toggle = ({ value, onChange }) => (
    <button
      onClick={() => onChange(!value)}
      className="press"
      style={{
        width: 44, height: 26, borderRadius: 999,
        background: value ? 'var(--ink)' : 'var(--surface-2)',
        position: 'relative', transition: 'background 200ms ease',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: value ? 21 : 3,
        width: 20, height: 20, borderRadius: 999, background: 'var(--bg)',
        transition: 'left 220ms cubic-bezier(.22,.61,.36,1)',
        boxShadow: '0 1px 4px rgba(0,0,0,.18)',
      }} />
    </button>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 pt-4 pb-2">
        <h1 className="t-h1 text-ink">설정</h1>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
        {/* 프로필 */}
        <div className="mx-4 mt-2 bg-surface shadow-card" style={{ borderRadius: 20, padding: 18 }}>
          <div className="flex items-center gap-3">
            <div style={{
              width: 48, height: 48, borderRadius: 999,
              background: 'var(--accent-soft)', color: 'var(--accent)',
              display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18,
            }}>{(user?.name || '?')[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="t-body-s text-ink">{user?.name || '사용자'}</div>
              <div className="t-caption text-ink-3 truncate">
                {user?.email} · 카드 {userCards.length}장
                {user?.joinedAt ? ` · 가입 ${Math.floor((Date.now() - user.joinedAt) / 86400000) + 1}일째` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* 카드 섹션 */}
        <SectionLabel>카드</SectionLabel>
        <div className="mx-4 bg-surface" style={{ borderRadius: 20, overflow: 'hidden' }}>
          <Row
            icon="wallet"
            title="등록된 카드 관리"
            sub={userCards.length > 0
              ? userCards.map(c => `${c.issuer} ${c.name}`).join(' · ')
              : '카드 없음'}
            right={<Icon name="chevron-right" size={18} className="text-ink-3" />}
          />
          <Divider />
          <Row
            icon="search"
            title="새 카드 검색 · 등록"
            sub={`전체 ${CARD_CATALOG.length}개 카드 · 14개 카드사`}
            right={<Icon name="chevron-right" size={18} className="text-ink-3" />}
            onClick={() => setAddOpen(true)}
          />
        </div>

        {/* 환경 설정 */}
        <SectionLabel>환경 설정</SectionLabel>
        <div className="mx-4 bg-surface" style={{ borderRadius: 20, overflow: 'hidden' }}>
          <Row
            icon={darkMode ? 'moon' : 'sun'}
            title="다크 모드"
            sub={darkMode ? '켜짐' : '꺼짐'}
            right={<Toggle value={darkMode} onChange={setDarkMode} />}
          />
          <Divider />
          <Row
            icon="bell"
            title="결제 알림"
            sub="더 좋은 카드가 있을 때만 알림"
            right={<Toggle value={notif} onChange={setNotif} />}
          />
          <Divider />
          <Row
            icon="sparkles"
            title="자동 최적 카드 인식"
            sub="결제 위치로 카테고리 자동 감지"
            right={<Toggle value={autoBest} onChange={setAutoBest} />}
          />
        </div>

        {/* 더보기 */}
        <SectionLabel>더보기</SectionLabel>
        <div className="mx-4 bg-surface" style={{ borderRadius: 20, overflow: 'hidden' }}>
          <Row icon="lock" title="개인정보 처리방침" right={<Icon name="chevron-right" size={18} className="text-ink-3" />} />
          <Divider />
          <Row icon="help" title="자주 묻는 질문" right={<Icon name="chevron-right" size={18} className="text-ink-3" />} />
          <Divider />
          <Row icon="sliders" title="버전 정보" sub="1.0.0" />
        </div>

        {/* 로그아웃 */}
        <div className="mx-4 mt-4 bg-surface" style={{ borderRadius: 20, overflow: 'hidden' }}>
          <Row icon="log-out" title="로그아웃" onClick={onLogout} danger />
        </div>

        <div className="text-center t-caption text-ink-3 mt-8">
          CardB · 결제 전 3초, 최적 카드
        </div>
      </div>

      {/* 카드 검색 시트 (settings에서도 직접 등록 가능) */}
      <CardSearchSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        userCards={userCards}
        setUserCards={setUserCards}
      />
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="px-5 pt-6 pb-2 t-caption"
      style={{ color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '.02em' }}>
      {children}
    </div>
  );
}
function Divider() {
  return <div style={{ height: 1, background: 'var(--line)', marginLeft: 64 }} />;
}

Object.assign(window, { SettingsScreen });
