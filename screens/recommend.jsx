const { RECOMMEND, SPEND_PATTERN, CATEGORIES: CATS_REC } = window.CardBData;

function RecommendScreen() {
  const [selected, setSelected] = React.useState(null);
  const totalExtra = RECOMMEND.reduce((s, r) => Math.max(s, r.expectedSave), 0);
  const totalSpend = SPEND_PATTERN.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 pt-4 pb-1">
        <h1 className="t-h1 text-ink">새 카드 추천</h1>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-3 pb-6">
        {/* hero — expected savings */}
        <div
          className="pop-in"
          style={{ background: 'var(--ink)', color: 'var(--bg)', borderRadius: 24, padding: 22 }}
        >
          <div className="flex items-center gap-2" style={{ opacity: .7, fontSize: 13, fontWeight: 600 }}>
            <Icon name="trending-up" size={16} stroke={2.2} />
            <span>지금 카드 + 추천 카드 1장</span>
          </div>
          <div className="mt-2">
            <div style={{ fontSize: 14, opacity: .7 }}>한 달에</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="t-num-hero tnum" style={{ color: 'var(--accent)' }}>
                <CountUp to={totalExtra} />
              </span>
              <span className="t-num-md" style={{ opacity: .8 }}>원 더</span>
            </div>
            <div style={{ fontSize: 14, opacity: .7, marginTop: 4 }}>
              돌려받을 수 있어요
            </div>
          </div>

          {/* mini spend pattern */}
          <div className="mt-5">
            <div style={{ fontSize: 12, fontWeight: 600, opacity: .65, marginBottom: 8 }}>
              지난 달 소비 패턴
            </div>
            <div style={{
              display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden',
              background: 'rgba(255,255,255,.08)',
            }}>
              {SPEND_PATTERN.map(s => (
                <div
                  key={s.cat}
                  style={{
                    width: `${(s.amount / totalSpend) * 100}%`,
                    background: s.color,
                    opacity: .92,
                  }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
              {SPEND_PATTERN.map(s => (
                <div key={s.cat} className="flex items-center gap-1.5" style={{ fontSize: 12, opacity: .8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block' }} />
                  <span>{s.label}</span>
                  <span className="tnum" style={{ opacity: .6 }}>{Math.round((s.amount/totalSpend)*100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* recommended cards */}
        <div className="mt-6 mb-3 px-1 flex items-center justify-between">
          <span className="t-h2 text-ink">내 소비에 맞는 카드</span>
          <span className="t-caption text-ink-3">{RECOMMEND.length}장</span>
        </div>

        <div className="flex flex-col gap-3">
          {RECOMMEND.map((r, idx) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="press text-left bg-surface shadow-card"
              style={{
                borderRadius: 20, padding: 18,
                animation: `slide-in-right 360ms cubic-bezier(.22,.61,.36,1) ${idx * 80}ms both`,
              }}
            >
              <div className="flex items-center gap-3">
                <CardArt brand={r.brand} short={r.issuer.slice(0,2)} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="t-caption text-ink-3">{r.issuer}</div>
                  <div className="t-body-s text-ink truncate">{r.name}</div>
                  <div className="mt-1">
                    <Pill tone="accent">{r.keyBenefit}</Pill>
                  </div>
                </div>
                <Icon name="chevron-right" size={20} className="text-ink-3" />
              </div>

              <div
                className="mt-4 flex items-baseline justify-between"
                style={{ paddingTop: 14, borderTop: '1px solid var(--line)' }}
              >
                <div>
                  <div className="t-caption text-ink-2">월 예상 추가 혜택</div>
                  <div className="flex items-baseline gap-1">
                    <span className="t-num-md tnum" style={{ color: 'var(--accent)' }}>+{formatKRW(r.expectedSave)}</span>
                    <span className="t-caption text-ink-2">원</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="t-caption text-ink-3">연회비</div>
                  <div className="t-body-s tnum text-ink-2">
                    {r.annual === 0 ? '없음' : `${formatKRW(r.annual)}원`}
                  </div>
                </div>
              </div>
              <div className="t-caption text-ink-3 mt-3">{r.reason}</div>
            </button>
          ))}
        </div>
      </div>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title="카드 상세">
        {selected && (
          <div className="px-5 pt-2 pb-6">
            <div className="flex items-center gap-4">
              <CardArt brand={selected.brand} short={selected.issuer.slice(0,2)} size="lg" className="!w-[120px] !h-[76px]" />
              <div className="min-w-0">
                <div className="t-caption text-ink-3">{selected.issuer}</div>
                <div className="t-h2 text-ink truncate">{selected.name}</div>
              </div>
            </div>

            <div
              className="mt-5"
              style={{ background: 'var(--accent-soft)', borderRadius: 20, padding: 18 }}
            >
              <div className="t-caption text-ink-2">한 달에 더 받는 금액</div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="t-num-hero tnum" style={{ color: 'var(--accent)' }}>
                  +{formatKRW(selected.expectedSave)}
                </span>
                <span className="t-num-md text-ink-2">원</span>
              </div>
              <div className="t-caption text-ink-2 mt-2">{selected.reason}</div>
            </div>

            <div className="mt-5">
              <div className="t-h2 text-ink mb-2">주요 혜택</div>
              <div
                className="bg-surface"
                style={{ borderRadius: 16, padding: '14px 16px', border: '1px solid var(--line)' }}
              >
                <div className="flex items-center gap-2 text-ink">
                  <Icon name="check-circle" size={18} className="text-success" />
                  <span className="t-body">{selected.keyBenefit}</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <PrimaryButton onClick={() => setSelected(null)} icon="arrow-right">
                카드사 페이지로
              </PrimaryButton>
              <button
                onClick={() => setSelected(null)}
                className="press w-full text-ink-2 t-body-s mt-2"
                style={{ height: 48 }}
              >
                나중에
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

window.RecommendScreen = RecommendScreen;
