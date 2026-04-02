import React, { useState } from 'react';
import type { GenerateRequest } from '../api/generate';

interface InitialPageProps {
  onSubmit: (req: GenerateRequest) => void;
  loading: boolean;
  error: string | null;
}

const THEMES: GenerateRequest['theme'][] = ['일반', '고급화', '빈티지'];

const DEFAULT_VALUES: GenerateRequest = {
  theme: '일반',
  productInfo:
    '아인슈페너가 메인인 카페입니다. 에스프레소, 라떼, 카라멜 마끼아또 등 다양한 커피 메뉴와 휘낭시에, 두바이 쫀득 쿠키, 버터떡 등 디저트를 판매합니다.',
  storeInfo:
    '경기도 안양시 가로수길 옆에 있는 1층 가게입니다. 주차장은 없지만 버스 5번을 타면 가로수길 버스정류장 1번에서 도보 5분 거리입니다.',
  otherInfo:
    '신메뉴: 두바이 쫀득 쿠키가 출시되었습니다.\n영업시간: 월~토 오전 11시 ~ 오후 9시',
};

export default function InitialPage({ onSubmit, loading, error }: InitialPageProps) {
  const [form, setForm] = useState<GenerateRequest>(DEFAULT_VALUES);

  const set = (field: keyof GenerateRequest, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <h1 style={styles.title}>메뉴판 생성</h1>
        <p style={styles.subtitle}>정보를 입력하면 AI가 카페 메뉴판 템플릿을 자동으로 생성합니다.</p>

        <form onSubmit={handleSubmit} style={styles.form}>

          {/* 1. 테마 */}
          <section style={styles.section}>
            <label style={styles.label}>
              <span style={styles.labelNum}>1</span> 테마
            </label>
            <div style={styles.themeRow}>
              {THEMES.map(t => (
                <button
                  key={t}
                  type="button"
                  style={{
                    ...styles.themeBtn,
                    ...(form.theme === t ? styles.themeBtnActive : {}),
                  }}
                  onClick={() => set('theme', t)}
                >
                  {t === '고급화' && '✨ '}
                  {t === '빈티지' && '🌿 '}
                  {t === '일반' && '☕ '}
                  {t}
                </button>
              ))}
            </div>
            <p style={styles.hint}>
              {form.theme === '고급화' && '고급스러운 다크 톤과 금색 포인트로 프리미엄 감성을 연출합니다.'}
              {form.theme === '빈티지' && '따뜻한 브라운 계열과 레트로 감성의 디자인을 생성합니다.'}
              {form.theme === '일반' && '깔끔하고 밝은 기본 스타일로 누구나 좋아하는 디자인을 생성합니다.'}
            </p>
          </section>

          {/* 2. 상품 정보 */}
          <section style={styles.section}>
            <label style={styles.label} htmlFor="productInfo">
              <span style={styles.labelNum}>2</span> 상품 정보
            </label>
            <p style={styles.fieldHint}>메인 메뉴, 판매 상품 종류 등을 자유롭게 적어주세요.</p>
            <textarea
              id="productInfo"
              style={styles.textarea}
              rows={4}
              value={form.productInfo}
              onChange={e => set('productInfo', e.target.value)}
              placeholder="예) 아인슈페너가 메인인 카페입니다. 에스프레소, 라떼, 디저트 등을 판매합니다."
            />
          </section>

          {/* 3. 가게 정보 */}
          <section style={styles.section}>
            <label style={styles.label} htmlFor="storeInfo">
              <span style={styles.labelNum}>3</span> 가게 정보
            </label>
            <p style={styles.fieldHint}>위치, 주차, 대중교통 등 가게에 대한 정보를 적어주세요.</p>
            <textarea
              id="storeInfo"
              style={styles.textarea}
              rows={4}
              value={form.storeInfo}
              onChange={e => set('storeInfo', e.target.value)}
              placeholder="예) 경기도 안양시 가로수길 옆 1층. 버스 5번 가로수길 정류장에서 도보 5분."
            />
          </section>

          {/* 4. 기타 정보 */}
          <section style={styles.section}>
            <label style={styles.label} htmlFor="otherInfo">
              <span style={styles.labelNum}>4</span> 기타 정보
            </label>
            <p style={styles.fieldHint}>신메뉴, 영업시간, 이벤트 등 추가로 알릴 내용을 적어주세요.</p>
            <textarea
              id="otherInfo"
              style={styles.textarea}
              rows={4}
              value={form.otherInfo}
              onChange={e => set('otherInfo', e.target.value)}
              placeholder="예) 신메뉴: 두바이 쫀득 쿠키 출시. 영업시간: 월~토 11:00 ~ 21:00"
            />
          </section>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? (
              <span>
                <span style={styles.spinner} /> AI 템플릿 생성 중...
              </span>
            ) : (
              '메뉴판 생성하기 →'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── 스타일 ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: '#0d0d1a',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '48px 16px',
  },
  card: {
    width: '100%',
    maxWidth: '560px',
    background: '#131326',
    border: '1px solid #1e2a4a',
    borderRadius: '16px',
    padding: '40px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 700,
    color: '#e8eaf6',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    marginTop: '8px',
    marginBottom: '32px',
    fontSize: '13px',
    color: '#6b7db3',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#c5cae9',
  },
  labelNum: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: '#1a237e',
    color: '#9fa8da',
    fontSize: '11px',
    fontWeight: 700,
    flexShrink: 0,
  },
  fieldHint: {
    margin: 0,
    fontSize: '11px',
    color: '#424870',
    paddingLeft: '32px',
  },
  themeRow: {
    display: 'flex',
    gap: '10px',
    paddingLeft: '32px',
  },
  themeBtn: {
    padding: '8px 18px',
    borderRadius: '8px',
    border: '1px solid #1e2a4a',
    background: '#1a1a33',
    color: '#7986cb',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  themeBtnActive: {
    background: '#1a237e',
    border: '1px solid #3949ab',
    color: '#e8eaf6',
    fontWeight: 600,
  },
  hint: {
    margin: 0,
    fontSize: '11px',
    color: '#5c6bc0',
    paddingLeft: '32px',
    fontStyle: 'italic',
  },
  textarea: {
    marginLeft: '32px',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #1e2a4a',
    background: '#0d0d1a',
    color: '#c5cae9',
    fontSize: '13px',
    lineHeight: 1.6,
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
  error: {
    margin: 0,
    padding: '12px',
    borderRadius: '8px',
    background: '#2a0a0a',
    border: '1px solid #7f1d1d',
    color: '#fca5a5',
    fontSize: '13px',
  },
  submitBtn: {
    marginTop: '8px',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #1a237e, #283593)',
    color: '#e8eaf6',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.3px',
    transition: 'opacity 0.15s',
  },
  spinner: {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    border: '2px solid #7986cb',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginRight: '8px',
    verticalAlign: 'middle',
  },
};
