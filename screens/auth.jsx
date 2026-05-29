const { useState: useStateAuth, useEffect: useEffectAuth } = React;

/* ─── LocalStorage helpers ──────────────────────────────────────────────── */
const LS = {
  getUsers:   ()     => { try { return JSON.parse(localStorage.getItem('cardb_users') || '[]'); } catch { return []; } },
  saveUsers:  (arr)  => localStorage.setItem('cardb_users', JSON.stringify(arr)),
  getSession: ()     => { try { return JSON.parse(localStorage.getItem('cardb_user')); } catch { return null; } },
  saveSession:(u)    => localStorage.setItem('cardb_user', JSON.stringify(u)),
  clearSession:()    => localStorage.removeItem('cardb_user'),
  getCards:   (uid)  => { try { return JSON.parse(localStorage.getItem(`cardb_cards_${uid}`) || 'null'); } catch { return null; } },
  saveCards:  (uid, cards) => localStorage.setItem(`cardb_cards_${uid}`, JSON.stringify(cards)),
};
window.AuthLS = LS;

/* ─── Welcome view ──────────────────────────────────────────────────────── */
function WelcomeView({ onLogin, onSignup }) {
  return (
    <div className="h-full flex flex-col">
      {/* hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div style={{
          width: 72, height: 72, borderRadius: 22,
          background: 'var(--ink)', color: 'var(--bg)',
          display: 'grid', placeItems: 'center',
          fontWeight: 900, fontSize: 34,
          marginBottom: 20,
          boxShadow: '0 16px 40px -12px rgba(0,0,0,.35)',
        }}>C</div>
        <h1 className="t-h1 text-ink text-center" style={{ marginBottom: 8 }}>CardB</h1>
        <p className="t-body text-ink-2 text-center" style={{ marginBottom: 6 }}>결제 전 3초, 최적 카드 추천</p>
        <p className="t-caption text-ink-3 text-center">국내 모든 카드사 혜택을 한 번에</p>

        {/* mini card art preview */}
        <div className="flex gap-2 mt-8">
          {[
            { brand: 'shinhan', short: '신한' },
            { brand: 'kb',      short: 'KB'  },
            { brand: 'hyundai', short: '현대' },
            { brand: 'samsung', short: '삼성' },
            { brand: 'toss',    short: 'TOSS' },
          ].map((c, i) => (
            <div key={c.brand} style={{
              animation: `subtle-in 300ms cubic-bezier(.22,.61,.36,1) ${i * 60}ms both`,
              transform: `rotate(${(i - 2) * 4}deg)`,
            }}>
              <CardArt brand={c.brand} short={c.short} size="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* buttons */}
      <div className="px-5 pb-8 flex flex-col gap-3">
        <PrimaryButton onClick={onSignup} icon="user">
          회원가입하기
        </PrimaryButton>
        <button
          onClick={onLogin}
          className="press w-full"
          style={{
            height: 52, borderRadius: 14,
            background: 'var(--surface-2)', color: 'var(--ink)',
            fontWeight: 700, fontSize: 16,
          }}
        >
          로그인
        </button>
        <p className="t-caption text-ink-3 text-center mt-1">
          가입하면 카드 정보와 혜택 기록이 저장됩니다
        </p>
      </div>
    </div>
  );
}

/* ─── Input field helper ────────────────────────────────────────────────── */
function AuthInput({ label, type = 'text', value, onChange, placeholder, error }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="t-caption text-ink-2" style={{ fontWeight: 600 }}>{label}</label>
      <div
        className="ring-accent"
        style={{
          height: 52, borderRadius: 14,
          background: 'var(--surface-2)',
          padding: '0 16px',
          display: 'flex', alignItems: 'center',
          border: error ? '1.5px solid var(--danger)' : '1.5px solid transparent',
          transition: 'border-color 200ms ease',
        }}
      >
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none t-body text-ink"
          style={{ color: 'var(--ink)' }}
          autoComplete={type === 'password' ? 'current-password' : 'off'}
        />
      </div>
      {error && <span className="t-caption" style={{ color: 'var(--danger)' }}>{error}</span>}
    </div>
  );
}

/* ─── Login view ────────────────────────────────────────────────────────── */
function LoginView({ onSuccess, onSignup, onBack }) {
  const [email, setEmail]   = useStateAuth('');
  const [pw, setPw]         = useStateAuth('');
  const [errors, setErrors] = useStateAuth({});
  const [loading, setLoading] = useStateAuth(false);

  const submit = () => {
    const errs = {};
    if (!email.trim())  errs.email = '이메일을 입력해주세요';
    if (!pw)            errs.pw    = '비밀번호를 입력해주세요';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setTimeout(() => {
      const users = LS.getUsers();
      const found = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.pw === pw);
      if (!found) {
        setErrors({ pw: '이메일 또는 비밀번호가 올바르지 않아요' });
        setLoading(false);
        return;
      }
      const session = { id: found.id, name: found.name, email: found.email, joinedAt: found.joinedAt };
      LS.saveSession(session);
      onSuccess(session);
    }, 400);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onBack} className="press text-ink-2" style={{ padding: 6 }}>
          <Icon name="chevron-left" size={22} />
        </button>
        <h1 className="t-h1 text-ink">로그인</h1>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-4">
        <div className="flex flex-col gap-4">
          <AuthInput label="이메일" type="email" value={email} onChange={v => { setEmail(v); setErrors(e => ({...e, email: ''})); }}
            placeholder="이메일 주소" error={errors.email} />
          <AuthInput label="비밀번호" type="password" value={pw} onChange={v => { setPw(v); setErrors(e => ({...e, pw: ''})); }}
            placeholder="비밀번호" error={errors.pw} />
        </div>

        <div className="mt-6">
          <PrimaryButton onClick={submit} disabled={loading} icon={loading ? null : 'arrow-right'}>
            {loading ? '로그인 중…' : '로그인'}
          </PrimaryButton>
        </div>

        <div className="flex items-center justify-center gap-2 mt-5">
          <span className="t-caption text-ink-3">계정이 없으신가요?</span>
          <button onClick={onSignup} className="press t-caption" style={{ color: 'var(--accent)', fontWeight: 700 }}>
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Signup view ───────────────────────────────────────────────────────── */
function SignupView({ onSuccess, onLogin, onBack }) {
  const [name,    setName]    = useStateAuth('');
  const [email,   setEmail]   = useStateAuth('');
  const [pw,      setPw]      = useStateAuth('');
  const [pw2,     setPw2]     = useStateAuth('');
  const [errors,  setErrors]  = useStateAuth({});
  const [loading, setLoading] = useStateAuth(false);

  const clearErr = (key) => setErrors(e => ({ ...e, [key]: '' }));

  const submit = () => {
    const errs = {};
    if (!name.trim())  errs.name  = '이름을 입력해주세요';
    if (!email.trim()) errs.email = '이메일을 입력해주세요';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = '올바른 이메일 형식이 아니에요';
    if (!pw)           errs.pw    = '비밀번호를 입력해주세요';
    else if (pw.length < 6) errs.pw = '비밀번호는 6자 이상이어야 해요';
    if (pw !== pw2)    errs.pw2   = '비밀번호가 일치하지 않아요';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setTimeout(() => {
      const users = LS.getUsers();
      if (users.find(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
        setErrors({ email: '이미 사용 중인 이메일이에요' });
        setLoading(false);
        return;
      }
      const newUser = {
        id:       `u_${Date.now()}`,
        name:     name.trim(),
        email:    email.trim().toLowerCase(),
        pw,
        joinedAt: Date.now(),
      };
      LS.saveUsers([...users, newUser]);
      const session = { id: newUser.id, name: newUser.name, email: newUser.email, joinedAt: newUser.joinedAt };
      LS.saveSession(session);
      onSuccess(session);
    }, 400);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onBack} className="press text-ink-2" style={{ padding: 6 }}>
          <Icon name="chevron-left" size={22} />
        </button>
        <h1 className="t-h1 text-ink">회원가입</h1>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-4 pb-8">
        <div className="flex flex-col gap-4">
          <AuthInput label="이름" value={name} onChange={v => { setName(v); clearErr('name'); }}
            placeholder="홍길동" error={errors.name} />
          <AuthInput label="이메일" type="email" value={email} onChange={v => { setEmail(v); clearErr('email'); }}
            placeholder="이메일 주소" error={errors.email} />
          <AuthInput label="비밀번호" type="password" value={pw} onChange={v => { setPw(v); clearErr('pw'); }}
            placeholder="6자 이상" error={errors.pw} />
          <AuthInput label="비밀번호 확인" type="password" value={pw2} onChange={v => { setPw2(v); clearErr('pw2'); }}
            placeholder="비밀번호 재입력" error={errors.pw2} />
        </div>

        <div className="mt-6">
          <PrimaryButton onClick={submit} disabled={loading} icon={loading ? null : 'arrow-right'}>
            {loading ? '가입 중…' : '가입하고 시작하기'}
          </PrimaryButton>
        </div>

        <div className="flex items-center justify-center gap-2 mt-5">
          <span className="t-caption text-ink-3">이미 계정이 있으신가요?</span>
          <button onClick={onLogin} className="press t-caption" style={{ color: 'var(--accent)', fontWeight: 700 }}>
            로그인
          </button>
        </div>

        <p className="t-caption text-ink-3 text-center mt-4" style={{ lineHeight: 1.6 }}>
          가입 시 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다
        </p>
      </div>
    </div>
  );
}

/* ─── Auth screen (router) ──────────────────────────────────────────────── */
function AuthScreen({ onAuth }) {
  const [step, setStep] = useStateAuth('welcome'); // 'welcome' | 'login' | 'signup'

  const handleSuccess = (session) => {
    onAuth(session);
  };

  const animClass = step === 'welcome' ? 'screen-enter-tab' : 'screen-enter-forward';

  return (
    <div className="h-full" style={{ position: 'relative', overflow: 'hidden' }}>
      <div key={step} className={`absolute inset-0 ${animClass}`}>
        {step === 'welcome' && (
          <WelcomeView
            onLogin={() => setStep('login')}
            onSignup={() => setStep('signup')}
          />
        )}
        {step === 'login' && (
          <LoginView
            onSuccess={handleSuccess}
            onSignup={() => setStep('signup')}
            onBack={() => setStep('welcome')}
          />
        )}
        {step === 'signup' && (
          <SignupView
            onSuccess={handleSuccess}
            onLogin={() => setStep('login')}
            onBack={() => setStep('welcome')}
          />
        )}
      </div>
    </div>
  );
}

window.AuthScreen = AuthScreen;
window.AuthLS = LS;
