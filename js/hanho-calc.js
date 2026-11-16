// =====================================================
// 한호 변액설계 2.1.0 계산식 (2026-11-14 개발팀 지안)
// 주성씨 지시: "각 펀드별 기대되는 연 수익률 산정해서 적용하는 시스템으로 가되, 쌓이는 금액이 과한 부분만 점검"
// main.v18.js 뒤에 불러서 같은 이름의 계산 함수를 바꿔 끼운다. 화면 구조는 그대로.
//
// [바꾼 것 1] 펀드별 기대 연수익률
//   원본: 비율로 섞은 '3년 누적'을 연으로 환산 → 연 20~50% (AI 추천 결과는 '1년 실적' 그대로)
//   한호: 펀드마다 ① 최근 3년 연환산 ② 설정 후 연환산(장기 실적) ③ 유형별 상한 중 가장 낮은 값 (0% 미만은 0%)
//         포트폴리오는 펀드별 기대수익률을 비율로 가중평균
// [바꾼 것 2] 비용 = 신한라이프 제안용 상품설명서(2026-11-14 발행, 남 38세)
//   모키적립 월납: 체결 5.13% + 관리 2.75% + 위험 약 0.04% (10년), 납입 후 매월 보험료의 1.6%
//   모키적립 일시납: 최초 1.352%, 2~15회 매월 0.122%, 그 뒤 매월 0.062%
//   레벨업: 설명서 '계약자적립액 예시'(월 244,900원·20년납)에 맞춘 월 차감 일정 + 10년 이내 적립액 연 1.5% 보증비용
//   공통: 최저사망보증비용 적립액의 연 0.1%(모키), 수익률은 연 실효 → 월 복리 (원본은 연÷12로 조금 부풀림)
//   검증: _도구\엔진점검.js(모키, 30년까지 오차 0.3% 이내), _도구\레벨업맞춤.js(레벨업, -1%·3.75%로 1~20년 오차 0.5% 이내)
// =====================================================

const HANHO_CAP = { '주식형': 12, '커머더티형': 5, '기타(달러)': 3, '채권형': 3 }; // 유형별 기대수익률 상한 (연 %)
const HANHO_CAP_DEFAULT = 5;
const HANHO_ASOF = new Date('2026-09-30');

// 2.4.0 (2026-11-17 주성씨 지시: "모든 탭이 수익률이 거의 비슷, 차이가 있게"):
//   주식형·커머더티형은 장기 실적(3년·설정 후 연환산 중 낮은 값)의 75%만 기대수익률로 쓴다(HANHO_HAIRCUT).
//   상한 하나에 모두 걸려 같은 숫자가 되던 것을 펀드마다 실적 차이가 남게 바꿈. 채권·달러는 그대로.
const HANHO_HAIRCUT = { '주식형': 0.75, '커머더티형': 0.75 };
function hanhoFundRate(f) {
  const r = f.returns || {};
  const c3 = (Math.pow(1 + (r.y3 || 0) / 100, 1 / 3) - 1) * 100;
  const yrs = f.setupDate ? (HANHO_ASOF - new Date(f.setupDate)) / 3.15576e10 : 0;
  const ci = yrs >= 3 && r.inception != null ? (Math.pow(1 + r.inception / 100, 1 / yrs) - 1) * 100 : c3;
  const cap = HANHO_CAP[f.type] != null ? HANHO_CAP[f.type] : HANHO_CAP_DEFAULT;
  const hc = HANHO_HAIRCUT[f.type] || 1;
  const base = Math.min(c3, ci) * hc;
  const v = Math.max(0, Math.min(base, cap));
  return { rate: v, c3, ci, cap, by: v === cap ? '상한' : (hc < 1 ? '장기 실적의 75%' : (Math.min(c3, ci) === ci ? '장기 실적' : '3년 실적')) };
}

// weights: {펀드id: 비율} → 연 기대수익률(소수)
function hanhoPortfolioRate(weights) {
  let s = 0, t = 0;
  FUND_DATA.forEach(f => { const w = +weights[f.id] || 0; if (w > 0) { s += w * hanhoFundRate(f).rate; t += w; } });
  return t > 0 ? s / t / 100 : 0;
}
function hanhoWeightsFromDom() {
  const w = {};
  FUND_DATA.forEach(f => { w[f.id] = parseFloat(document.getElementById('ratio_' + f.id)?.value) || 0; });
  return w;
}

// ── 비용 엔진 ──
const HANHO_GUAR = 0.001;
const HANHO_SAVE = { fee: 0.0513, mng: 0.0275, risk: 0.0004, after: 0.016, payY: 10 };
const HANHO_LUMP = { first: 0.01352, m2: 0.00122, m3: 0.00062, risk: 0.00001 };
// 레벨업: 구간 끝(개월)과 그 구간의 월 차감(보험료 대비). 7년·10년 구간의 음수는 유지보너스가 들어오는 몫
const HANHO_LV_K = [3, 6, 9, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 180, 240, 264, 300, 360];
const HANHO_LV_C = [0.34099, 0.37161, 0.37155, 0.37149, 0.37226, 0.37291, 0.37375, 0.37502, 0.37681, -0.17923, 0.30054, 0.30264, -0.59212, 0.29946, 0.30315, 0.13307, 0.14094, 0.08351];
const HANHO_LV_PAYY = 20, HANHO_LV_GUAR = 0.015;
const hanhoM = r => Math.pow(Math.max(1 + r, 0), 1 / 12) - 1;

// 모키연금 (신한모으고키우는변액연금보험 상품설명서 2026-11-14): 월납 체결 5.89% + 관리 3.00%, 일시납 최초 1.577%·2~15회 0.127%·이후 0.084%
const HANHO_ANN = { fee: 0.0589, mng: 0.0300, risk: 0.00002, after: 0.016, payY: 10 };
const HANHO_ANN_LUMP = { first: 0.01577, m2: 0.00127, m3: 0.00084, risk: 0 };

function hhMonthlyEngine(p, monthly, annualBase, targetYear) {
  const m = hanhoM(annualBase - HANHO_GUAR);
  let a = 0, exp = 0;
  for (let k = 1; k <= targetYear * 12; k++) {
    if (k <= p.payY * 12) { const d = monthly * (p.fee + p.mng + p.risk); a += monthly - d; exp += d; }
    else { const d = Math.min(a, monthly * p.after); a -= d; exp += d; }
    a = Math.max(0, a) * (1 + m);
  }
  return { fv: a, totalExpense: exp, totalPrincipal: monthly * Math.min(targetYear, p.payY) * 12 };
}
function hhLumpEngine(p, lumpsum, annualBase, targetYear) {
  const m = hanhoM(annualBase - HANHO_GUAR);
  let a = 0, exp = 0;
  for (let k = 1; k <= targetYear * 12; k++) {
    if (k === 1) { exp += lumpsum * p.first; a = lumpsum - lumpsum * p.first; }
    else { const d = Math.min(a, lumpsum * ((k <= 15 ? p.m2 : p.m3) + p.risk)); a -= d; exp += d; }
    a = Math.max(0, a) * (1 + m);
  }
  return { fv: a, totalExpense: exp, principal: lumpsum };
}
function hhLevelupEngine(monthly, annualBase, targetYear) {
  let a = 0, exp = 0, j = 0;
  for (let k = 1; k <= targetYear * 12; k++) {
    while (j < HANHO_LV_K.length - 1 && HANHO_LV_K[j] < k) j++;
    const m = hanhoM(annualBase - (k <= 120 ? HANHO_LV_GUAR : 0));
    const d = monthly * HANHO_LV_C[j];
    a += (k <= HANHO_LV_PAYY * 12 ? monthly : 0) - d;
    if (d > 0) exp += d;
    a = Math.max(0, a) * (1 + m);
  }
  return { fv: a, totalExpense: exp, totalPrincipal: monthly * Math.min(targetYear, HANHO_LV_PAYY) * 12 };
}
// 상품 k의 월납 계산 (levelup·save·annuity)
function hhEngineFor(k) {
  if (k === 'levelup') return hhLevelupEngine;
  return (m, r, y) => hhMonthlyEngine(k === 'annuity' ? HANHO_ANN : HANHO_SAVE, m, r, y);
}
const hhState = () => window.HH || { product: 'save', cross: false, pair: [] };

// 원본 화면이 부르는 이름들. 상품(적립·연금)과 동시체크 비교 상품에 따라 엔진을 고른다.
// 동시체크 화면은 '레벨UP 칸 = 첫 상품', '모키적립식 칸 = 둘째 상품'으로 쓴다.
function calcWithExpense(monthly, annualBase, targetYear) {
  const s = hhState();
  if (s.cross && s.pair.length === 2) return hhEngineFor(s.pair[1])(monthly, annualBase, targetYear);
  return hhEngineFor(s.product === 'annuity' ? 'annuity' : 'save')(monthly, annualBase, targetYear);
}
function calcWithExpenseLevelup(monthly, annualBase, targetYear) {
  const s = hhState();
  if (s.cross && s.pair.length === 2) return hhEngineFor(s.pair[0])(monthly, annualBase, targetYear);
  return hhLevelupEngine(monthly, annualBase, targetYear);
}
function calcWithExpenseMokiLump(lumpsum, annualBase, targetYear) {
  return hhLumpEngine(hhState().product === 'annuity' ? HANHO_ANN_LUMP : HANHO_LUMP, lumpsum, annualBase, targetYear);
}

// 사업비 미반영 참고값도 같은 월 복리 방식으로
function calcWithoutExpense(monthly, annualBase, targetYear) {
  const m = hanhoM(annualBase); let a = 0;
  for (let k = 1; k <= targetYear * 12; k++) { if (k <= 120) a += monthly; a *= 1 + m; }
  return a;
}
function calcWithoutExpenseLumpsum(lumpsum, annualBase, targetYear) {
  return lumpsum * Math.pow(Math.max(1 + annualBase, 0), targetYear);
}

// 동시체크 표 머리글: 비교 상품 이름·비용 설명 (상품설명서 기준)
const HH_FULL = { levelup: '신한변액유니버설종신 레벨업', save: '모으고키우는변액적립 v2.0', annuity: '모으고키우는변액연금' };
const HH_COST = {
  levelup: '설명서 적립액 예시(20년납)에 맞춘 비용 · 6년까지 보험료의 약 37% · 10년 내 보증 연 1.5%',
  save: '납입 중 보험료의 7.88% (체결 5.13+관리 2.75) · 납입 후 월 보험료의 1.6%',
  annuity: '납입 중 보험료의 8.89% (체결 5.89+관리 3.00) · 납입 후 월 보험료의 1.6%'
};
function hhCrossKey(i) { const s = hhState(); return (s.cross && s.pair.length === 2) ? s.pair[i] : (i === 0 ? 'levelup' : 'save'); }
function hhProdFull(i) { return HH_FULL[hhCrossKey(i)]; }
function hhProdCost(i) { return HH_COST[hhCrossKey(i)]; }


// ── 예상 수익률 설정 (2.3.0, 2026-11-16 주성씨 지시: "수치를 입력하면 적당히 편성되게") ──
// 성장 묶음(미국주식형II 1/2 · 일본주식형 1/4 · 인덱스주식형II 1/4)과
// 안정 묶음(MMF형 2/3 · 미국달러투자형 1/3)의 비중을 5% 단위로 바꿔 가며
// 펀드별 기대수익률 가중평균이 목표에 가장 가까운 조합을 고른다. mmfFixed=20이면(레벨UP·동시체크) MMF 20% 고정 후 나머지 80%로 계산.
const HH_GROWTH = ['VU63300', 'VU61100', 'VU72000'];
const HH_SAFE = ['VU40000', 'VU71002'];
function hhTargetMix(targetPct, mmfFixed) {
  const fixed = mmfFixed || 0, budget = 100 - fixed;
  const r5 = v => Math.round(v / 5) * 5;
  const baskets = [[0.5, 0.25, 0.25], [1, 0, 0]];   // 성장 묶음: 미국·일본·인덱스 2:1:1, 또는 미국주식형II 단독
  let best = null;
  for (const bk of baskets) for (let g = 0; g <= budget; g += 5) {
    const w = {}; FUND_DATA.forEach(f => { w[f.id] = 0; });
    const us = r5(g * bk[0]), jp = r5((g - us) * (bk[1] / ((bk[1] + bk[2]) || 1))), ix = g - us - jp;
    const s = budget - g, mmf = fixed ? 0 : r5(s * 2 / 3), usd = s - mmf; // MMF 고정 모드는 원본이 MMF를 20%로 다시 맞추므로 안정 몫은 달러로
    w[HH_GROWTH[0]] = us; w[HH_GROWTH[1]] = jp; w[HH_GROWTH[2]] = ix;
    w[HH_SAFE[0]] = mmf + fixed; w[HH_SAFE[1]] = usd;
    const rate = hanhoPortfolioRate(w) * 100, gap = Math.abs(rate - targetPct);
    if (!best || gap < best.gap - 1e-9) best = { w, rate, gap };
  }
  return best;
}
