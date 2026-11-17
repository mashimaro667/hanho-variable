// ─── 펀드 표기: 대표 종목(위) + 펀드명(아래) — 2026-10-07 상무님 지시, 모든 펀드 표기에 공통 ───
function fundHeadline(fund) {
  let hs;
  if (fund.id === "VU63300") {
    hs = ["INVESCO QQQ", "NVIDIA", "Apple"];
  } else {
    hs = (fund.top10Holdings || [])
      .map(h => h.name.split(" ")[0].split("(")[0].trim())
      .filter((v, i, a) => v && a.indexOf(v) === i)
      .slice(0, 3);
  }
  return hs.length ? hs.join(" · ") + " 등" : fund.name;
}
function fundStack(fund, extraSub) {
  return `<span class="fn-stack"><span class="fn-top">${fundHeadline(fund)}</span><span class="fn-sub">${fund.name}${extraSub || ""}</span></span>`;
}

// 차트 공통 글꼴·글자색 (프리미엄 디자인)
if (window.Chart) { try { Chart.defaults.font.family = "'Pretendard','Malgun Gothic',sans-serif"; Chart.defaults.color = '#5b6b82'; } catch (e) {} }
// ── 3D 입체 차트 플러그인 (2026-09-21 상무님 지시: 막대·도넛에 음영으로 3D 느낌)
// 계산·데이터는 건드리지 않고 그리는 방식만 바꾼다. 오류가 나면 원래 방식으로 그린다.
(function () {
  if (!window.Chart) return;
  var cv = document.createElement('canvas'); cv.width = cv.height = 1;
  var cx = cv.getContext('2d', { willReadFrequently: true });
  var cache = {};
  function rgb(col) {
    if (cache[col]) return cache[col];
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#808080'; cx.fillStyle = col; cx.fillRect(0, 0, 1, 1);
    var d = cx.getImageData(0, 0, 1, 1).data; return (cache[col] = [d[0], d[1], d[2]]);
  }
  // k>0 : 흰색 쪽으로 밝게, k<0 : 검정 쪽으로 어둡게
  function shade(c, k) {
    var t = k < 0 ? 0 : 255, a = Math.abs(k);
    return 'rgb(' + c.map(function (v) { return Math.round(v + (t - v) * a); }).join(',') + ')';
  }
  function ring(ctx, g, dy) {
    ctx.beginPath();
    ctx.arc(g.x, g.y + dy, g.outerRadius, g.startAngle, g.endAngle);
    ctx.arc(g.x, g.y + dy, g.innerRadius, g.endAngle, g.startAngle, true);
    ctx.closePath();
  }
  function doughnut3d(chart, meta) {
    var ctx = chart.ctx, arcs = meta.data, i, g, base;
    var geo = arcs.map(function (a) { return a.getProps(['x', 'y', 'startAngle', 'endAngle', 'innerRadius', 'outerRadius'], true); });
    if (!geo.length || !(geo[0].outerRadius > 0)) return false;
    var depth = Math.max(6, Math.round(geo[0].outerRadius * 0.075));
    // 두께·그림자가 캔버스 밖으로 잘리지 않게 전체를 조금 줄여 위로 올린다
    var R0 = geo[0].outerRadius; ctx.translate(geo[0].x, geo[0].y - 0.09 * R0); ctx.scale(0.86, 0.86); ctx.translate(-geo[0].x, -geo[0].y);
    var cols = arcs.map(function (a) { return rgb(a.options.backgroundColor); });
    // 1) 바닥 그림자 + 옆면(두께)
    for (i = 0; i < geo.length; i++) {
      if (geo[i].endAngle - geo[i].startAngle < 0.001) continue;
      ctx.save();
      ctx.shadowColor = 'rgba(11,31,63,.38)'; ctx.shadowBlur = depth * 2.2; ctx.shadowOffsetY = depth * 0.9;
      ring(ctx, geo[i], depth); ctx.fillStyle = shade(cols[i], -0.5); ctx.fill();
      ctx.restore();
    }
    for (var dy = depth; dy >= 1; dy--) {
      var k = -0.5 + 0.2 * (1 - dy / depth);           // 아래로 갈수록 어둡게
      for (i = 0; i < geo.length; i++) {
        if (geo[i].endAngle - geo[i].startAngle < 0.001) continue;
        ring(ctx, geo[i], dy); ctx.fillStyle = shade(cols[i], k); ctx.fill();
      }
    }
    // 2) 윗면 : 안쪽은 밝게 → 바깥쪽은 어둡게(관 모양) + 왼쪽 위 조명
    for (i = 0; i < geo.length; i++) {
      g = geo[i]; if (g.endAngle - g.startAngle < 0.001) continue;
      var rg = ctx.createRadialGradient(g.x, g.y, g.innerRadius, g.x, g.y, g.outerRadius);
      rg.addColorStop(0, shade(cols[i], 0.30)); rg.addColorStop(0.5, shade(cols[i], 0)); rg.addColorStop(1, shade(cols[i], -0.24));
      ring(ctx, g, 0); ctx.fillStyle = rg; ctx.fill();
      var lg = ctx.createLinearGradient(g.x - g.outerRadius, g.y - g.outerRadius, g.x + g.outerRadius, g.y + g.outerRadius);
      lg.addColorStop(0, 'rgba(255,255,255,.34)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(0,0,0,.16)');
      ring(ctx, g, 0); ctx.fillStyle = lg; ctx.fill();
      ring(ctx, g, 0); ctx.lineWidth = 1.4; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.stroke();
    }
    return false;
  }
  function bar3d(chart, meta) {
    var ctx = chart.ctx, bars = meta.data;
    for (var i = 0; i < bars.length; i++) {
      var b = bars[i], p = b.getProps(['x', 'y', 'base', 'width', 'height'], true);
      if (!(p.width > 0)) continue;
      var top = Math.min(p.y, p.base), bot = Math.max(p.y, p.base), h = bot - top;
      if (!(h > 0.6)) continue;
      var l = p.x - p.width / 2, r = p.x + p.width / 2, d = Math.min(9, Math.max(4, p.width * 0.2));
      var c = rgb(b.options.backgroundColor);
      // 윗면
      ctx.beginPath(); ctx.moveTo(l, top); ctx.lineTo(l + d, top - d); ctx.lineTo(r + d, top - d); ctx.lineTo(r, top); ctx.closePath();
      ctx.fillStyle = shade(c, 0.4); ctx.fill();
      // 오른쪽 옆면
      ctx.beginPath(); ctx.moveTo(r, top); ctx.lineTo(r + d, top - d); ctx.lineTo(r + d, bot - d); ctx.lineTo(r, bot); ctx.closePath();
      ctx.fillStyle = shade(c, -0.36); ctx.fill();
      // 앞면 : 왼쪽 밝게 → 오른쪽 어둡게 + 그림자
      ctx.save();
      ctx.shadowColor = 'rgba(11,31,63,.28)'; ctx.shadowBlur = 8; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
      var gr = ctx.createLinearGradient(l, 0, r, 0);
      gr.addColorStop(0, shade(c, 0.26)); gr.addColorStop(0.45, shade(c, 0)); gr.addColorStop(1, shade(c, -0.2));
      ctx.fillStyle = gr; ctx.fillRect(l, top, p.width, h);
      ctx.restore();
      var vg = ctx.createLinearGradient(0, top, 0, bot);
      vg.addColorStop(0, 'rgba(255,255,255,.22)'); vg.addColorStop(0.5, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(0,0,0,.10)');
      ctx.fillStyle = vg; ctx.fillRect(l, top, p.width, h);
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 0.8; ctx.strokeRect(l + 0.4, top + 0.4, p.width - 0.8, h - 0.8);
    }
    return false;
  }
  Chart.register({
    id: 'premium3d',
    beforeInit: function (chart) {
      var ty = chart.config.type; if (ty !== 'doughnut' && ty !== 'pie' && ty !== 'bar') return;
      var o = chart.options; o.layout = o.layout || {};
      if (ty === 'bar' && (!o.layout.padding || typeof o.layout.padding === 'number')) o.layout.padding = { top: 12, right: 12, left: 2, bottom: 2 };
    },
    beforeDatasetDraw: function (chart, args) {
      var ty = args.meta && args.meta.type; if (ty !== 'doughnut' && ty !== 'pie' && ty !== 'bar') return;
      var ctx = chart.ctx; ctx.save();
      try { return ty === 'bar' ? bar3d(chart, args.meta) : doughnut3d(chart, args.meta); }
      catch (e) { return; }
      finally { ctx.restore(); }
    }
  });
})();

// =====================================================
// Main Application Logic — ETF저축(변액) 맞춤 제안서
// BUILD: 20260723-v18r5 (썸머 오션 브리즈 컬러 리디자인 — CSS 전용, 로직 변경 없음)
// FEATURE: 포트폴리오 대표 종목 태그 (pf-holding-tag)
// BUGFIX: 모키일시납 라인차트 수평선 / -88% 배지 수정
// BUGFIX(v18r17): 인쇄 시 도넛차트(pieChart2Instance) resize 누락 → 빈 화면 출력 수정
//                 + 크로스체크(동시체크) 비교표 인쇄용 축소 클래스 추가(표 잘림 방지)
// =====================================================

// ── Canvas roundRect 폴리필 (구형 브라우저 대응) ──
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    const R = Math.min(r, w / 2, h / 2);
    this.beginPath();
    this.moveTo(x + R, y);
    this.lineTo(x + w - R, y);
    this.arcTo(x + w, y, x + w, y + R, R);
    this.lineTo(x + w, y + h - R);
    this.arcTo(x + w, y + h, x + w - R, y + h, R);
    this.lineTo(x + R, y + h);
    this.arcTo(x, y + h, x, y + h - R, R);
    this.lineTo(x, y + R);
    this.arcTo(x, y, x + R, y, R);
    this.closePath();
    return this;
  };
}

let pieChartInstance = null;
let pieChart2Instance = null;
let simChartInstance = null;
let proposalData = {};

// ─── 크로스체크 전용 전역 상태 ───────────────────────
let _crossCheckSnapshot = null;  // 크로스체크 ON 이전 상태 저장 (원복용)

// ─── 초기화 ───────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // 오늘 날짜 세팅 (전역 재사용)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm   = String(today.getMonth()+1).padStart(2,'0');
  const dd   = String(today.getDate()).padStart(2,'0');
  const yy   = String(yyyy).slice(2);

  // STEP1 제안일
  const propEl = document.getElementById("proposeDate");
  if (propEl) propEl.textContent = `${yyyy}.${mm}.${dd}`;

  // PAGE2 헤더 작성일 (오늘 날짜 자동)
  const subDateEl = document.getElementById("proposalSubDate");
  if (subDateEl) subDateEl.textContent = `${yyyy}년 ${mm}월 ${dd}일`;

  // 전역 날짜 변수 저장 (renderPage2에서 재활용)
  window._todayStr = `${yyyy}.${mm}.${dd}`;

  // 펀드 비율 테이블 생성
  buildFundRatioTable();

  // 기본값 세팅: 미국주식형II 30% / 미국달러투자형 20% / 인덱스주식형II 50%
  setDefaultRatios();

  // 초기 파이차트
  updatePreview();
});

// ─── 기본 비율 ──────────────────────────────────────
function setDefaultRatios() {
  FUND_DATA.forEach(f => { setFundRatio(f.id, 0); });
  setFundRatio("VU63300", 30);  // 미국주식형II
  setFundRatio("VU71002", 20);  // 미국달러투자형
  setFundRatio("VU72000", 50);  // 인덱스주식형II
  validateRatios();
}

/** 제안서 상단 제목: 고객명(입력값이므로 반드시 이스케이프) + 장식 구조 */
function setProposalTitle(name) {
  const safe = String(name == null ? "" : name).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const el = document.getElementById("proposalMainTitle");
  if (!el) return;
  el.innerHTML = '<span class="pt-name">' + safe + '</span><span class="pt-nim">님의</span>' +
    '<span class="pt-etf">ETF</span><span class="pt-word">변액</span><span class="pt-ai">AI</span><span class="pt-word">시뮬레이션</span>';
  el.setAttribute("aria-label", String(name) + " 님의 변액을더하다");
}

/** 펀드 비율 통합 세터 — input + slider + display + fill + card 동시 업데이트 */
function setFundRatio(id, val) {
  val = Math.min(100, Math.max(0, parseFloat(val) || 0));
  const input  = document.getElementById("ratio_"    + id);
  const slider = document.getElementById("slider_"   + id);
  const disp   = document.getElementById("rdisplay_" + id);
  const fill   = document.getElementById("fill_"     + id);
  const card   = document.getElementById("scard_"    + id);
  if (input)  input.value      = val;
  if (slider) slider.value     = val;
  if (disp)   disp.textContent = val;
  if (fill)   fill.style.width = val + "%";
  if (card)   card.classList.toggle("zero-ratio", val === 0);
}

// ─── 고객명 → 생년월일 자동 포커스 ─────────────────
function nameKeyHandler(e) {
  if (e.key === "Enter" || e.key === "Tab") {
    e.preventDefault();
    document.getElementById("clientBirth").focus();
  }
}

// ─── 생년월일 자동 포맷 (YYYYMMDD → YYYY-MM-DD) — 2026-10-07 상무님 지시 ────────
function birthAutoFormat(el) {
  let raw = el.value.replace(/\D/g, "").slice(0, 8);
  let formatted = raw;
  if (raw.length > 4 && raw.length <= 6) formatted = raw.slice(0,4) + "-" + raw.slice(4);
  else if (raw.length > 6) formatted = raw.slice(0,4) + "-" + raw.slice(4,6) + "-" + raw.slice(6,8);
  el.value = formatted;

  // 힌트: 만나이 계산
  const hint = document.getElementById("birthHint");
  if (raw.length === 8) {
    const fullYear = parseInt(raw.slice(0,4));
    const age = new Date().getFullYear() - fullYear;
    if (hint) {
      hint.textContent = `만 ${age}세 (${fullYear}년생)`;
      hint.className = "birth-hint active";
    }
    // 생년월일 완성 → 성별 라디오로 포커스
    setTimeout(() => {
      const radios = document.querySelectorAll("input[name='gender']");
      if (radios[0]) radios[0].focus();
    }, 100);
  } else {
    if (hint) { hint.textContent = ""; hint.className = "birth-hint"; }
  }
}

// ─── 금액 콤마 포맷 입력 ────────────────────────────
function amountFormatInput(el) {
  let raw = el.value.replace(/,/g, "").replace(/\D/g, "");
  if (!raw) { el.value = ""; return; }
  const num = parseInt(raw);
  el.value = num.toLocaleString("ko-KR");
}

function getMonthlyAmount() {
  const val = document.getElementById("monthlyAmount").value.replace(/,/g, "");
  return parseFloat(val) || 500000;
}

// ─── 금액 단축 버튼 ──────────────────────────────
function setAmount(val) {
  document.getElementById("monthlyAmount").value = val.toLocaleString("ko-KR");
  updatePreview();
}

/**
 * 금액 버튼 클릭 핸들러
 * - 일반 모드 / 모키일시납 모드 공통: 클릭할 때마다 현재 금액에 "합산"됩니다.
 *   (예: 10만 → 30만 순서로 누르면 40만원으로 누적)
 */
function handleAmtBtn(val) {
  const input = document.getElementById("monthlyAmount");
  const current = parseInt(input.value.replace(/,/g, "")) || 0;
  const newVal  = current + val;
  input.value   = newVal.toLocaleString("ko-KR");

  // 모키일시납 모드이면 합계 안내바도 함께 갱신
  if (isMokiChecked()) {
    updateMokiLumpSumDisplay();
  }
  updatePreview();
}

/** 모키일시납 합계 표시 업데이트 */
function updateMokiLumpSumDisplay() {
  const input  = document.getElementById("monthlyAmount");
  const sumEl  = document.getElementById("mokiLumpSum");
  if (!sumEl) return;
  const val = parseInt(input.value.replace(/,/g, "")) || 0;
  sumEl.textContent = "합계: " + val.toLocaleString("ko-KR") + "원";
}

/** 금액 초기화 (일반 모드 / 모키일시납 모드 공통) */
function resetAmount() {
  const input = document.getElementById("monthlyAmount");
  input.value = "0";
  if (isMokiChecked()) {
    updateMokiLumpSumDisplay();
  }
  updatePreview();
}
// (구버전 호환용 별칭 — 혹시 다른 곳에서 참조하더라도 안전하게 동작)
function resetMokiAmount() { resetAmount(); }

/**
 * 모키일시납 체크 상태에 따라 입력 UI 전환
 * @param {boolean} isMoki
 */
// isMoki=true  : 일시납 UI ON → data-mode="lump"
// isMoki=false, resetMode=true  : 다른 상품 전환 → 금액+data-mode 완전 초기화
// isMoki=false, resetMode=false : 모키일시납 체크만 OFF → 금액 유지, data-mode="lump" 유지
//                                  → 체크 OFF여도 사업비 미반영 일시납으로 계산
function toggleMokiLumpUI(isMoki, resetMode = false) {
  const label      = document.getElementById("amountLabel");
  const unitEl     = document.getElementById("amountUnit");
  const notice     = document.getElementById("mokiLumpNotice");
  const resetBtn   = document.getElementById("amtResetBtn");
  const input      = document.getElementById("monthlyAmount");

  if (isMoki) {
    label.innerHTML    = '<i class="fa-solid fa-piggy-bank"></i> 일시납 금액 <span class="moki-lump-label-badge">모키일시납</span>';
    unitEl.textContent = "원 (일시납)";
    input.placeholder  = "0";
    notice.style.display   = "flex";
    // 초기화 버튼은 상시 노출이므로 별도 표시 처리 불필요 (resetBtn.style.display 건드리지 않음)
    updateMokiLumpSumDisplay();
    input.setAttribute('data-mode', 'lump');    // 일시납 모드
  } else {
    label.innerHTML    = '<i class="fa-solid fa-won-sign"></i> 월 납입금액';
    unitEl.textContent = "원 / 월";
    input.placeholder  = "500,000";
    notice.style.display   = "none";
    // 초기화 버튼은 상시 노출 유지
    if (resetMode) {
      // 다른 상품(레벨UP·적립식)으로 전환 → 금액 초기화 + monthly 모드
      input.value = "500,000";
      input.setAttribute('data-mode', 'monthly');
    }
    // resetMode=false(모키일시납 체크 OFF만): 금액 유지 + data-mode="lump" 유지
    // → 체크 OFF여도 일시납 금액 그대로, 사업비 미반영 일시납으로 계산
  }
}

// ═══════════════════════════════════════════════════════════
// 🔀 크로스체크: 레벨UP vs 모키적립식 동시비교
// ═══════════════════════════════════════════════════════════

/** 크로스체크 체크박스 ON/OFF 핸들러 */
function onCrossCheckChange() {
  const crossEl  = document.getElementById("crossCheck");
  const lvlEl    = document.getElementById("levelupCheck");
  const expEl    = document.getElementById("expenseCheck");
  const mokiEl   = document.getElementById("mokiCheck");
  const lvlLabel = document.querySelector(".etab-levelup");
  const expLabel = document.querySelector(".etab-standard");
  const mokiLabel= document.querySelector(".etab-moki");

  if (crossEl.checked) {
    // ── 크로스체크 ON ──────────────────────────────────────
    // 현재 상태 스냅샷 저장 (원복용)
    _crossCheckSnapshot = {
      levelup:  lvlEl?.checked  || false,
      expense:  expEl?.checked  || false,
      moki:     mokiEl?.checked || false,
      funds: FUND_DATA.map(f => ({
        id: f.id,
        ratio: parseFloat(document.getElementById("ratio_" + f.id)?.value) || 0
      })),
      amount: document.getElementById("monthlyAmount")?.value || "500,000",
      dataMode: document.getElementById("monthlyAmount")?.getAttribute("data-mode") || "monthly"
    };

    // 기존 체크박스 모두 해제 + 잠금
    if (lvlEl)  lvlEl.checked  = false;
    if (expEl)  expEl.checked  = false;
    if (mokiEl) mokiEl.checked = false;
    toggleLevelupUI(false);
    toggleMokiLumpUI(false, true);
    if (lvlLabel)  lvlLabel.classList.add("cross-locked");
    if (expLabel)  expLabel.classList.add("cross-locked");
    if (mokiLabel) mokiLabel.classList.add("cross-locked");

    // MMF 20% + AI최적(샤프) 80% 자동 적용
    applyCrossCheckPortfolio();

    // 상태 배지 업데이트
    updateExpenseStatusBadge();
    showCrossCheckToast();

  } else {
    // ── 크로스체크 OFF → 원복 ──────────────────────────────
    if (lvlLabel)  lvlLabel.classList.remove("cross-locked");
    if (expLabel)  expLabel.classList.remove("cross-locked");
    if (mokiLabel) mokiLabel.classList.remove("cross-locked");

    if (_crossCheckSnapshot) {
      // 펀드 비율 원복
      _crossCheckSnapshot.funds.forEach(f => setFundRatio(f.id, f.ratio));
      // 금액 원복
      const amtEl = document.getElementById("monthlyAmount");
      if (amtEl) {
        amtEl.value = _crossCheckSnapshot.amount;
        amtEl.setAttribute("data-mode", _crossCheckSnapshot.dataMode);
      }
      // 체크박스 원복
      if (lvlEl && _crossCheckSnapshot.levelup) {
        lvlEl.checked = true;
        toggleLevelupUI(true);
      }
      if (expEl && _crossCheckSnapshot.expense) {
        expEl.checked = true;
      }
      if (mokiEl && _crossCheckSnapshot.moki) {
        mokiEl.checked = true;
        toggleMokiLumpUI(true);
      }
      _crossCheckSnapshot = null;
    } else {
      // 스냅샷 없으면 기본값으로
      setDefaultRatios();
      toggleLevelupUI(false);
      toggleMokiLumpUI(false, true);
    }
    validateRatios();
    updateExpenseStatusBadge();
  }
}

/**
 * 동시체크 포트폴리오 자동 세팅
 * ─────────────────────────────────────────────
 * 레벨UP은 MMF형(VU40000) 20% 의무편입 규정이 있으므로,
 * 모키적립식과 동일 조건으로 비교하려면 양쪽 모두
 * MMF 20% 고정 + 나머지 80%를 AI(샤프비율) 최적배분해야 함.
 *
 * 알고리즘:
 *  1) MMF(VU40000) → 20% 고정
 *  2) MMF 제외 나머지 펀드 중 샤프비율 양수(+) 상위 5개 선정
 *  3) 샤프비율 비중대로 80% 배분 (5% 단위 반올림)
 *  4) normalizeWeightsWithMMF()로 합계 100% 보정
 *  5) 전체 슬라이더·디스플레이 일괄 갱신
 */
function applyCrossCheckPortfolio() {
  const MMF_ID = "VU40000";
  const stats  = calcFundStats();

  // ① 전체 0으로 초기화 먼저
  FUND_DATA.forEach(f => setFundRatio(f.id, 0));

  // ② MMF 20% 즉시 고정 세팅
  setFundRatio(MMF_ID, 20);

  // ③ MMF 제외 샤프비율 상위 5개에 80% 배분
  const nonMMF    = stats.filter(f => f.id !== MMF_ID);
  const positives = nonMMF.filter(f => f.sharpe > 0).sort((a, b) => b.sharpe - a.sharpe);
  const topN      = positives.length > 0 ? positives.slice(0, 5) : nonMMF.slice(0, 5);

  const totalSharpe = topN.reduce((a, f) => a + Math.max(0, f.sharpe), 0);

  // 5% 단위로 배분
  let assigned = {};
  topN.forEach(f => { assigned[f.id] = 0; });

  if (totalSharpe > 0) {
    topN.forEach(f => {
      assigned[f.id] = Math.round((Math.max(0, f.sharpe) / totalSharpe) * 80 / 5) * 5;
    });
  } else {
    const eq = Math.round(80 / topN.length / 5) * 5;
    topN.forEach(f => { assigned[f.id] = eq; });
  }

  // ④ 합계 80%가 되도록 오차 보정 (최대 비중 펀드에 나머지 몰아주기)
  let otherSum = Object.values(assigned).reduce((a, b) => a + b, 0);
  const diff   = 80 - otherSum;
  if (diff !== 0 && topN.length > 0) {
    const maxId = topN.reduce((a, b) =>
      (assigned[a.id] || 0) >= (assigned[b.id] || 0) ? a : b
    ).id;
    assigned[maxId] = Math.max(0, (assigned[maxId] || 0) + diff);
  }

  // ⑤ 슬라이더 직접 반영 (MMF는 이미 20으로 세팅됨)
  Object.entries(assigned).forEach(([id, val]) => setFundRatio(id, val));

  // ⑥ MMF 20% 최종 재확인 (혹시 다른 로직이 건드렸을 경우 대비)
  setFundRatio(MMF_ID, 20);

  // ⑦ 파이차트 즉시 갱신
  updatePreview();
}

/** 크로스체크 활성 알림 토스트 */
function showCrossCheckToast() {
  let toast = document.getElementById("crossToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "crossToast";
    toast.style.cssText = `
      position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
      background:linear-gradient(135deg,#4b5a96,#b98d2e);
      color:white; padding:12px 24px; border-radius:40px;
      font-size:13px; font-weight:700; z-index:9999;
      box-shadow:0 4px 20px rgba(245,124,0,0.4);
      animation:toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
      white-space:nowrap;
    `;
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<i class="fa-solid fa-code-compare"></i>&nbsp; 동시체크 활성 — MMF형 20% 고정 + AI최적 80% 자동배분 완료 · 제안서 생성 시 레벨UP vs 모키 나란히 비교!`;
  toast.style.display = "block";
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = "none"; }, 4000);
}

/** 크로스체크 활성 여부 확인 */
function isCrossChecked() {
  return document.getElementById("crossCheck")?.checked || false;
}

// ─── 사업비 체크박스 동시체크 방지 + 레벨UP 세팅 ────
function onExpenseGroupChange(clicked) {
  const expEl  = document.getElementById("expenseCheck");
  const lvlEl  = document.getElementById("levelupCheck");
  const mokiEl = document.getElementById("mokiCheck");

  // 크로스체크 ON 상태에서 개별 체크박스 클릭 시 → 크로스체크 해제 후 진행
  const crossEl = document.getElementById("crossCheck");
  if (crossEl?.checked) {
    crossEl.checked = false;
    onCrossCheckChange();  // 원복 처리
  }

  // 3개 체크박스 중 하나만 선택 가능 (라디오 버튼처럼 동작)
  if (clicked === 'standard') {
    if (lvlEl)  lvlEl.checked  = false;
    if (mokiEl) mokiEl.checked = false;
    toggleLevelupUI(false);
    toggleMokiLumpUI(false, true);  // resetMode=true: 다른 상품 전환 → 금액+모드 초기화
  }
  if (clicked === 'levelup') {
    if (lvlEl?.checked) {
      if (expEl)  expEl.checked  = false;
      if (mokiEl) mokiEl.checked = false;
      toggleLevelupUI(true);
      toggleMokiLumpUI(false, true);  // resetMode=true: 다른 상품 전환 → 금액+모드 초기화
      applyLevelupDefaultRatios();
    } else {
      toggleLevelupUI(false);
      setDefaultRatios();
    }
  }
  if (clicked === 'moki') {
    if (mokiEl?.checked) {
      // 모키일시납 체크 ON → 일시납 UI 전환
      if (expEl) expEl.checked  = false;
      if (lvlEl) lvlEl.checked  = false;
      toggleLevelupUI(false);
      toggleMokiLumpUI(true);           // 일시납 UI ON, data-mode="lump"
    } else {
      // 모키일시납 체크 OFF → UI만 복구, 금액·data-mode 유지 (사업비 미반영 일시납 유지)
      toggleMokiLumpUI(false, false);   // resetMode=false: 금액 유지
    }
  }
  validateRatios();
  updateExpenseStatusBadge();

  // ★★ 페이지2 활성화 상태에서 체크 변경 시 → proposalData 갱신 + 차트 재렌더
  //    (페이지2에서 체크박스를 바꾸면 proposalData가 구버전 상태로 남아 차트가 오작동)
  if (document.getElementById("page2")?.classList.contains("active") && Object.keys(proposalData).length > 0) {
    // 실시간 DOM에서 최신 체크 상태 읽어서 proposalData 갱신
    const _mokiApplied    = document.getElementById("mokiCheck")?.checked    || false;
    const _levelupApplied = document.getElementById("levelupCheck")?.checked || false;
    const _expenseApplied = document.getElementById("expenseCheck")?.checked || false;
    const _inputMode      = document.getElementById("monthlyAmount")?.getAttribute("data-mode");
    const _isMokiLump     = (_mokiApplied === true) ? true : (_inputMode === "lump");

    proposalData = {
      ...proposalData,
      mokiApplied:    _mokiApplied,
      levelupApplied: _levelupApplied,
      expenseApplied: _expenseApplied,
      isMokiLump:     _isMokiLump
    };

    // 테이블 + 차트 전체 재렌더 (300ms 후 — DOM 완전히 세팅되고 나서)
    renderSimTable();
    setTimeout(() => {
      renderSimChart();
      renderSimLineChart();
      renderSimCards();
    }, 300);
  }
}

// ─── 펀드 비율 테이블 빌드 ────────────────────────
function buildFundRatioTable() {
  // 테이블 tbody 대신 슬라이더 카드 컨테이너에 렌더링
  const tbody = document.getElementById("fundRatioBody");
  tbody.innerHTML = "";

  // 테이블 thead 숨김 (슬라이더 UI에서는 불필요)
  const thead = tbody.closest("table")?.querySelector("thead");
  if (thead) thead.style.display = "none";

  FUND_DATA.forEach(fund => {
    const rm1 = fund.returns.m1;
    const rm3 = fund.returns.m3;
    const r1  = fund.returns.y1;
    const r3y = fund.returns.y3;

    // 대표 기업 태그
    let keyHoldings;
    if (fund.id === "VU63300") {
      keyHoldings = ["INVESCO QQQ", "NVIDIA", "Apple", "Tesla"];
    } else {
      keyHoldings = fund.top10Holdings
        .slice(0, 4)
        .map(h => h.name.split(" ")[0].split("(")[0].trim())
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 4);
    }

    const fmtR = v => `<span class="${v >= 0 ? 'pos' : 'neg'}">${v >= 0 ? '+' : ''}${v.toFixed(2)}%</span>`;

    const tr = document.createElement("tr");
    tr.className = "slider-row";
    tr.innerHTML = `
      <td colspan="7" class="slider-card-cell">
        <div class="slider-card" id="scard_${fund.id}">

          <!-- 상단: 펀드명 + 비율 숫자 -->
          <div class="sc-top">
            <div class="sc-name-wrap">
              <span class="sc-dot" style="background:${fund.color}"></span>
              <span class="sc-name-stack"><span class="sc-name">${fundHeadline(fund)}</span><span class="sc-sub">${fund.name} <span class="sc-code">${fund.code}</span>${typeof hanhoFundRate === 'function' ? ` · <b class="sc-expect" title="최근 3년 연환산 ${hanhoFundRate(fund).c3.toFixed(1)}% · 설정 후 연환산 ${hanhoFundRate(fund).ci.toFixed(1)}% · 상한 ${hanhoFundRate(fund).cap}%">기대 연 ${hanhoFundRate(fund).rate.toFixed(1)}%</b>` : ''}</span></span>
              <span class="type-badge type-${fund.riskLevel}">${fund.type}</span>
            </div>
            <div class="sc-ratio-display">
              <span class="sc-ratio-val" id="rdisplay_${fund.id}">0</span>
              <span class="sc-ratio-pct">%</span>
              <!-- 숫자 직접 입력 (숨김 → 클릭 시 토글) -->
              <input type="number" class="ratio-input" id="ratio_${fund.id}"
                min="0" max="100" step="5" value="0"
                style="display:none;"
                onchange="syncSliderFromInput('${fund.id}')"
                oninput="syncSliderFromInput('${fund.id}')" />
            </div>
          </div>

          <!-- 슬라이더 트랙 -->
          <div class="sc-slider-wrap">
            <input type="range" class="sc-slider" id="slider_${fund.id}"
              min="0" max="100" step="5" value="0"
              style="--slider-color: ${fund.color};"
              oninput="syncInputFromSlider('${fund.id}')" />
            <div class="sc-track-fill" id="fill_${fund.id}"
              style="width:0%; background:${fund.color};"></div>
          </div>

          <!-- 하단: 수익률 태그 + 종목 태그 -->
          <div class="sc-bottom">
            <div class="sc-rets">
              <span class="sc-ret-item"><span class="sc-ret-label">1개월</span>${fmtR(rm1)}</span>
              <span class="sc-ret-item"><span class="sc-ret-label">3개월</span>${fmtR(rm3)}</span>
              <span class="sc-ret-item"><span class="sc-ret-label">1년</span>${fmtR(r1)}</span>
              <span class="sc-ret-item"><span class="sc-ret-label">3년</span>${fmtR(r3y)}</span>
            </div>
            <div class="sc-tags" style="display:none">
              ${keyHoldings.map(k => `<span class="ks-tag">${k}</span>`).join("")}
            </div>
          </div>

        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ─── 슬라이더 ↔ 숫자 입력 동기화 ────────────────────
function syncInputFromSlider(id) {
  const slider = document.getElementById("slider_" + id);
  const input  = document.getElementById("ratio_"  + id);
  const disp   = document.getElementById("rdisplay_" + id);
  const fill   = document.getElementById("fill_"   + id);
  const card   = document.getElementById("scard_"  + id);
  if (!slider) return;

  // 동시체크 또는 레벨UP 중 MMF 슬라이더 조작 시 → 20% 강제 고정
  if (id === "VU40000" && (isCrossChecked() || isLevelupChecked())) {
    slider.value = 20;
    if (input) input.value      = 20;
    if (disp)  disp.textContent = 20;
    if (fill)  fill.style.width = "20%";
    showCrossMMFWarning();
    validateRatios();
    return;
  }

  let val = parseFloat(slider.value) || 0;

  // ── 100% 초과 방지: 다른 펀드 합계 구해서 남은 여유분 계산 ──
  let otherTotal = 0;
  FUND_DATA.forEach(f => {
    if (f.id !== id) {
      otherTotal += parseFloat(document.getElementById("ratio_" + f.id)?.value) || 0;
    }
  });
  const maxAllowed = Math.max(0, 100 - otherTotal);
  if (val > maxAllowed) {
    val = maxAllowed;
    slider.value = val;  // 슬라이더도 강제 복원
    showOverLimitToast();
  }

  if (input)  input.value       = val;
  if (disp)   disp.textContent  = val;
  if (fill)   fill.style.width  = val + "%";
  if (card)   card.classList.toggle("zero-ratio", val === 0);
  validateRatios();
}

function syncSliderFromInput(id) {
  const input  = document.getElementById("ratio_"  + id);
  const slider = document.getElementById("slider_" + id);
  const disp   = document.getElementById("rdisplay_" + id);
  const fill   = document.getElementById("fill_"   + id);
  const card   = document.getElementById("scard_"  + id);
  if (!input) return;

  // 동시체크 또는 레벨UP 중 MMF 직접 입력 시 → 20% 강제 고정
  if (id === "VU40000" && (isCrossChecked() || isLevelupChecked())) {
    input.value = 20;
    if (slider) slider.value      = 20;
    if (disp)   disp.textContent  = 20;
    if (fill)   fill.style.width  = "20%";
    showCrossMMFWarning();
    validateRatios();
    return;
  }

  let val = Math.min(100, Math.max(0, parseFloat(input.value) || 0));

  // ── 100% 초과 방지 ──
  let otherTotal = 0;
  FUND_DATA.forEach(f => {
    if (f.id !== id) {
      otherTotal += parseFloat(document.getElementById("ratio_" + f.id)?.value) || 0;
    }
  });
  const maxAllowed = Math.max(0, 100 - otherTotal);
  if (val > maxAllowed) {
    val = maxAllowed;
    input.value = val;  // 입력창도 강제 보정
    showOverLimitToast();
  }

  if (slider) slider.value      = val;
  if (disp)   disp.textContent  = val;
  if (fill)   fill.style.width  = val + "%";
  if (card)   card.classList.toggle("zero-ratio", val === 0);
  validateRatios();
}

// ─── 100% 초과 토스트 경고 ────────────────────────
let _overLimitTimer = null;
function showOverLimitToast() {
  let toast = document.getElementById("overLimitToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "overLimitToast";
    toast.className = "over-limit-toast";
    toast.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> 합계 100%를 초과할 수 없습니다!';
    document.body.appendChild(toast);
  }
  toast.classList.add("show");
  clearTimeout(_overLimitTimer);
  _overLimitTimer = setTimeout(() => toast.classList.remove("show"), 2000);
}

// ─── 비율 유효성 검사 ──────────────────────────────
function validateRatios() {
  // 레벨UP 또는 동시체크 모드 시 MMF 20% 의무 보정 먼저
  if (isLevelupChecked() || isCrossChecked()) {
    enforceLevelupMMF();
  }
  let total = 0;
  FUND_DATA.forEach(f => {
    const v = parseFloat(document.getElementById("ratio_" + f.id)?.value) || 0;
    total += v;
  });
  total = Math.round(total * 100) / 100;
  // null 안전 처리 — totalRatioDisplay 없어도 에러 없이 계속 진행
  const display = document.getElementById("totalRatioDisplay");
  if (display) {
    display.textContent = `합계: ${total}%`;
    display.className = Math.abs(total - 100) < 0.01 ? "ratio-total ok" : "ratio-total over";
  }
  updatePreview();  // 항상 호출
}

// ─── 파이차트 & 예상수익률 업데이트 ──────────────────
function updatePreview() {
  const labels = [], data = [], colors = [];
  let avg1y = 0, avg3y = 0, totalRatio = 0;

  FUND_DATA.forEach(f => {
    const ratio = parseFloat(document.getElementById("ratio_" + f.id)?.value) || 0;
    if (ratio > 0) {
      labels.push(f.name);
      data.push(ratio);
      colors.push(f.color);
      avg1y += (ratio / 100) * f.returns.y1;
      avg3y += (ratio / 100) * f.returns.y3;
      totalRatio += ratio;
    }
  });

  if (totalRatio > 0) {
    avg1y = avg1y * (100 / totalRatio);
    avg3y = avg3y * (100 / totalRatio);
  }

  // 한호 2.1.0: 3년 누적을 5년으로 늘린 추정 대신, 펀드별 기대수익률 가중평균(연)을 보여 준다
  const avg5y = hanhoPortfolioRate(hanhoWeightsFromDom()) * 100;

  // 한호 2.1.1: 기대수익률 펀드별 내역
  const _ed = document.getElementById("expectDetail");
  if (_ed) {
    const _w = hanhoWeightsFromDom();
    _ed.innerHTML = '<table><tr><th>펀드</th><th>비중</th><th>지난 1년</th><th>기대(연)</th></tr>' +
      FUND_DATA.filter(f => _w[f.id] > 0).map(f => { const x = hanhoFundRate(f);
        return `<tr><td>${f.name}</td><td>${_w[f.id]}%</td><td>${f.returns.y1 >= 0 ? '+' : ''}${f.returns.y1.toFixed(2)}%</td><td><b>${x.rate.toFixed(1)}%</b><br><small>${x.by === '상한' ? '유형 상한' : x.by}</small></td></tr>`; }).join('') +
      `<tr class="sum"><td>비중대로 섞으면</td><td>100%</td><td>${(avg1y >= 0 ? '+' : '') + avg1y.toFixed(2)}%</td><td><b>${avg5y.toFixed(2)}%</b></td></tr></table>`;
  }
  const r1El = document.getElementById("avgReturn1y");
  const r3El = document.getElementById("avgReturn3y");
  const r5El = document.getElementById("avgReturn5y");

  if (r1El) {
    r1El.textContent = `${avg1y >= 0 ? '+' : ''}${avg1y.toFixed(2)}%`;
    r1El.className = `return-value ${avg1y >= 0 ? 'pos' : 'neg'}`;
  }
  if (r3El) {
    r3El.textContent = `${avg3y >= 0 ? '+' : ''}${avg3y.toFixed(2)}%`;
    r3El.className = `return-value ${avg3y >= 0 ? 'pos' : 'neg'}`;
  }
  if (r5El) {
    r5El.textContent = `${avg5y >= 0 ? '+' : ''}${avg5y.toFixed(2)}%`;
    r5El.className = `return-value ${avg5y >= 0 ? 'pos' : 'neg'}`;
  }

  // ─── 고객투자 프로파일 수익률도 실시간 동기화 ────────────────
  // (page2가 이미 렌더된 경우 pfReturn1y/3y/5y DOM에도 즉시 반영)
  const pf1El = document.getElementById("pfReturn1y");
  const pf3El = document.getElementById("pfReturn3y");
  const pf5El = document.getElementById("pfReturn5y");
  if (pf1El) {
    pf1El.textContent = `${avg1y >= 0 ? '+' : ''}${avg1y.toFixed(2)}%`;
    pf1El.className = `pf-ret-value ${avg1y >= 0 ? 'pos' : 'neg'}`;
  }
  if (pf3El) {
    pf3El.textContent = `${avg3y >= 0 ? '+' : ''}${avg3y.toFixed(2)}%`;
    pf3El.className = `pf-ret-value ${avg3y >= 0 ? 'pos' : 'neg'}`;
  }
  if (pf5El) {
    // 5년 누적추정: formatPctComma 사용 (소수점 2자리)
    const fmt5y = typeof formatPctComma === 'function' ? formatPctComma(avg5y) : avg5y.toFixed(2);
    pf5El.textContent = `${avg5y >= 0 ? '+' : ''}${fmt5y}%`;
    pf5El.className = `pf-ret-value ${avg5y >= 0 ? 'pos' : 'neg'}`;
  }

  drawPieChart("pieChart", labels, data, colors);

  const legendEl = document.getElementById("pieChartLegend");
  if (legendEl) {
    legendEl.innerHTML = labels.map((l, i) =>
      `<div class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span>${(() => { const ff = FUND_DATA.find(x => x.name === l); return ff ? fundStack(ff) : l; })()}<b class="legend-pct">${data[i]}%</b></div>`
    ).join('');
  }
}

// ─── 컨트롤타워 스타일 포트폴리오 미리보기 (홈페이지 메인 히어로 응용) ───
// 도넛 뒤에 금색 링·후광, 앞에 허브(가운데)와 펀드별 위성 노드(%)를 그린다. #pieChart 에만 붙는다.
// 2026-10-07 상무님 지시: 입체 도넛·위성 고리를 걷어내고 평면 도넛 + 가운데 합계만 표시 (전문 증권 화면 톤)
const cpTowerPlugin = {
  id: 'cpTower',
  afterDatasetsDraw(chart) {
    const meta = chart.getDatasetMeta(0), ds = chart.data.datasets[0];
    if (!meta.data.length) return;
    const ctx = chart.ctx, font = '"Noto Sans KR","Malgun Gothic",sans-serif';
    const g0 = meta.data[0].getProps(['x', 'y', 'outerRadius', 'innerRadius'], true);
    const x = g0.x, y = g0.y, ir = g0.innerRadius;
    const sum = (ds.data || []).reduce((t, v) => t + (+v || 0), 0);
    const n = (ds.data || []).filter(v => v > 0).length;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#EEF1F6'; ctx.font = '800 ' + Math.round(ir * 0.46) + 'px ' + font;
    ctx.fillText(sum + '%', x, y - ir * 0.10);
    ctx.fillStyle = '#8FA3C7'; ctx.font = '500 ' + Math.max(10, Math.round(ir * 0.20)) + 'px ' + font;
    ctx.fillText(n + '개 펀드', x, y + ir * 0.34);
    ctx.restore();
  }
};

function drawPieChart(canvasId, labels, data, colors) {
  const canvasEl = document.getElementById(canvasId);
  if (!canvasEl) return;

  // ★ Chart.js CDN 로딩 실패 방어 코드 (방화벽/광고차단기 등으로 스크립트가 안 불러진 경우)
  //   콘솔 에러 없이 "그냥 안 보이는" 현상을 방지 — 사용자에게 명시적 안내 표시
  if (typeof Chart === "undefined") {
    const wrap = canvasEl.closest(".chart-container");
    if (wrap && !wrap.querySelector(".chart-fail-msg")) {
      const msg = document.createElement("div");
      msg.className = "chart-fail-msg";
      msg.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;color:#14315c;padding:12px;line-height:1.5;";
      msg.innerHTML = "⚠️ 차트 라이브러리 로딩 실패<br>네트워크/방화벽 문제일 수 있습니다.<br>새로고침(F5) 또는 다른 네트워크에서 시도해주세요.";
      wrap.appendChild(msg);
    }
    return;
  }

  const ctx = canvasEl.getContext("2d");
  if (!ctx) return;
  const total = data.reduce((a, b) => a + b, 0);
  const cpWrap = canvasEl.closest(".chart-container");
  if (total === 0) {
    if (canvasId === "pieChart" && pieChartInstance) { pieChartInstance.destroy(); pieChartInstance = null; }
    if (cpWrap && canvasId === "pieChart") cpWrap.classList.remove("has-chart");
    return;
  }
  const cfg = {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: "#fff" }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw}%` } }
      }
    }
  };
  if (canvasId === "pieChart") {
    // 컨트롤타워 스타일: 위성 노드가 들어갈 여백 + 어두운 슬라이스 경계
    cfg.options.layout = { padding: 6 };
    cfg.options.cutout = "66%";
    cfg.data.datasets[0].borderColor = "#0F1D38";
    cfg.data.datasets[0].borderWidth = 2;
    cfg.plugins = [cpTowerPlugin];
    if (cpWrap) cpWrap.classList.add("has-chart");
    if (pieChartInstance) pieChartInstance.destroy();
    pieChartInstance = new Chart(ctx, cfg);
  } else if (canvasId === "pieChart2") {
    if (pieChart2Instance) pieChart2Instance.destroy();
    pieChart2Instance = new Chart(ctx, cfg);
  }
}

// ─── 프리셋 적용 ────────────────────────────────
function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;
  // setFundRatio() 통합 세터로 슬라이더+fill+display 동시 업데이트
  FUND_DATA.forEach(f => setFundRatio(f.id, preset[f.id] || 0));
  validateRatios();   // → updatePreview() 자동 호출 → 가중평균/프로파일 수익률 즉시 반영
  hideAIResult();
  // 프리셋 적용 토스트 (선택적 피드백)
  showPresetToast(name);
}

function resetRatios() {
  setDefaultRatios();
  hideAIResult();
}

// ─── AI 추천 포트폴리오 ──────────────────────────
// 각 펀드의 샤프비율 계산 기반 최적화
// 샤프 = 연수익률(추정) / 연변동성(추정)
// 변동성은 단기 수익률 분산으로 추정

function calcFundStats() {
  return FUND_DATA.map(f => {
    const r1 = f.returns.y1;
    const r3y = f.returns.y3;
    const r1m = f.returns.m1 * 12;  // 월간→연환산
    const r3m = f.returns.m3 * 4;   // 분기→연환산

    // 연수익률: 4개 데이터 가중 평균
    const annualReturn = r1 * 0.35 + (Math.pow(1 + r3y / 100, 1 / 3) - 1) * 100 * 0.35 + r1m * 0.15 + r3m * 0.15;

    // 변동성 추정: 수익률 편차의 표준편차(간이)
    const returns = [r1m, r3m, r1, (Math.pow(1 + r3y / 100, 1 / 3) - 1) * 100];
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    // 샤프비율 (무위험수익률 3.5% 가정)
    const sharpe = volatility > 0 ? (annualReturn - 3.5) / volatility : 0;

    // 모멘텀 스코어: 단기 수익률 강세
    const momentum = r1 * 0.5 + r3m * 0.3 + r1m * 0.2;

    return { ...f, annualReturn, volatility, sharpe, momentum };
  });
}

function applyAIRecommend(type) {
  const stats = calcFundStats();
  let weights = {};
  let methodName = "";
  let methodDesc = "";
  let emoji = "";

  // ── MMF 20% 고정 모드 판정 ──────────────────────────────
  // 레벨UP 체크 OR 동시체크(crossCheck) ON → 어떤 AI 버튼을 눌러도 MMF 20% 강제 고정
  const levelupMode = isLevelupChecked() || isCrossChecked();
  const MMF_ID = "VU40000";
  const FREE_BUDGET = levelupMode ? 80 : 100;  // 고정 모드: 나머지 80%만 AI 배분

  // MMF 제외 stats (고정 모드 시 배분 대상에서 제외)
  const targetStats = levelupMode
    ? stats.filter(f => f.id !== MMF_ID)
    : stats;

  if (type === "sharpe") {
    emoji = "📈";
    methodName = "수익 최적형 (샤프비율 극대화)";
    methodDesc = levelupMode
      ? "MMF형 20% 고정 후, 나머지 80%를 위험 대비 수익이 가장 높은 펀드에 집중 배분합니다."
      : "위험 대비 수익이 가장 높은 펀드에 집중 배분합니다.";

    const positives = targetStats.filter(f => f.sharpe > 0).sort((a, b) => b.sharpe - a.sharpe);
    const topN = positives.slice(0, 5);
    const totalSharpe = topN.reduce((a, f) => a + f.sharpe, 0);
    FUND_DATA.forEach(f => { weights[f.id] = 0; });
    if (totalSharpe > 0) {
      topN.forEach(f => {
        weights[f.id] = Math.round((f.sharpe / totalSharpe) * FREE_BUDGET / 5) * 5;
      });
    } else {
      topN.forEach(f => { weights[f.id] = Math.round(FREE_BUDGET / Math.max(topN.length, 1) / 5) * 5; });
    }

  } else if (type === "lowrisk") {
    emoji = "🛡️";
    methodName = "안전 우선형 (최소 분산 전략)";
    methodDesc = levelupMode
      ? "MMF형 100%로 원금 변동을 가장 작게 하는 편성입니다."
      : "MMF형 100%로 원금 변동을 가장 작게 하는 편성입니다.";

    // 한호 2.5.2 (2026-11-17 주성씨 지시: "안전 우선형은 MMF 100%"): 레벨UP·동시체크여도 MMF 100%
    FUND_DATA.forEach(f => { weights[f.id] = 0; });
    weights["VU40000"] = 100;

  } else if (type === "balanced") {
    emoji = "🤖";
    methodName = "AI 균형 최적형 (다각화 최적화)";
    methodDesc = levelupMode
      ? "MMF형 20% 고정 후, 나머지 80%를 수익·안정·분산투자를 동시에 고려한 AI 최적 배분합니다."
      : "수익·안정·분산투자를 동시에 고려한 AI 최적 포트폴리오입니다. 지역·자산 다각화를 포함합니다.";

    // 한호 2.3.0 (2026-11-16 주성씨 지시): 지금은 미국주식형II 100% (레벨UP·동시체크는 MMF 20% + 미국주식형II 80%)
    FUND_DATA.forEach(f => { weights[f.id] = 0; });
    weights["VU63300"] = FREE_BUDGET;

  } else if (type === "target") {
    // 한호 2.3.0: 예상 수익률 설정 — 입력한 목표 연수익률에 가장 가까운 편성
    const T = parseFloat(document.getElementById("hhTargetRate")?.value) || 0;
    const fx = levelupMode ? 20 : 0;
    const mix = hhTargetMix(T, fx);
    const lo = hhTargetMix(0, fx).rate, hi = hhTargetMix(99, fx).rate;
    emoji = "🎯";
    methodName = `예상 수익률 설정 (목표 연 ${T}%)`;
    methodDesc = `성장형(미국·일본·인덱스)과 안정형(MMF·달러)을 섞어 목표에 가장 가까운 연 ${mix.rate.toFixed(2)}%로 편성했습니다.` +
      (T < lo - 0.3 || T > hi + 0.3 ? ` 목표 연 ${T}%는 편성 가능한 범위(연 ${lo.toFixed(1)}~${hi.toFixed(1)}%)를 벗어나 가장 가까운 값으로 맞췄습니다.` : '');
    weights = mix.w;
  } else if (type === "momentum") {
    emoji = "🔥";
    methodName = "모멘텀 집중형 (최근 강세 집중)";
    methodDesc = levelupMode
      ? "MMF형 20% 고정 후, 나머지 80%를 최근 1년·3개월 수익률이 가장 높은 펀드에 집중 배분합니다."
      : "최근 1년·3개월 수익률이 가장 높은 펀드에 집중 배분합니다.";

    const sorted = [...targetStats].sort((a, b) => b.momentum - a.momentum).slice(0, 4);
    const totalMom = sorted.reduce((a, f) => a + Math.max(0, f.momentum), 0);
    FUND_DATA.forEach(f => { weights[f.id] = 0; });
    if (totalMom > 0) {
      sorted.forEach(f => {
        weights[f.id] = Math.round((Math.max(0, f.momentum) / totalMom) * FREE_BUDGET / 5) * 5;
      });
    } else {
      sorted.forEach(f => { weights[f.id] = Math.round(FREE_BUDGET / Math.max(sorted.length, 1) / 5) * 5; });
    }
  }

  // MMF 20% 고정 모드: MMF 20% 세팅 (레벨UP 또는 동시체크)
  if (levelupMode && type !== "lowrisk") {   // 2.5.2: 안전 우선형은 MMF 100% 그대로
    weights[MMF_ID] = 20;
  }

  // 합계 100% 보정 (고정 모드: MMF 제외 나머지 80% 재정규화)
  weights = normalizeWeightsWithMMF(weights, levelupMode);

  // 적용 — setFundRatio() 통합 세터로 슬라이더+fill+display 동시 업데이트
  FUND_DATA.forEach(f => setFundRatio(f.id, weights[f.id] || 0));

  // setTimeout(0): 브라우저 렌더링 큐를 한 번 비운 뒤 실행
  // → setFundRatio로 input.value 세팅이 DOM에 완전히 반영된 후 읽기 보장
  setTimeout(function() {
    validateRatios();  // → updatePreview() → 파이차트 + 수익률 즉시 반영
    showAIResult(type, weights, emoji, methodName, methodDesc, stats);

    // ★ 수치 일치 검증 (콘솔 자동 체크)
    setTimeout(function() {
      const rightVal = document.getElementById('avgReturn5y')?.textContent?.trim() || '';
      const aiVal    = document.querySelector('#aiResultBox .ai-ret-value')?.textContent?.trim() || '';
      const match    = rightVal === aiVal;
      console.log(
        `[수익률 검증] 우측 1년평균: ${rightVal} | AI박스 최종적용: ${aiVal} | 일치여부: ${match ? '✅ OK' : '❌ 불일치!'}`
      );
      if (!match) {
        console.warn('[수익률 검증 실패] showAIResult finalAnnual과 updatePreview avg1y 불일치!');
      }
    }, 80);
  }, 0);
}

function normalizeWeights(weights) {
  let total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total === 0) return weights;

  const keys = Object.keys(weights).filter(k => weights[k] > 0);
  if (keys.length === 0) return weights;

  const scale = 100 / total;
  let adjusted = {};
  Object.keys(weights).forEach(k => {
    adjusted[k] = Math.round(weights[k] * scale / 5) * 5;
  });

  let adjTotal = Object.values(adjusted).reduce((a, b) => a + b, 0);
  const diff = 100 - adjTotal;
  if (diff !== 0 && keys.length > 0) {
    const maxKey = keys.reduce((a, b) => adjusted[a] > adjusted[b] ? a : b);
    adjusted[maxKey] = Math.max(0, adjusted[maxKey] + diff);
  }
  return adjusted;
}

// ─── 레벨UP 전용 정규화: MMF 30% 고정, 나머지 70% 합산 보정 ──
function normalizeWeightsWithMMF(weights, levelupMode) {
  if (!levelupMode) return normalizeWeights(weights);

  const MMF_ID = "VU40000";
  // MMF 제외한 나머지 합산
  const otherKeys = Object.keys(weights).filter(k => k !== MMF_ID && weights[k] > 0);
  let otherTotal = otherKeys.reduce((a, k) => a + weights[k], 0);

  if (otherTotal === 0) {
    // 나머지가 없으면 MMF만
    const result = {};
    Object.keys(weights).forEach(k => { result[k] = 0; });
    result[MMF_ID] = 100;
    return result;
  }

  // 나머지 80%로 정규화 (5단위)
  const scale = 80 / otherTotal;
  let adjusted = {};
  Object.keys(weights).forEach(k => { adjusted[k] = 0; });
  adjusted[MMF_ID] = 20;
  otherKeys.forEach(k => {
    adjusted[k] = Math.round(weights[k] * scale / 5) * 5;
  });

  // 나머지 합 재보정 (20 + 나머지 = 100)
  let otherAdj = otherKeys.reduce((a, k) => a + adjusted[k], 0);
  const diff = 80 - otherAdj;
  if (diff !== 0 && otherKeys.length > 0) {
    const maxKey = otherKeys.reduce((a, b) => adjusted[a] > adjusted[b] ? a : b);
    adjusted[maxKey] = Math.max(0, adjusted[maxKey] + diff);
  }
  return adjusted;
}

function showAIResult(type, weights, emoji, methodName, methodDesc, stats) {
  const box = document.getElementById("aiResultBox");
  if (!box) return;

  // ── ① 수익률 계산 — updatePreview()와 100% 동일한 로직 복사 ──
  // updatePreview()는 ratio>0인 것만 합산 후 totalRatio로 정규화
  // showAIResult()도 동일하게 w>0인 것만 합산 후 totalW로 정규화
  let wavg1y    = 0;
  let wavg3yRaw = 0;
  let totalW    = 0;   // updatePreview의 totalRatio와 동일 역할
  let wavgAiModel = 0;

  FUND_DATA.forEach(f => {
    const w  = weights[f.id] || 0;
    const st = stats.find(s => s.id === f.id);
    if (w > 0) {                                  // ★ updatePreview와 동일: w>0인 것만
      wavg1y      += (w / 100) * f.returns.y1;
      wavg3yRaw   += (w / 100) * f.returns.y3;
      totalW      += w;
      if (st) wavgAiModel += (w / 100) * st.annualReturn;
    }
  });

  // ★ updatePreview와 동일: totalW>0 이면 항상 정규화 (100% 보정)
  if (totalW > 0) {
    wavg1y      = wavg1y      * (100 / totalW);
    wavg3yRaw   = wavg3yRaw   * (100 / totalW);
    wavgAiModel = wavgAiModel * (100 / totalW);
  }

  // 3년 누적 → 연환산 CAGR, 5년 추정 (updatePreview와 완전 동일 공식)
  const annual3y = Math.pow(1 + wavg3yRaw / 100, 1 / 3) - 1;
  const wavg3y   = wavg3yRaw;                              // 3년 누적 그대로
  const wavg5y   = (Math.pow(1 + annual3y, 5) - 1) * 100; // 5년 누적 추정

  // ★ 최종 연평균 수익률 = wavg1y — updatePreview의 avg1y와 완전히 동일값
  const finalAnnual = hanhoPortfolioRate(weights) * 100; // 한호 2.1.0: 1년 실적 대신 펀드별 기대수익률

  // ── ② 사업비 모드 감지 ──
  const expMode  = isExpenseChecked();   // 모키적립식
  const levelMode = isLevelupChecked();  // 레벨UP
  const mokiMode  = isMokiChecked();     // 모키일시납
  const monthly  = getMonthlyAmount();
  const annualRate = finalAnnual / 100;

  // ── ③ 사업비 모드별 라벨 ──
  let expenseBadge = "";
  if (levelMode) {
    expenseBadge = `<span class="ai-expense-badge levelup">🚀 레벨UP 사업비 반영</span>`;
  } else if (mokiMode) {
    expenseBadge = `<span class="ai-expense-badge moki">🐷 모키일시납 사업비 반영</span>`;
  } else if (expMode) {
    expenseBadge = `<span class="ai-expense-badge standard">📋 모키적립식 사업비 반영</span>`;
  } else {
    expenseBadge = `<span class="ai-expense-badge none">사업비 미반영</span>`;
  }

  // ── ④ 연도별 적립 예상액 계산 (사업비 모드별 완전 분기) ──
  const simRows = [1, 3, 5, 10].map(y => {
    let fv, principal, gain, expenseNote = "";

    if (mokiMode) {
      // ── 모키일시납: 일시납 원금 기준 ──
      principal = monthly;  // 일시납이므로 원금 그 자체
      const res = calcWithExpenseMokiLump(monthly, annualRate, y);
      fv = res.fv;
      gain = fv - principal;
      expenseNote = `<span class="ai-sim-exp">사업비 ${formatMoneyComma(Math.round(res.totalExpense))}원 차감</span>`;

    } else if (levelMode) {
      // ── 레벨UP: 한호 2.1.0 — 실제로 낸 돈 (상품설명서 20년납) ──
      principal = monthly * Math.min(y, 20) * 12;
      const res = calcWithExpenseLevelup(monthly, annualRate, y);
      fv = res.fv;
      gain = fv - principal;
      expenseNote = `<span class="ai-sim-exp">사업비 ${formatMoneyComma(Math.round(res.totalExpense))}원 차감</span>`;

    } else if (expMode) {
      // ── 모키적립식: 10년 납입 후 거치 ──
      principal = monthly * Math.min(y, 10) * 12;
      const res = calcWithExpense(monthly, annualRate, y);
      fv = res.fv;
      gain = fv - principal;
      expenseNote = `<span class="ai-sim-exp">사업비 ${formatMoneyComma(Math.round(res.totalExpense))}원 차감</span>`;

    } else {
      // ── 사업비 미반영: 단순 월복리 ──
      const n = y * 12;
      principal = monthly * n;
      const mRate = annualRate / 12;
      if (Math.abs(mRate) < 0.000001) { fv = principal; }
      else { fv = monthly * ((Math.pow(1 + mRate, n) - 1) / mRate); }
      gain = fv - principal;
      expenseNote = `<span class="ai-sim-exp no-exp">사업비 미반영</span>`;
    }

    const gainClass = gain >= 0 ? 'pos' : 'neg';
    const gainSign  = gain >= 0 ? '+' : '';
    return `
      <div class="ai-sim-row">
        <span class="ai-sim-yr">${y}년 후</span>
        <span class="ai-sim-p">${formatMoneyComma(Math.round(principal))}원</span>
        <span class="ai-sim-arrow">→</span>
        <span class="ai-sim-fv"><strong>${formatMoneyComma(Math.round(fv))}원</strong></span>
        <span class="ai-sim-gain ${gainClass}">(${gainSign}${formatMoneyComma(Math.round(gain))}원)</span>
        ${expenseNote}
      </div>`;
  }).join('');

  // ── ⑤ 더블체크 UI — 우측 수익률과 동일한 값 기준으로 표시 ──
  // AI모델 추정과 실제 1년 수익률의 차이가 클수록 편차 경고
  const diff = Math.abs(wavgAiModel - finalAnnual);
  const checkMatch = diff < 30;  // 30%p 이내면 OK (변액보험 수익률 특성상 범위 큼)
  const doubleCheckHtml = `
    <div class="ai-double-check">
      <div class="ai-dc-title">🔍 수익률 더블체크</div>
      <div class="ai-dc-row">
        <span class="ai-dc-label">AI 모델 점수용 수익률 (추천 순위에만 사용)</span>
        <span class="ai-dc-val ${wavgAiModel >= 0 ? 'pos' : 'neg'}">${wavgAiModel >= 0 ? '+' : ''}${wavgAiModel.toFixed(2)}%</span>
      </div>
      <div class="ai-dc-row">
        <span class="ai-dc-label">실제 1년 수익률 가중평균</span>
        <span class="ai-dc-val ${wavg1y >= 0 ? 'pos' : 'neg'}">${wavg1y >= 0 ? '+' : ''}${wavg1y.toFixed(2)}%</span>
      </div>
      <div class="ai-dc-row ai-dc-final">
        <span class="ai-dc-label">최종 적용 기대 연수익률 (우측과 동일)</span>
        <span class="ai-dc-val final ${finalAnnual >= 0 ? 'pos' : 'neg'}">${finalAnnual >= 0 ? '+' : ''}${finalAnnual.toFixed(2)}%</span>
        <span class="ai-dc-badge ${checkMatch ? 'ok' : 'warn'}">적립액 계산에 사용</span>
      </div>
    </div>`;

  // ── ⑥ HTML 렌더링 ──
  const amtLabel = mokiMode ? `일시납 ${document.getElementById("monthlyAmount").value}원` : `월 ${document.getElementById("monthlyAmount").value}원 적립`;

  box.innerHTML = `
    <div class="ai-result-inner">
      <div class="ai-result-top">
        <div class="ai-result-title">${emoji} ${methodName}</div>
        <div class="ai-result-desc">${methodDesc}</div>
        <div class="ai-expense-tag-row">${expenseBadge}</div>
      </div>

      <div class="ai-result-funds">
        ${FUND_DATA.filter(f => (weights[f.id] || 0) > 0)
          .sort((a, b) => (weights[b.id] || 0) - (weights[a.id] || 0))
          .map(f => `
            <div class="ai-fund-item">
              <span class="ai-fund-dot" style="background:${f.color}"></span>
              <span class="ai-fund-name">${fundStack(f)}</span>
              <div class="ai-fund-bar-wrap">
                <div class="ai-fund-bar" style="width:${weights[f.id]}%;background:${f.color}"></div>
              </div>
              <span class="ai-fund-pct">${weights[f.id]}%</span>
              <span class="ai-fund-ret1y ${f.returns.y1 >= 0 ? 'pos' : 'neg'}">${f.returns.y1 >= 0 ? '+' : ''}${f.returns.y1.toFixed(1)}%<span class="ai-fund-ret-lbl">1년</span></span>
            </div>
          `).join('')}
      </div>

      ${doubleCheckHtml}

      <div class="ai-result-return">
        <div class="ai-ret-label">최종 적용 연평균 수익률</div>
        <div class="ai-ret-value ${finalAnnual >= 0 ? 'pos' : 'neg'}">${finalAnnual >= 0 ? '+' : ''}${finalAnnual.toFixed(2)}%</div>
      </div>

      <div class="ai-sim-preview">
        <div class="ai-sim-title">💰 ${amtLabel} 시 예상 적립액</div>
        ${simRows}
        <div class="ai-sim-notice">※ 과거 수익률 기반 추정치 · 미래 수익 보장 안 됨</div>
      </div>
    </div>
  `;
  box.style.display = "block";
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideAIResult() {
  const box = document.getElementById("aiResultBox");
  if (box) box.style.display = "none";
}

// ─── 프리셋 적용 토스트 ─────────────────────────
let _presetToastTimer = null;
function showPresetToast(name) {
  let toast = document.getElementById("presetToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "presetToast";
    toast.className = "preset-toast";
    document.body.appendChild(toast);
  }
  const icons = { '안정형': '🛡️', '균형형': '⚖️', '성장형': '🌱', '공격형': '🔥' };
  toast.innerHTML = `${icons[name] || '✅'} <strong>${name}</strong> 프리셋이 적용됐습니다!`;
  toast.classList.add("show");
  clearTimeout(_presetToastTimer);
  _presetToastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

// ─── 제안서 생성 ────────────────────────────────
function generateProposal() {
  const name = document.getElementById("clientName").value.trim() || "고객";
  const birthRaw = document.getElementById("clientBirth").value.trim();
  const gender = document.querySelector("input[name='gender']:checked")?.value || "남성";
  const monthly = getMonthlyAmount();

  // 비율 합계 확인
  let total = 0;
  FUND_DATA.forEach(f => { total += parseFloat(document.getElementById("ratio_" + f.id)?.value) || 0; });
  if (Math.abs(total - 100) > 0.5) {
    alert(`⚠️ 펀드 비율 합계가 ${total.toFixed(1)}%입니다.\n반드시 100%로 설정해주세요!`);
    return;
  }

  // 선택 펀드
  const selectedFunds = [];
  FUND_DATA.forEach(f => {
    const ratio = parseFloat(document.getElementById("ratio_" + f.id)?.value) || 0;
    if (ratio > 0) selectedFunds.push({ ...f, ratio });
  });

  if (selectedFunds.length === 0) {
    alert("펀드를 1개 이상 선택해주세요!");
    return;
  }

  // 나이 계산 (YYYY-MM-DD)
  let age = "-";
  let fullBirth = birthRaw;
  const bdDigits = birthRaw.replace(/\D/g, "");
  if (bdDigits.length >= 4) {
    const fullYear = parseInt(bdDigits.slice(0, 4));
    age = (new Date().getFullYear() - fullYear) + "세";
    if (bdDigits.length >= 8) {
      fullBirth = `${fullYear}-${bdDigits.slice(4, 6)}-${bdDigits.slice(6, 8)}`;
    } else {
      fullBirth = `${fullYear}년생`;
    }
  }

  // 가중평균 수익률
  let wavg1y = 0, wavg3y = 0;
  selectedFunds.forEach(f => {
    wavg1y += (f.ratio / 100) * f.returns.y1;
    wavg3y += (f.ratio / 100) * f.returns.y3;
  });
  const annual1y = wavg1y / 100;
  // ★ 3년 연환산 CAGR만 사용 (현실적 시뮬레이션 기준)
  // 이유: 1년 수익률은 특정 해의 변동성이 크고 반복 불가능한 수치
  //       3년 CAGR은 최소 1개 경기사이클을 반영한 더 안정적인 기대치
  const annual3y = Math.pow(1 + wavg3y / 100, 1 / 3) - 1;
  // 한호 2.1.0: 3년 CAGR 대신 펀드별 기대수익률(3년·장기 실적·유형 상한 중 낮은 값) 가중평균
  const _w = {}; selectedFunds.forEach(f => { _w[f.id] = f.ratio; });
  const annualBase = hanhoPortfolioRate(_w);

  const expenseApplied = document.getElementById("expenseCheck")?.checked || false;
  const levelupApplied = document.getElementById("levelupCheck")?.checked || false;
  const mokiApplied    = document.getElementById("mokiCheck")?.checked    || false;
  const crossApplied   = document.getElementById("crossCheck")?.checked   || false;
  const _inputMode = document.getElementById("monthlyAmount")?.getAttribute("data-mode");
  const isMokiLump = (mokiApplied === true) ? true : (_inputMode === "lump");
  proposalData = { name, birth: fullBirth, birthRaw, gender, age, monthly, selectedFunds, wavg1y, wavg3y, annualBase, expenseApplied, levelupApplied, mokiApplied, isMokiLump, crossApplied };

  // 크로스체크 모드 → 비교 전용 렌더
  const finishProposal = () => {
    if (crossApplied) {
      renderPage2Cross();
    } else {
      renderPage2();
    }
    document.getElementById("page1").classList.remove("active");
    document.getElementById("page2").classList.add("active");
    window.scrollTo(0, 0);
  };
  // 이용권 확인(무료 1회 → 유료). 통과하면 이용기록을 남기고 화면을 그린다. 미통과면 결제 안내창만 뜬다.
  if (window.cpPlan) {
    window.cpPlan.consume({
      client: name, mode: crossApplied ? "cross" : "single",
      levelup: !!levelupApplied, moki: !!mokiApplied, lump: !!isMokiLump,
      monthly: monthly, funds: selectedFunds.length
    }).then(ok => { if (ok) finishProposal(); });
  } else {
    finishProposal();
  }
}

// ─── 페이지2 렌더링 ─────────────────────────────
function renderPage2() {
  const { name, birth, gender, age, monthly, selectedFunds, wavg1y, wavg3y, annualBase } = proposalData;

  // 크로스체크 모드에서 숨겼던 요소 복원
  const simTableEl  = document.getElementById("simTableWrap");
  const chartWrapEl = document.querySelector(".sim-chart-wrap");
  const lineChartEl = document.querySelector(".sim-line-chart-wrap");
  if (simTableEl)  simTableEl.style.display  = "";
  if (chartWrapEl) chartWrapEl.style.display = "";
  if (lineChartEl) lineChartEl.style.display = "";

  setProposalTitle(name);

  // ── 고객 투자 프로파일 타이틀 — 레벨UP 배지 조건부 표시 ──
  const profileTitleEl = document.getElementById("profileSectionTitle");
  if (profileTitleEl) {
    if (proposalData.levelupApplied) {
      profileTitleEl.innerHTML = `
        <i class="fa-solid fa-address-card"></i>
        고객 투자 프로파일
        <span class="profile-levelup-badge">
          <i class="fa-solid fa-rocket"></i> 레벨UP
        </span>`;
    } else if (proposalData.expenseApplied) {
      profileTitleEl.innerHTML = `
        <i class="fa-solid fa-address-card"></i>
        고객 투자 프로파일
        <span class="profile-mokg-badge">
          <i class="fa-solid fa-piggy-bank"></i> 모으고키우고
        </span>`;
    } else {
      profileTitleEl.innerHTML = `<i class="fa-solid fa-address-card"></i> 고객 투자 프로파일`;
    }
  }

  const annual3y = annualBase; // 한호 2.1.0: 화면의 '시뮬 기준' 칸 = 펀드별 기대수익률 가중평균

  // ── 고객 투자 프로파일 (심플 카드 레이아웃) ──
  document.getElementById("profileBox").innerHTML = `

    <!-- 고객 기본정보: 이름·생년월일·성별 한 줄 -->
    <div class="pf-card pf-info-row">
      <div class="pf-info-item">
        <i class="fa-solid fa-user pf-icon"></i>
        <div>
          <div class="pf-label">고객명</div>
          <div class="pf-value pf-name-val">${name} 님</div>
        </div>
      </div>
      <div class="pf-divider"></div>
      <div class="pf-info-item">
        <i class="fa-solid fa-cake-candles pf-icon"></i>
        <div>
          <div class="pf-label">생년월일</div>
          <div class="pf-value">${birth}</div>
        </div>
      </div>
      <div class="pf-divider"></div>
      <div class="pf-info-item">
        <i class="fa-solid fa-venus-mars pf-icon"></i>
        <div>
          <div class="pf-label">성별 / 나이</div>
          <div class="pf-value">${gender} · ${age}</div>
        </div>
      </div>
    </div>

    <!-- 월 납입금액 강조 -->
    <div class="pf-card pf-amount-row">
      <i class="fa-solid fa-won-sign pf-icon pf-icon-lg"></i>
      <div class="pf-amount-content">
        <div class="pf-label">월 납입금액</div>
        <div class="pf-amount-big">${monthly.toLocaleString("ko-KR")}<span class="pf-unit">원 / 월</span></div>
      </div>
      <div class="pf-propose-date">
        <i class="fa-solid fa-calendar-check"></i> <span id="pfProposeDate"></span>
      </div>
    </div>

    <!-- 포트폴리오 과거 성과 (참고용) — 그리드 레이아웃으로 완전 재설계 -->
    <div class="pf-returns-grid">
      <div class="pf-rg-header">
        <span class="pf-rg-title">📊 과거 성과</span>
        <span class="pf-rg-note">참고용 · 미래 보장 없음</span>
      </div>
      <div class="pf-rg-cells">
        <div class="pf-rg-cell">
          <div class="pf-rg-label">1년 누적<br><span class="pf-rg-sublabel">최근 1년 실적</span></div>
          <div class="pf-rg-value ${wavg1y >= 0 ? 'pos' : 'neg'}">${wavg1y >= 0 ? '+' : ''}${wavg1y.toFixed(2)}%</div>
        </div>
        <div class="pf-rg-cell pf-rg-cell--accent">
          <div class="pf-rg-label">기대 연수익률<br><span class="pf-rg-badge">시뮬 기준</span></div>
          <div class="pf-rg-value big ${annual3y >= 0 ? 'pos' : 'neg'}">${annual3y >= 0 ? '+' : ''}${(annual3y * 100).toFixed(2)}%</div>
        </div>
        <div class="pf-rg-cell">
          <div class="pf-rg-label">3년 누적<br><span class="pf-rg-sublabel">3년간 총 수익</span></div>
          <div class="pf-rg-value ${wavg3y >= 0 ? 'pos' : 'neg'}">${wavg3y >= 0 ? '+' : ''}${wavg3y.toFixed(2)}%</div>
        </div>
      </div>
    </div>

    <!-- 시뮬레이션 기준 안내 -->
    <div class="pf-sim-basis-card">
      <i class="fa-solid fa-circle-info"></i>
      <span>시뮬레이션 적용: <strong>연 ${(annual3y * 100).toFixed(2)}%</strong> (펀드별 기대수익률 가중평균: 최근 3년·설정 후 연환산·유형별 상한 중 낮은 값) · 과거 1·3년 실적은 참고만 하고 그대로 이어 붙이지 않음</span>
    </div>

    ${proposalData.levelupApplied ? `
    <!-- 레벨UP 전용: 유족보상위로금 → 100% 저축성 전환 안내 -->
    <div class="pf-card pf-levelup-death-card">
      <div class="pf-levelup-death-inner">
        <div class="pf-ldb-icon-wrap"><i class="fa-solid fa-shield-heart"></i></div>
        <div class="pf-ldb-text">
          <div class="pf-ldb-title">7년간 유족보상위로금으로 보장받다가</div>
          <div class="pf-ldb-desc">7년 후부터는 100% 저축성으로 전환되어집니다</div>
          <div class="pf-ldb-sub">담당 재무설계사가 별도 안내</div>
        </div>
      </div>
    </div>` : ''}
  `;

  const labels = selectedFunds.map(f => f.name);
  const data2 = selectedFunds.map(f => f.ratio);
  const colors = selectedFunds.map(f => f.color);
  setTimeout(() => drawPieChart("pieChart2", labels, data2, colors), 100);

  document.getElementById("portfolioList").innerHTML = selectedFunds.map(f => {
    // ── 대표 종목 태그 생성 (펀드 유형별 맞춤) ──
    // ETF명(길이 긴 것) 제외, 실제 종목/상품 위주로 최대 4개
    const holdings = f.top10Holdings || [];
    const tags = holdings
      .filter(h => {
        const n = h.name;
        // 필터링: ETF·펀드 래퍼 상품 제외, 현금 제외, 실제 종목만
        if (/ETF|MMF|펀드|현금|기타|선물\s*직접/i.test(n)) return false;
        if (/INVESCO QQQ|NEXT FUNDS|KODEX|TIGER|SPDR|연동형/i.test(n)) return false;
        return true;
      })
      .slice(0, 4)
      .map(h => {
        // 종목명 단축 (너무 길면 앞부분만)
        let label = h.name
          .replace(' Corporation', '').replace(' Corp.', '').replace(' Inc.', '')
          .replace(' Group', '').replace(' Holdings', '').replace(' Class A', '')
          .replace(' Class B', '').replace(' Limited', '').replace(' Ltd', '')
          .replace(' Ltd.', '').replace(' JSC', '').replace(' (H)', '')
          .trim();
        // 영문 20자 초과 시 단축
        if (label.length > 18) label = label.slice(0, 17) + '…';
        return `<span class="pf-holding-tag" style="border-color:${f.color}40;color:${f.color};">${label}</span>`;
      });

    // 태그가 없으면 (MMF·달러·골드 등 ETF만 있는 경우) ETF명 단축 표시
    if (tags.length === 0) {
      const etfTags = holdings.slice(0, 2).map(h => {
        let label = h.name.replace(/\(H\)/g, '').replace(/ETF/g, '').trim();
        if (label.length > 16) label = label.slice(0, 15) + '…';
        return `<span class="pf-holding-tag" style="border-color:${f.color}40;color:${f.color};">${label}</span>`;
      });
      const tagsHtml = etfTags.join('');
      return `<div class="portfolio-item-v2">
        <span class="pf-color-bar" style="background:${f.color}"></span>
        <div class="pf-item-main">
          <div class="pf-item-top">
            <div class="pf-item-left">
              <span class="pf-item-dot" style="background:${f.color}"></span>
              <span class="pf-item-name">${fundStack(f)}</span>
            </div>
            <span class="pf-item-ratio">${f.ratio}%</span>
            <span class="pf-item-ret ${f.returns.y1 >= 0 ? 'pos' : 'neg'}"><small style="font-size:.6em;color:#8A918C;font-weight:600">지난 1년 </small>${f.returns.y1 >= 0 ? '+' : ''}${f.returns.y1.toFixed(2)}%<br><small style="font-size:.6em;color:#0F4C45;font-weight:700">기대 연 ${hanhoFundRate(f).rate.toFixed(1)}%</small></span>
          </div>
          <div class="pf-holding-tags">${tagsHtml}</div>
        </div>
      </div>`;
    }

    return `<div class="portfolio-item-v2">
      <span class="pf-color-bar" style="background:${f.color}"></span>
      <div class="pf-item-main">
        <div class="pf-item-top">
          <div class="pf-item-left">
            <span class="pf-item-dot" style="background:${f.color}"></span>
            <span class="pf-item-name">${fundStack(f)}</span>
          </div>
          <span class="pf-item-ratio">${f.ratio}%</span>
          <span class="pf-item-ret ${f.returns.y1 >= 0 ? 'pos' : 'neg'}"><small style="font-size:.6em;color:#8A918C;font-weight:600">지난 1년 </small>${f.returns.y1 >= 0 ? '+' : ''}${f.returns.y1.toFixed(2)}%<br><small style="font-size:.6em;color:#0F4C45;font-weight:700">기대 연 ${hanhoFundRate(f).rate.toFixed(1)}%</small></span>
        </div>
        <div class="pf-holding-tags">${tags.join('')}</div>
      </div>
    </div>`;
  }).join('');

  document.getElementById("simBasis").textContent =
    `(펀드별 기대수익률 가중평균 연 ${(annualBase * 100).toFixed(2)}% 적용 | 펀드마다 최근 3년 연환산·설정 후 연환산·중 낮은 값(주식형은 그 75%) | 참고: 3년 누적 실적 ${wavg3y.toFixed(2)}%)`;

  // pf-propose-date 동적 날짜 주입
  const pfDateEl = document.getElementById("pfProposeDate");
  if (pfDateEl) pfDateEl.textContent = window._todayStr || '';

  // 사업비 반영 상태 배지 업데이트
  updateExpenseStatusBadge();

  // 예상 연평균 수익률 표시 업데이트
  const avgRateEl = document.getElementById("simAvgRateDisplay");
  if (avgRateEl) {
    avgRateEl.textContent = `${(annualBase * 100).toFixed(2)}%`;
  }

  renderSimTable();
  setTimeout(() => {
    renderSimChart();         // 숨겨진 bar chart (데이터용)
    renderSimLineChart();     // 우측 라인 차트 (NEW)
    renderSimCards();         // 하단 4개 카드 (NEW)
  }, 200);
  renderFundDetailCards();
}

// ═══════════════════════════════════════════════════
// 모으고키우고 적립식(모키적립식) 사업비 모델
// 2026.07.04 현장 실측치 반영 (김재협 상무 제공) — 기존 설계서 역산치 대체
// ═══════════════════════════════════════════════════
//
// 【최종 반영 — 연도별 총사업비율 (납입보험료 대비)】
//  연도   반영값     계약체결   계약관리   기타
//   1     7.64%      5.64%     2.00%     0.00%
//   2     7.70%      5.70%     2.00%     0.00%
//   3     7.80%      5.80%     2.00%     0.00%
//   4     7.90%      5.90%     2.00%     0.00%
//   5     8.00%      6.00%     2.00%     0.00%
//   6     8.10%      6.10%     2.00%     0.00%
//   7     8.20%      6.20%     2.00%     0.00%
//   8     8.30%      6.30%     2.00%     0.00%
//   9     8.40%      6.40%     2.00%     0.00%
//  10     7.95%      5.95%     2.00%     0.00%  ← 10년차만 소폭 하향 (완납 조정분)
// ─────────────────────────────────────────────────
//  10년 단순평균: (7.64+7.7+7.8+7.9+8.0+8.1+8.2+8.3+8.4+7.95)/10 = 7.899%
//  ※ 계약관리비 2.00%는 기존 구조 유지, 계약체결비만 조정해 총액을 맞춤
//  ※ 실제 청약서·상품설명서상 사업비 부과기준 재대조 권장 (숫자는 늘 더블체크!)
// ═══════════════════════════════════════════════════

const EXPENSE_BY_YEAR = [
  { year: 1,  contractCost: 5.64, manageCost: 2.00, other: 0.00, total: 7.64 },
  { year: 2,  contractCost: 5.70, manageCost: 2.00, other: 0.00, total: 7.70 },
  { year: 3,  contractCost: 5.80, manageCost: 2.00, other: 0.00, total: 7.80 },
  { year: 4,  contractCost: 5.90, manageCost: 2.00, other: 0.00, total: 7.90 },
  { year: 5,  contractCost: 6.00, manageCost: 2.00, other: 0.00, total: 8.00 },
  { year: 6,  contractCost: 6.10, manageCost: 2.00, other: 0.00, total: 8.10 },
  { year: 7,  contractCost: 6.20, manageCost: 2.00, other: 0.00, total: 8.20 },
  { year: 8,  contractCost: 6.30, manageCost: 2.00, other: 0.00, total: 8.30 },
  { year: 9,  contractCost: 6.40, manageCost: 2.00, other: 0.00, total: 8.40 },
  { year: 10, contractCost: 5.95, manageCost: 2.00, other: 0.00, total: 7.95 },
];
// 11년차 이후: 납입완료, 적립금 기준 계약관리비+펀드운용보수 합산 ≈ 0.55%/년 (변경 요청 없어 유지)
const EXPENSE_AFTER_납입 = 0.0055; // 적립금 대비 연 0.55%

// ═══════════════════════════════════════════════════
// 모키일시납 사업비 모델
// 출처: 신한모으고키우는변액적립보험v2.0(무배당) 실제 가입설계서 역산
// 설계번호: 000425292026062493809 (일시납 100,000,000원)
// ═══════════════════════════════════════════════════
//
// 【실제 가입설계서 역산 — 특별계정 투입금액 분석】
// ─────────────────────────────────────────────────────
//  경과   납입누계       특별계정투입누계    전년대비감소    비고
//  3개월  100,000,000   98,400,958       1,599,042    ← 3개월치 차감
//  6개월  100,000,000   98,031,916         369,042    ← 분기 균등차감
//  9개월  100,000,000   97,662,874         369,042
//  1년    100,000,000   97,293,832         369,042
//  2년    100,000,000   96,356,476         937,356    ← 연간 차감(관리비↑)
//  3년    100,000,000   95,597,836         758,640
//  5년    100,000,000   94,076,440
//  10년   100,000,000   90,244,288
// ─────────────────────────────────────────────────────
//
// 【사업비 구조 확정 — 역산 결과】
//
// 1) 계약체결비용: 납입보험료 기준 분기균등 분할차감 방식
//    - 3개월 초기차감: 1,599,042원 (1년치 × 3/12 + 초기 추가분)
//    - 분기 균등차감: 369,042원/분기 → 연 1,476,168원 → 원금대비 1.476%/년
//    - 10년 납입기간 총 계약체결비용: 약 1.48%/년 × 10년 ≈ 14.76%
//
// 2) 계약관리비용 + 펀드운용보수 (적립금 기준 후취):
//    - 1~10년: 연간 투입누계 감소 패턴 분석
//      1년차 관리차감: 2,706,168원 / 97,293,832원(평균) ≈ 2.78%/년
//      → 이 중 계약체결비 분할분 1.48% 제외 = 관리비+운용보수 ≈ 1.30%/년
//    - 11년+: 투입누계 계속 감소 → 적립금 대비 약 0.87%/년
//      (10년말 90,244,288 → 11년말 89,471,884: 차감 772,404원
//       평균적립금 약 89,858,086원 대비 = 0.860%)
//
// ★ 핵심 구조 확정:
//    → 계약체결비용: 납입보험료 대비 연 1.48% (10년간 균등분할 선차감)
//    → 계약관리비+운용보수: 적립금 대비 연 1.30% (1~10년)
//    → 11년+: 적립금 대비 연 0.87% (계약체결비 종료, 관리비만)
// ═══════════════════════════════════════════════════

// ★ 일시납 계약체결비용 + 관리비 구조 — 실제 설계서 역산 확정값
//
// 【역산 근거】 특별계정투입누계 감소 패턴 분석 (납입보험료 100,000,000원 기준)
//   구간         투입누계감소    납입대비감소율   비고
//   0→3개월:    1,599,042원   1.599%         ← 계약체결비 선취(즉시차감)
//   3→6개월:      369,042원   0.369%         ← 분기 관리비 균등
//   6→9개월:      369,042원   0.369%
//   9개월→1년:    369,042원   0.369%
//   1년 합계:   2,706,168원   2.706%
//   2년차:        937,356원   0.937%         ← 연간 관리비 ≈ 납입대비 0.764%
//   3~10년차:     ~759,000원  ~0.759%/년     ← 안정적 균등 감소
//
// → 계약체결비: 100,000,000 × 1.599% = 1,599,042원 (즉시 선취, 1회)
// → 분기관리비: 100,000,000 × 0.369% = 369,042원/분기 → 연 1.476% (납입보험료 기준)
// → 실제로 관리비는 납입보험료 기준 연 1.476% (=0.369% × 4분기)
// → 11년이후 감소폭 축소 → 약 0.87%/년 (적립금 대비)

// 계약체결비용 (납입보험료 기준 즉시 선취, 1회)
const MOKI_LUMP_CONTRACT_COST_ANNUAL = 0.01599; // 1.599% (즉시 1회 선취)
const MOKI_LUMP_CONTRACT_YEARS = 1;             // 1회만

// 계약관리비+운용보수: 납입보험료 기준 연 1.476% (1~10년 균등)
const MOKI_LUMP_MANAGE_RATE_1_10  = 0.01476; // 납입보험료 대비 연 1.476%
const MOKI_LUMP_MANAGE_RATE_AFTER = 0.00870; // 적립금 대비 연 0.87% (11년+)

// 하위호환용 — calcWithExpenseMokiLump() 내부에서 위 상수 사용으로 대체됨
const MOKI_LUMP_ANNUAL_DEDUCT = [
  { year: 1,  manageCost: 1.30, fundCost: 0.00, total: 1.30 },
  { year: 2,  manageCost: 1.30, fundCost: 0.00, total: 1.30 },
  { year: 3,  manageCost: 1.30, fundCost: 0.00, total: 1.30 },
  { year: 4,  manageCost: 1.30, fundCost: 0.00, total: 1.30 },
  { year: 5,  manageCost: 1.30, fundCost: 0.00, total: 1.30 },
  { year: 6,  manageCost: 1.30, fundCost: 0.00, total: 1.30 },
  { year: 7,  manageCost: 1.30, fundCost: 0.00, total: 1.30 },
  { year: 8,  manageCost: 1.30, fundCost: 0.00, total: 1.30 },
  { year: 9,  manageCost: 1.30, fundCost: 0.00, total: 1.30 },
  { year: 10, manageCost: 1.30, fundCost: 0.00, total: 1.30 },
];
// 11년차 이후: 적립금 대비 연 0.87%
const MOKI_LUMP_AFTER_10 = 0.0087;

/**
 * 모키일시납 사업비 반영 적립금 계산
 * @param {number} lumpsum  - 일시납 원금 (예: 100,000,000)
 * @param {number} annualBase - 연 수익률 (소수, 예: 0.15)
 * @param {number} targetYear - 목표 연수
 * @returns {{ fv, totalExpense, principal }}
 */
/**
 * 모키일시납 사업비 반영 적립금 계산 — 실제 설계서 역산 기준 (v17 최종)
 *
 * 【사업비 구조 — 설계서 특별계정투입누계 역산 확정】
 *  ① 계약체결비용: 납입보험료 × 1.599% 즉시 선취 (계약체결 즉시 1회)
 *  ② 계약관리비+운용보수: 납입보험료 × 1.476%/년 (1~10년, 분기균등 차감)
 *  ③ 11년+: 적립금 대비 0.87%/년 (계약체결비 소멸, 관리비만)
 *
 * 【검증】 연 3.75%, 1억원 기준
 *  1년 예상: ~100,874,690원 (설계서 100,874,690원) ✅
 *
 * @param {number} lumpsum     - 일시납 원금
 * @param {number} annualBase  - 연 수익률 (소수, 예: 0.0375)
 * @param {number} targetYear  - 목표 연도
 * @returns {{ fv, totalExpense, principal }}
 */
function calcWithExpenseMokiLump(lumpsum, annualBase, targetYear) {
  // ① 계약체결비용 즉시 선취
  const contractExpense = lumpsum * MOKI_LUMP_CONTRACT_COST_ANNUAL;
  let fund = lumpsum - contractExpense;
  let totalExpense = contractExpense;

  for (let y = 1; y <= targetYear; y++) {
    // ② 연간 관리비+운용보수 선차감 (납입보험료 기준, 1~10년)
    if (y <= 10) {
      const manageDeduct = lumpsum * MOKI_LUMP_MANAGE_RATE_1_10;
      fund -= manageDeduct;
      totalExpense += manageDeduct;
    }

    // ③ 연간 투자수익 적용
    fund = fund * (1 + annualBase);

    // ④ 11년+ 관리비: 적립금 기준 후취
    if (y > 10) {
      const afterDeduct = fund * MOKI_LUMP_MANAGE_RATE_AFTER;
      fund -= afterDeduct;
      totalExpense += afterDeduct;
    }
  }

  return {
    fv: Math.max(0, fund),
    totalExpense: totalExpense,
    principal: lumpsum
  };
}

// ═══════════════════════════════════════════════════
// 레벨UP 사업비 모델 — 신한변액유니버설종신보험 레벨업(무배당)
// 출처: 실제 가입설계서 역산 (설계번호 000425292026062493818)
// 납입보험료: 552,100원/월 → 연 6,625,200원 / 10년납
// ═══════════════════════════════════════════════════
//
// 【설계서 주요 수치 확인】
//  경과   납입누계      해약환급금    환급률
//   1년   6,625,200    1,328,137   20.0%
//   2년  13,250,400    6,345,167   47.8%
//   3년  19,875,600   11,454,916   57.6%
//   7년  46,376,400   36,597,402   78.9%  ← 7년말 사업비 전환점
//  10년  66,252,000   60,141,109   90.7%  ← 해약공제 거의 소멸
//  13년  66,252,000   66,005,181   99.6%  ← 해약공제 완전 소멸
//  15년  66,252,000   70,280,204  106.0%
//
// 【납입구조 확정】
//  설계서상 8~10년도 납입보험료 증가 확인 → 10년납 구조
//  1~7년: 보장기간 (위험보험료 포함)
//  8~10년: 순수납입기간 (사업비 대폭 감소)
//  11년+:  납입없음, 적립금 운용만
//
// 【연도별 사업비율 — 2026.07.04 현장 실측치 반영 (김재협 상무 제공)】
//  ※ 기존 설계서 역산치(13.00%→4.80%)는 폐기하고, 실제 상품 사업비 구조에
//    가까운 아래 수치로 전면 교체함. 각 연차는 "약 N~M%" 구간의 중간값 채택.
//
//  ★★★ 핵심 구조 (2026.07.04 추가 확정 — 가장 중요!) ★★★
//  변액유니버셜종신 레벨업 상품은 납입 84회차(=7년)까지만 "보장성 보험을
//  첨부한" 전용 사업비(위험보험료 포함)를 부과받고, 이후 85회차~120회차
//  (8~10년차)부터는 보장성에서 적립식으로 전환되면서 "모으고키우고변액적립보험"과
//  완전히 동일한 사업비(EXPENSE_BY_YEAR)를 그대로 적용받음. 이때부터는 MMF형
//  20% 의무비중도 해제되고 AI 추천 최적 포트폴리오로 운영된다 (아래 7년전환
//  안내박스에서 이미 안내 중 — MMF 30% 오타 → 20%로 동시 교정함).
//
//  【최종 반영 — 1~7년차(1~84회차) 레벨UP 전용 사업비율】
//  연도   제시 구간        채택값     계약체결   계약관리   위험보험료
//   1    약 35~40%      37.50%     34.50%     1.80%      1.20%
//   2    약 18~22%      20.00%     17.00%     1.80%      1.20%
//   3    약 10~13%      11.50%      8.70%     1.80%      1.00%
//   4    약  8~10%       9.00%      6.20%     1.80%      1.00%
//   5    약  7~8%        7.50%      4.70%     1.80%      1.00%
//   6    약  6~7%        6.50%      3.90%     1.80%      0.80%
//   7    약  5~6%        5.50%      2.90%     1.80%      0.80%  ← 84회차(7년말) 이후 보장성 종료
//  ─────────────────────────────────────────────────────────
//  ★ 85회차~120회차 (8~10년차): 아래 EXPENSE_BY_YEAR(모키적립식 테이블)를
//    그대로 재사용함 → 8년 8.30% / 9년 8.40% / 10년 7.95% (별도 테이블 유지 안 함)
//  ★ 11년+: 동일한 논리로 모키적립식과 동일한 EXPENSE_AFTER_납입(0.55%/년) 적용
//    (기존 LEVELUP_AFTER_CONVERT=0.56%는 폐기 — "7년 이후 모키적립식과 동일 운영"
//     원칙을 11년+까지 일관되게 적용한 가정치 — 상무님 확인 권장!)
// ═══════════════════════════════════════════════════

// ※ 1~7년차(1~84회차)만 정의 — 8년차부터는 EXPENSE_BY_YEAR(모키적립식)를 직접 참조
const LEVELUP_EXPENSE_BY_YEAR = [
  { year: 1,  contractCost: 34.50, manageCost: 1.80, riskPremium: 1.20, total: 37.50 },
  { year: 2,  contractCost: 17.00, manageCost: 1.80, riskPremium: 1.20, total: 20.00 },
  { year: 3,  contractCost:  8.70, manageCost: 1.80, riskPremium: 1.00, total: 11.50 },
  { year: 4,  contractCost:  6.20, manageCost: 1.80, riskPremium: 1.00, total:  9.00 },
  { year: 5,  contractCost:  4.70, manageCost: 1.80, riskPremium: 1.00, total:  7.50 },
  { year: 6,  contractCost:  3.90, manageCost: 1.80, riskPremium: 0.80, total:  6.50 },
  { year: 7,  contractCost:  2.90, manageCost: 1.80, riskPremium: 0.80, total:  5.50 },
];
// 7년(84회차) 전환 시점을 기준으로 한 경계값
// (8년차 이후 사업비/MMF 의무비중 규칙은 모두 모키적립식과 동일하게 통일)
const LEVELUP_CONVERT_YEAR = 7;

/**
 * 레벨UP 사업비 반영 적립금 계산 — 2026.07.04 현장 실측치 + 7년전환 구조 반영 (v18r3)
 *
 * 【납입구조 — 핵심!】
 *  - 1~7년(1~84회차): 보장기간 — 위험보험료 포함된 레벨UP 전용 사업비 적용
 *    (1년차 약 37.5%로 최대, 점차 감소 → 7년차 5.5%)
 *  - 8~10년(85~120회차): 자동 보장성→적립전환 — 모으고키우고와 완전히
 *    동일한 사업비(EXPENSE_BY_YEAR) 적용. 위험보험료 없음, MMF 20% 의무비중도 해제.
 *  - 11년+: 납입없음 — 모으고키우고와 동일한 관리비율(EXPENSE_AFTER_납입, 0.55%/년) 적용
 *
 * 【핵심 적용 근거 — 상무님 직접 설명】
 *  "84회차까지만 보장성 보험을 첨부한 사업비를 반영받다가 85회차부터 120회차까지는
 *  동일하게 모키적립식 사업비와 동일하게 적용" — 7년 시점에 보장성→적립식 전환이
 *  가능하며, 이후 신한모으고키우는변액적립보험과 동일하게 운영되며 MMF 20% 의무편입도
 *  해제되어 AI가 추천하는 최적 포트폴리오로 자유롭게 재배분된다. (숫자는 더블체크 필수!)
 *
 * @param {number} monthly     - 월 납입보험료
 * @param {number} annualBase  - 연 수익률 (소수, 예: 0.0375)
 * @param {number} targetYear  - 목표 연도
 * @returns {{ fv, totalExpense, totalPrincipal }}
 */
function calcWithExpenseLevelup(monthly, annualBase, targetYear) {
  const monthlyRate = annualBase / 12;
  let accumFund = 0;
  let totalExpensePaid = 0;

  for (let y = 1; y <= targetYear; y++) {

    if (y <= 10) {
      // ── 납입기간 (1~10년): 사업비 차감 후 특별계정 투입 ──
      // ★ 84회차(7년)까지: 레벨UP 전용 사업비(보장성 포함) → LEVELUP_EXPENSE_BY_YEAR
      // ★ 85회차(8년)부터: 보장성→적립전환 완료 — 모키적립식과 동일 사업비 → EXPENSE_BY_YEAR
      const expRow = (y <= LEVELUP_CONVERT_YEAR)
        ? LEVELUP_EXPENSE_BY_YEAR[y - 1]
        : EXPENSE_BY_YEAR[y - 1];
      const expenseRate = expRow.total / 100;
      const netMonthly = monthly * (1 - expenseRate);   // 사업비 차감 후 투입액
      const monthlyExpense = monthly * expenseRate;      // 사업비

      // 전년말 적립금 복리 성장
      accumFund = accumFund * Math.pow(1 + monthlyRate, 12);
      // 올해 순납입 복리 적립 (적립식 미래가치 공식)
      if (Math.abs(monthlyRate) < 0.000001) {
        accumFund += netMonthly * 12;
      } else {
        accumFund += netMonthly * ((Math.pow(1 + monthlyRate, 12) - 1) / monthlyRate);
      }
      totalExpensePaid += monthlyExpense * 12;

    } else {
      // ── 납입완료 후 (11년+): 추가납입 없음, 관리비만 차감 ──
      // ★ 7년 전환 이후 모키적립식과 동일 운영 원칙을 11년+까지 일관 적용
      //   → EXPENSE_AFTER_납입(0.55%/년, 모키적립식과 동일값) 사용
      accumFund = accumFund * (1 + annualBase - EXPENSE_AFTER_납입);
    }
  }

  return {
    fv: Math.max(0, accumFund),
    totalExpense: totalExpensePaid,
    totalPrincipal: monthly * Math.min(targetYear, 10) * 12  // 최대 10년 납입원금
  };
}

// 레벨UP 체크 여부
function isLevelupChecked() {
  return document.getElementById("levelupCheck")?.checked || false;
}

// 레벨UP 체크 시: 펀드 기본 세팅 (MMF 20% 의무편입, 미국주식형II 30%, 인덱스주식형II 50%)
function applyLevelupDefaultRatios() {
  FUND_DATA.forEach(f => { setFundRatio(f.id, 0); });
  setFundRatio("VU40000", 20);  // MMF (레벨UP 의무편입 20%)
  setFundRatio("VU63300", 30);  // 미국주식형II
  setFundRatio("VU72000", 50);  // 인덱스주식형II
  validateRatios();
}

// 레벨UP 사망보험금 란 표시/숨김
function toggleLevelupUI(show) {
  const wrap = document.getElementById("levelupDeathBenefitWrap");
  if (wrap) wrap.style.display = show ? "block" : "none";
}

// MMF 20% 의무 보정 (레벨UP 또는 동시체크 모드에서 MMF를 임의 변경 시 강제 복구)
function enforceLevelupMMF() {
  const needsMMF = isLevelupChecked() || isCrossChecked();
  if (!needsMMF) return;
  const mmfEl = document.getElementById("ratio_VU40000");
  if (!mmfEl) return;
  const current = parseFloat(mmfEl.value) || 0;
  if (current < 20) {   // 2.5.2: MMF 20%는 최소 비중으로 (안전 우선형 MMF 100% 허용)
    setFundRatio("VU40000", 20);
    // 동시체크 전용 안내 (레벨UP 경고와 구분)
    if (isCrossChecked() && !isLevelupChecked()) {
      showCrossMMFWarning();
    } else {
      showLevelupMMFWarning();
    }
  }
}

/** 동시체크 MMF 20% 고정 안내 토스트 */
function showCrossMMFWarning() {
  let toast = document.getElementById("crossMMFToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "crossMMFToast";
    toast.style.cssText = `
      position:fixed; top:80px; left:50%; transform:translateX(-50%);
      background:linear-gradient(135deg,#4b5a96,#b98d2e);
      color:white; padding:10px 22px; border-radius:30px;
      font-size:12px; font-weight:700; z-index:99999;
      box-shadow:0 4px 16px rgba(75,90,150,0.4);
      white-space:nowrap; pointer-events:none;
    `;
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<i class="fa-solid fa-lock"></i>&nbsp; 동시체크 중 MMF형은 20% 고정입니다`;
  toast.style.display = "block";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.display = "none"; }, 2500);
}

let _mmfWarnTimer = null;
function showLevelupMMFWarning() {
  let toast = document.getElementById("mmfWarningToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "mmfWarningToast";
    toast.className = "mmf-warning-toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> 레벨UP 모드: MMF형 20%는 <strong>의무 편입</strong> 항목입니다. 자동으로 복구되었습니다.`;
  toast.classList.add("show");
  clearTimeout(_mmfWarnTimer);
  _mmfWarnTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

/**
 * 사업비를 반영한 연도말 적립금 계산 (월납 복리 적립 모델)
 * @param {number} monthly - 월 납입보험료
 * @param {number} annualBase - 연간 투자수익률 (소수, 예: 0.15 = 15%)
 * @param {number} targetYear - 목표 연도
 * @returns {object} { fv, totalExpense, totalPrincipal }
 */
function calcWithExpense(monthly, annualBase, targetYear) {
  const monthlyGrossRate = annualBase / 12;
  let accumFund = 0;         // 특별계정 적립금 (매년말 기준)
  let totalExpensePaid = 0;  // 누적 사업비 총액

  for (let y = 1; y <= targetYear; y++) {
    const expRow = EXPENSE_BY_YEAR[Math.min(y, 10) - 1];

    if (y <= 10) {
      // 납입기간: 매월 납입 → 사업비 차감 후 특별계정 투입
      const expenseRate = expRow.total / 100;
      const netMonthly = monthly * (1 - expenseRate);    // 사업비 차감 후 투입금액
      const monthlyExpense = monthly * expenseRate;       // 월 사업비

      // 이 해의 적립금 성장: 전년말 적립금 × 연복리 + 올해 순납입 × 복리적립
      const prevFund = accumFund;
      // 전년도 적립금에 연간 투자수익 적용
      accumFund = prevFund * Math.pow(1 + monthlyGrossRate, 12);
      // 올해 월납 순투입금 복리 적립 (적립식 미래가치)
      if (Math.abs(monthlyGrossRate) < 0.000001) {
        accumFund += netMonthly * 12;
      } else {
        accumFund += netMonthly * ((Math.pow(1 + monthlyGrossRate, 12) - 1) / monthlyGrossRate);
      }
      totalExpensePaid += monthlyExpense * 12;

    } else {
      // 납입 완료 후: 적립금에 계약관리비용 차감 후 운용
      const afterExpenseRate = EXPENSE_AFTER_납입;
      accumFund = accumFund * (1 + annualBase - afterExpenseRate);
      // 납입완료 후 추가 사업비는 적립금 기준이므로 별도 추적
      totalExpensePaid += accumFund * afterExpenseRate / (1 + annualBase - afterExpenseRate);
    }
  }

  return {
    fv: Math.max(0, accumFund),
    totalExpense: totalExpensePaid,
    totalPrincipal: monthly * Math.min(targetYear, 10) * 12
  };
}

/**
 * 사업비 미반영 단순 복리 FV — 월납 적립식 전용
 */
function calcWithoutExpense(monthly, annualBase, targetYear) {
  const monthlyRate = annualBase / 12;
  const n = Math.min(targetYear, 10) * 12;
  let fv;
  if (Math.abs(monthlyRate) < 0.000001) {
    fv = monthly * n;
  } else {
    fv = monthly * ((Math.pow(1 + monthlyRate, n) - 1) / monthlyRate);
  }
  // 납입 완료 후 거치 기간
  if (targetYear > 10) {
    const extraYears = targetYear - 10;
    fv = fv * Math.pow(1 + annualBase, extraYears);
  }
  return fv;
}

/**
 * 사업비 미반영 단순 복리 FV — 일시납 전용
 * 일시납은 "원금 × (1+r)^n" 단순 복리, 월납 적립식 공식 쓰면 안 됨
 */
function calcWithoutExpenseLumpsum(lumpsum, annualBase, targetYear) {
  return lumpsum * Math.pow(1 + annualBase, targetYear);
}

function isExpenseChecked() {
  return document.getElementById("expenseCheck")?.checked || false;
}
function isMokiChecked() {
  return document.getElementById("mokiCheck")?.checked || false;
}

function updateExpenseStatusBadge() {
  const badge = document.getElementById("expenseStatusBadge");
  if (!badge) return;
  if (isCrossChecked()) {
    badge.innerHTML = `
      <span class="expense-status-badge" style="background:linear-gradient(135deg,#4b5a96,#b98d2e);color:white;border:none;animation:crossPulse 2s infinite;">
        <i class="fa-solid fa-code-compare"></i> 동시체크 비교모드
      </span>`;
  } else if (isLevelupChecked()) {
    badge.innerHTML = `
      <span class="expense-status-badge levelup-badge">
        <i class="fa-solid fa-rocket"></i> 레벨UP 사업비 반영
      </span>`;
  } else if (isMokiChecked()) {
    badge.innerHTML = `
      <span class="expense-status-badge on moki-badge">
        <i class="fa-solid fa-piggy-bank"></i> 모키(일시납)사업비 반영
      </span>`;
  } else if (isExpenseChecked()) {
    badge.innerHTML = `
      <span class="expense-status-badge on mokg-badge">
        <i class="fa-solid fa-circle-check"></i> 모키(적립형)사업비 반영
      </span>`;
  } else {
    badge.innerHTML = `
      <span class="expense-status-badge off">
        <i class="fa-regular fa-circle"></i> 사업비 미반영
      </span>`;
  }
}

// ═══════════════════════════════════════════════════════════
// 🔀 크로스체크 비교 전용 페이지2 렌더링 (완전 재설계)
// ═══════════════════════════════════════════════════════════
function renderPage2Cross() {
  const { name, birth, gender, age, monthly, selectedFunds, wavg1y, wavg3y } = proposalData;
  const annual3y  = proposalData.annualBase; // 한호 2.1.0: 펀드별 기대수익률 가중평균
  const annualRate = annual3y;

  // ── 헤더 타이틀
  setProposalTitle(name);

  // ── 프로파일 타이틀 — 크로스체크 배지
  const profileTitleEl = document.getElementById("profileSectionTitle");
  if (profileTitleEl) {
    profileTitleEl.innerHTML = `
      <i class="fa-solid fa-address-card"></i> 고객 투자 프로파일
      <span style="display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,#4b5a96,#b98d2e);color:white;font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;margin-left:8px;">
        <i class="fa-solid fa-code-compare"></i> 동시체크 비교
      </span>`;
  }

  // ── 고객 프로파일 박스
  const profileBoxEl = document.getElementById("profileBox");
  if (profileBoxEl) {
    profileBoxEl.innerHTML = `
      <div class="pf-card pf-info-row">
        <div class="pf-info-item"><i class="fa-solid fa-user pf-icon"></i><div><div class="pf-label">고객명</div><div class="pf-value pf-name-val">${name} 님</div></div></div>
        <div class="pf-divider"></div>
        <div class="pf-info-item"><i class="fa-solid fa-cake-candles pf-icon"></i><div><div class="pf-label">생년월일</div><div class="pf-value">${birth}</div></div></div>
        <div class="pf-divider"></div>
        <div class="pf-info-item"><i class="fa-solid fa-venus-mars pf-icon"></i><div><div class="pf-label">성별 / 나이</div><div class="pf-value">${gender} · ${age}</div></div></div>
      </div>
      <div class="pf-card pf-amount-row">
        <i class="fa-solid fa-won-sign pf-icon pf-icon-lg"></i>
        <div class="pf-amount-content">
          <div class="pf-label">월 납입금액</div>
          <div class="pf-amount-big">${monthly.toLocaleString("ko-KR")}<span class="pf-unit">원 / 월</span></div>
        </div>
        <div class="pf-propose-date"><i class="fa-solid fa-calendar-check"></i> ${window._todayStr || ''}</div>
      </div>
      <div class="pf-returns-grid">
        <div class="pf-rg-header">
          <span class="pf-rg-title">📊 공통 포트폴리오 성과</span>
          <span class="pf-rg-note">양쪽 동일 펀드구성 적용</span>
        </div>
        <div class="pf-rg-cells">
          <div class="pf-rg-cell"><div class="pf-rg-label">1년 누적</div><div class="pf-rg-value ${wavg1y>=0?'pos':'neg'}">${wavg1y>=0?'+':''}${wavg1y.toFixed(2)}%</div></div>
          <div class="pf-rg-cell pf-rg-cell--accent"><div class="pf-rg-label">기대 연수익률<br><span class="pf-rg-badge">시뮬 기준</span></div><div class="pf-rg-value big ${annual3y>=0?'pos':'neg'}">${annual3y>=0?'+':''}${(annual3y*100).toFixed(2)}%</div></div>
          <div class="pf-rg-cell"><div class="pf-rg-label">3년 누적</div><div class="pf-rg-value ${wavg3y>=0?'pos':'neg'}">${wavg3y>=0?'+':''}${wavg3y.toFixed(2)}%</div></div>
        </div>
      </div>
      <div class="pf-sim-basis-card"><i class="fa-solid fa-circle-info"></i><span>공통 적용 수익률: <strong>연 ${(annual3y*100).toFixed(2)}%</strong> (펀드별 기대수익률) · 사업비 구조만 다름</span></div>`;
  }

  // ── 선택 포트폴리오 도넛차트 + 리스트 (기존 renderPage2와 동일)
  const portfolioListEl = document.getElementById("portfolioList");
  if (portfolioListEl) {
    portfolioListEl.innerHTML = selectedFunds.map(f => {
      const colorMap = {
        "VU40000":"#56609a","VU52000":"#9aa9bd","VU53000":"#c9a24a",
        "VU61001":"#2c5c9a","VU63300":"#2f7d6b","VU71002":"#2b7a6f",
        "VU72000":"#5a5f9a","VU73001":"#5a5f9a","VU74000":"#3f5068"
      };
      const color = f.color || colorMap[f.id] || "#90a4ae";
      return `<div class="pf-list-item" style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f0f0f0;">
        <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block;"></span>
        <span style="flex:1;font-size:12px;color:#333;">${fundStack(f)}</span>
        <span style="font-size:13px;font-weight:700;color:#1f4a80;">${f.ratio}%</span>
      </div>`;
    }).join('');
  }

  // 도넛차트 렌더
  setTimeout(() => {
    const labels  = selectedFunds.map(f => f.name);
    const data    = selectedFunds.map(f => f.ratio);
    const colorMap2 = {
      "VU40000":"#56609a","VU52000":"#9aa9bd","VU53000":"#c9a24a",
      "VU61001":"#2c5c9a","VU63300":"#2f7d6b","VU71002":"#2b7a6f",
      "VU72000":"#5a5f9a","VU73001":"#5a5f9a","VU74000":"#3f5068"
    };
    const colors = selectedFunds.map(f => f.color || colorMap2[f.id] || "#90a4ae");
    const ctx2 = document.getElementById("pieChart2")?.getContext("2d");
    if (ctx2) {
      if (pieChart2Instance) pieChart2Instance.destroy();
      pieChart2Instance = new Chart(ctx2, {
        type: "doughnut",
        data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: "#fff" }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}%` } } }, cutout: "65%" }
      });
    }
  }, 100);

  // ── 비교 계산 함수
  const years = [1, 3, 5, 7, 10]; // 1~10년만

  function calcLevelup(y) {
    const res = calcWithExpenseLevelup(monthly, annualRate, y);
    const principal = monthly * Math.min(y, 10) * 12;
    const gainRate  = principal > 0 ? ((res.fv - principal) / principal * 100) : 0;
    return { fv: res.fv, principal, gain: res.fv - principal, expense: res.totalExpense, gainRate };
  }
  function calcMoki(y) {
    const res = calcWithExpense(monthly, annualRate, y);
    const principal = monthly * Math.min(y, 10) * 12;
    const gainRate  = principal > 0 ? ((res.fv - principal) / principal * 100) : 0;
    return { fv: res.fv, principal, gain: res.fv - principal, expense: res.totalExpense, gainRate };
  }

  // ── 연도별 비교 행 생성
  let compareRows = "";
  years.forEach(y => {
    const lv = calcLevelup(y);
    const mk = calcMoki(y);
    const lvWin = lv.fv > mk.fv;
    const mkWin = mk.fv > lv.fv;

    // 7년 = 레벨UP 핵심 전환 시점 강조
    const is7y       = (y === 7);
    const rowClass   = is7y ? 'cross-table-row cross-row-7y' : 'cross-table-row';
    const yearLabel  = is7y
      ? `<div class="cross-yr7">7년</div><div class="cross-yr7-tag"><i class="fa-solid fa-key"></i> 전환 시점</div>`
      : `${y}년`;

    // 7년 레벨UP 셀 강조 스타일
    const lvExtra = is7y ? ' cross-td-lv-7y' : '';

    const cell = (o, win, extra) => `
        <td class="${extra}${win?' cross-td-win':''}">
          <div class="cross-td-fv">${formatMoneyComma(Math.round(o.fv))}<em>원</em>${win?' <i class="fa-solid fa-crown cross-win-badge"></i>':''}</div>
          <div class="cross-td-gain">수익 <span class="${o.gain>=0?'pos':'neg'}">${o.gain >= 0 ? '+' : ''}${formatMoneyComma(Math.round(o.gain))}원</span> <span class="cross-td-rate ${o.gainRate>=0?'pos':'neg'}">${o.gainRate>=0?'+':''}${o.gainRate.toFixed(1)}%</span></div>
        </td>`;
    compareRows += `
      <tr class="${rowClass}">
        <td class="cross-td-year">${yearLabel}<div class="cross-td-principal">원금 ${formatMoneyComma(Math.round(lv.principal))}원</div></td>
        ${cell(lv, lvWin, 'cross-td-lv' + lvExtra)}
        ${cell(mk, mkWin, 'cross-td-mk')}
      </tr>`;
  });

  // ── p2-right-col 전체를 크로스 비교 레이아웃으로 교체
  const rightCol = document.querySelector(".p2-right-col");
  if (rightCol) {
    const lv10 = calcLevelup(10);
    const mk10 = calcMoki(10);
    const diff = lv10.fv - mk10.fv;
    const winner = diff >= 0 ? '🚀 레벨UP' : '🐷 모키적립식';
    const diffAbs = Math.abs(diff);

    const lvWin10 = diff > 0, mkWin10 = diff < 0;
    rightCol.innerHTML = `
      <div class="p2-sim-wrap">

        <!-- ① 결론 카드: 고객이 가장 먼저 읽는 한 장 -->
        <div class="cx-hero">
          <div class="cx-hero-top">
            <span class="cx-eyebrow"><i class="fa-solid fa-flag-checkered"></i> ${name} 님의 10년 뒤 예상 적립액</span>
            <span class="cx-sub">동일 포트폴리오 · 연 ${(annualRate*100).toFixed(2)}% 가정 · 사업비 구조만 다름</span>
          </div>
          <div class="cx-hero-grid">
            <div class="cx-opt${lvWin10?' win':''}">
              <div class="cx-opt-name"><i class="fa-solid fa-rocket"></i> 레벨UP${lvWin10?' <i class="fa-solid fa-crown"></i>':''}</div>
              <div class="cx-opt-fv">${formatMoneyComma(Math.round(lv10.fv))}<em>원</em></div>
              <div class="cx-opt-gain">원금 ${formatMoneyComma(Math.round(lv10.principal))}원 → <span class="pos">+${lv10.gainRate.toFixed(0)}%</span></div>
            </div>
            <div class="cx-vs">VS</div>
            <div class="cx-opt${mkWin10?' win':''}">
              <div class="cx-opt-name"><i class="fa-solid fa-piggy-bank"></i> 모키적립식${mkWin10?' <i class="fa-solid fa-crown"></i>':''}</div>
              <div class="cx-opt-fv">${formatMoneyComma(Math.round(mk10.fv))}<em>원</em></div>
              <div class="cx-opt-gain">원금 ${formatMoneyComma(Math.round(mk10.principal))}원 → <span class="pos">+${mk10.gainRate.toFixed(0)}%</span></div>
            </div>
          </div>
          <div class="cx-verdict"><b>${winner.replace(/^\S+\s/, '')}</b>이 10년 기준 <b class="cx-diff">${formatMoneyComma(Math.round(diffAbs))}원</b> 더 유리
            <small>※ 과거 수익률 기준 · 미래 수익 보장 없음 · 소득세법 §46 비과세 혜택 별도</small></div>
        </div>

        <!-- ② 공통 포트폴리오 -->
        <div class="cross-fund-common-card">
          <span class="cx-chips-title"><i class="fa-solid fa-chart-pie"></i> 공통 포트폴리오</span>
          ${selectedFunds.map(f=>`<span class="cx-chip">${fundStack(f)} <b>${f.ratio}%</b></span>`).join('')}
        </div>

        <!-- ③ 연도별 비교표 -->
        <div class="cross-table-outer">
          <table class="cross-main-table">
            <thead>
              <tr>
                <th class="cross-th-year">경과<br>년도</th>
                <th class="cross-th-lv"><i class="fa-solid fa-rocket"></i> 레벨UP<span class="cx-th-sub">${hhProdFull(0)}</span></th>
                <th class="cross-th-mk"><i class="fa-solid fa-piggy-bank"></i> 모키적립식<span class="cx-th-sub">${hhProdFull(1)}</span></th>
              </tr>
              <tr class="cross-expense-row">
                <td></td>
                <td class="cx-exp">${hhProdCost(0)}</td>
                <td class="cx-exp">${hhProdCost(1)}</td>
              </tr>
            </thead>
            <tbody>
              ${compareRows}
            </tbody>
          </table>
        </div>

        <p class="sim-notice">※ 과거 운용 성과 기반 참고용 수치이며, 실제 투자 성과와 다를 수 있습니다.</p>
      </div>`;
  }

  // ── 불필요한 영역 숨김
  const simTableEl = document.getElementById("simTableWrap");
  if (simTableEl) simTableEl.style.display = "none";
  const chartWrapEl = document.querySelector(".sim-chart-wrap");
  if (chartWrapEl) chartWrapEl.style.display = "none";
  const lineChartEl = document.querySelector(".sim-line-chart-wrap");
  if (lineChartEl) lineChartEl.style.display = "none";
  const expBannerEl = document.getElementById("expenseBannerArea");
  if (expBannerEl) expBannerEl.innerHTML = "";
  const simCardsEl  = document.getElementById("simCardsRow");
  if (simCardsEl)  simCardsEl.innerHTML = "";
  const expBdEl = document.getElementById("expenseBreakdownArea");
  if (expBdEl) expBdEl.innerHTML = "";

  // ── 날짜
  const pfDateEl = document.getElementById("pfProposeDate");
  if (pfDateEl) pfDateEl.textContent = window._todayStr || '';

  // ── 편입 펀드 상세정보 카드 (동시체크 모드에서도 채운다 — 빠져 있어 제목만 덩그러니 나오던 결함)
  renderFundDetailCards();
}

// ─── 시뮬레이션 테이블 ──────────────────────────
function renderSimTable() {
  // ★ 적립식 특성 안내 배너 (테이블 상단 공통)
  const breakdownEl = document.getElementById("expenseBreakdownArea");
  if (breakdownEl) {
    const annual3yPct = (proposalData.annualBase * 100).toFixed(2);
    breakdownEl.innerHTML = `
      <div class="sim-accumulate-notice">
        <div class="san-icon">💡</div>
        <div class="san-content">
          <div class="san-title">적립식 투자의 특성을 이해하면 숫자가 보입니다</div>
          <div class="san-rows">
            <div class="san-row">
              <span class="san-badge blue">적립식 평균효과</span>
              <span>매달 나눠 납입하므로 <strong>평균 운용기간 = 납입기간의 절반</strong>. 1년차엔 최대 6개월치 수익만 발생합니다.</span>
            </div>
            <div class="san-row">
              <span class="san-badge orange">사업비 구조</span>
              <span>초기(1~2년)에 사업비가 집중되어 실투입금이 줄어듭니다. <strong>3년 이후부터 복리 효과가 본격화</strong>됩니다.</span>
            </div>
            <div class="san-row">
              <span class="san-badge green">시뮬레이션 기준</span>
              <span>연 <strong>${annual3yPct}%</strong> (펀드별 기대수익률 가중평균) 적용. 과거 실적을 그대로 이어 붙이지 않고 펀드마다 최근 3년·설정 후 연환산·중 낮은 값(주식형은 그 75%)을 썼습니다.</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ★ 분기 기준:
  //   isMokiLump = true  → 일시납 모드 (체크 ON=사업비반영 / 체크 OFF=미반영)
  //   isMokiLump = false → 월납 적립식 모드
  // ★★ 항상 실시간 DOM 이중 체크 — proposalData만 믿으면 안 됨
  const levelupApplied = proposalData.levelupApplied || false;
  const mokiApplied    = proposalData.mokiApplied || document.getElementById("mokiCheck")?.checked || false;
  const _liveMode      = document.getElementById("monthlyAmount")?.getAttribute("data-mode");
  const isMokiLump     = proposalData.isMokiLump || mokiApplied || (_liveMode === "lump");

  if (levelupApplied) {
    renderSimTableLevelup();
  } else if (isMokiLump) {
    // 일시납: 체크 ON이면 사업비 반영, OFF이면 미반영 — 금액은 동일
    renderSimTableMokiLump(mokiApplied);
  } else {
    renderSimTableStandard();
  }
}

// ── 모키일시납 전용 시뮬레이션 (사업비 ON/OFF 모두 처리) ───────────────────
function renderSimTableMokiLump(withExpense = false) {
  const { monthly, annualBase } = proposalData;
  // 일시납: 월납입금액 입력란을 일시납 원금으로 사용
  const lumpsum = monthly;
  const periods = [1, 3, 5, 7, 10];

  const expenseBanner = withExpense ? `
    <div class="expense-notice-banner moki-lump-banner">
      <i class="fa-solid fa-piggy-bank"></i>
      <span><strong>[모키일시납 · 사업비 반영]</strong> 신한모으고키우는변액연금보험(무배당) 일시납 기준 사업비가 반영된 시뮬레이션입니다.
      <br>계약체결비용 1.599% 즉시선취 + 연 1.476% 분기균등차감(1~10년) + 0.87%(11년+) 반영</span>
    </div>` : `
    <div class="expense-notice-banner" style="background:#eff4fa;border-color:#cddcee;">
      <i class="fa-solid fa-circle-info" style="color:#1f4a80"></i>
      <span style="color:#1f4a80"><strong>[모키일시납 · 사업비 미반영]</strong> 사업비 없이 연 ${(annualBase*100).toFixed(2)}% 단순 복리로 계산한 참고용 수치입니다.
      <br>실제 가입 시에는 사업비가 차감되므로 <strong>모키일시납 체크 시</strong> 실질 수익을 확인하세요.</span>
    </div>`;

  let html = `
    <thead>
      <tr>
        <th>구분</th>
        <th>납입원금 (일시납)</th>
        <th>예상 수익금</th>
        <th>예상 평가액 ${withExpense ? '<span class="expense-badge-th moki-badge-th">사업비 반영</span>' : '<span class="expense-badge-th" style="background:#e3ecf7;color:#1f4a80;">사업비 미반영</span>'}</th>
        <th>누적 수익률 ${withExpense ? '<span class="expense-badge-th moki-badge-th">사업비 반영</span>' : ''}</th>
        <th>비고</th>
      </tr>
    </thead>
    <tbody>
  `;

  periods.forEach(y => {
    // ★ 사업비 ON: calcWithExpenseMokiLump / OFF: 일시납 단순복리 (월납 공식 절대 사용 금지)
    const fv = withExpense
      ? calcWithExpenseMokiLump(lumpsum, annualBase, y).fv
      : calcWithoutExpenseLumpsum(lumpsum, annualBase, y);   // 일시납 단순복리

    const principal   = lumpsum;   // 일시납: 납입원금 고정
    const gain        = fv - principal;
    const totalReturn = principal > 0 ? (fv / principal - 1) * 100 : 0;

    const badge = y >= 10 ? '<span class="year-badge gold">✨ 비과세구간</span>'
                : y >= 7  ? '<span class="year-badge blue">장기투자</span>' : '';

    const retFormatted = Math.abs(totalReturn) < 1
      ? totalReturn.toFixed(2)
      : formatPctComma(totalReturn);

    html += `
      <tr class="${y === 10 ? 'highlight-row' : ''}">
        <td><strong>${y}년 후</strong></td>
        <td>
          <div class="sim-principal">${formatMoneyComma(Math.round(principal))}원</div>
          <div class="sim-sub">일시납 (변동없음)</div>
        </td>
        <td class="${gain >= 0 ? 'pos' : 'neg'}">
          <strong>${gain >= 0 ? '+' : ''}${formatMoneyComma(Math.round(gain))}원</strong>
        </td>
        <td><strong class="fv-val">${formatMoneyComma(Math.round(fv))}원</strong></td>
        <td class="${totalReturn >= 0 ? 'pos' : 'neg'}">
          <strong>${totalReturn >= 0 ? '+' : ''}${retFormatted}%</strong>
        </td>
        <td>${badge}</td>
      </tr>`;
  });

  html += '</tbody>';
  document.getElementById('simTable').innerHTML = html;
  const bannerEl = document.getElementById('expenseBannerArea');
  if (bannerEl) bannerEl.innerHTML = expenseBanner;
  const breakdownEl = document.getElementById('expenseBreakdownArea');
  if (breakdownEl) breakdownEl.innerHTML = '';
}

// ── 일반 / 모으고키우고 기준 시뮬레이션 ──────────
function renderSimTableStandard() {
  const { monthly, annualBase } = proposalData;
  const periods = [1, 3, 5, 7, 10];
  const expenseApplied = isExpenseChecked();

  const expenseBanner = expenseApplied ? `
    <div class="expense-notice-banner">
      <i class="fa-solid fa-shield-check"></i>
      <span>보험 사업비가 반영된 실질 수익 기준으로 산출된 시뮬레이션입니다.</span>
    </div>` : '';

  let html = `
    <thead>
      <tr>
        <th>구분</th>
        <th>납입원금</th>
        <th>예상 수익금</th>
        <th>예상 평가액 ${expenseApplied ? '<span class="expense-badge-th">사업비 반영</span>' : ''}</th>
        <th>누적 수익률 ${expenseApplied ? '<span class="expense-badge-th">사업비 반영</span>' : ''}</th>
        <th>비고</th>
      </tr>
    </thead>
    <tbody>
  `;

  periods.forEach(y => {
    const n = Math.min(y, 10) * 12;
    const principal = monthly * n;
    const badge = y >= 10 ? '<span class="year-badge gold">✨ 비과세구간</span>'
                : y >= 7  ? '<span class="year-badge blue">장기투자</span>' : '';

    let fv;
    if (expenseApplied) {
      fv = calcWithExpense(monthly, annualBase, y).fv;
    } else {
      fv = calcWithoutExpense(monthly, annualBase, y);
    }

    const gain = fv - principal;
    const totalReturn = principal > 0 ? (fv / principal - 1) * 100 : 0;

    // ★ 1년 후 소수점 2자리 / 나머지 1자리
    const retFormatted = Math.abs(totalReturn) < 1
      ? totalReturn.toFixed(2)
      : formatPctComma(totalReturn);

    // ★ 1년 후 사업비 반영 시 낮은 수익률 안내 툴팁
    const lowRetNote = (y === 1 && expenseApplied && Math.abs(totalReturn) < 5)
      ? `<div class="sim-low-ret-note">💡 적립식 평균효과 + 초기 사업비 집중으로 1년차 수익률은 낮습니다</div>`
      : '';

    html += `
      <tr class="${y === 10 ? 'highlight-row' : ''}">
        <td><strong>${y}년 후</strong></td>
        <td>
          <div class="sim-principal">${formatMoneyComma(Math.round(principal))}원</div>
          <div class="sim-sub">${formatMoneyComma(monthly)}원 × ${n}회</div>
        </td>
        <td class="${gain >= 0 ? 'pos' : 'neg'}">
          <strong>${gain >= 0 ? '+' : ''}${formatMoneyComma(Math.round(gain))}원</strong>
        </td>
        <td><strong class="fv-val">${formatMoneyComma(Math.round(fv))}원</strong></td>
        <td class="${totalReturn >= 0 ? 'pos' : 'neg'}">
          <strong>${totalReturn >= 0 ? '+' : ''}${retFormatted}%</strong>
          ${lowRetNote}
        </td>
        <td>${badge}</td>
      </tr>`;
  });

  html += "</tbody>";
  document.getElementById("simTable").innerHTML = html;
  const bannerEl = document.getElementById("expenseBannerArea");
  if (bannerEl) bannerEl.innerHTML = expenseBanner;
  // expenseBreakdownArea는 renderSimTable()에서 적립식 안내로 이미 채움 → 덮어쓰지 않음
}

// ── 레벨UP 전용 시뮬레이션 (10년납 구조) ──
function renderSimTableLevelup() {
  const { monthly, annualBase } = proposalData;
  // 레벨UP: 10년납 구조 (1~7년 보장기간, 8~10년 순수납입, 11년+ 거치)
  // 설계서 확인: 10년 납입누계 66,252,000 = 552,100 × 12 × 10
  const periods = [1, 3, 5, 7, 10];
  const totalPrincipal10 = monthly * 10 * 12; // 10년 납입원금

  // 사업비 배너
  const expenseBanner = `
    <div class="expense-notice-banner levelup-banner">
      <i class="fa-solid fa-rocket"></i>
      <span><strong>[레벨UP 모드]</strong> 신한변액유니버설종신보험 레벨업(무배당) 기준 사업비가 반영된 시뮬레이션입니다.
      <br>상품설명서 계약자적립액 예시(20년납)에 맞춘 비용 · 10년 이내 보증비용 적립액의 연 1.5% 포함</span>
    </div>`;

  let html = `
    <thead>
      <tr>
        <th>구분</th>
        <th>납입원금</th>
        <th>예상 수익금</th>
        <th>예상 적립금 <span class="expense-badge-th">레벨UP 사업비</span></th>
        <th>누적 수익률</th>
        <th>비고</th>
      </tr>
    </thead>
    <tbody>`;

  // 1/3/5/7/10년 시뮬레이션
  periods.forEach(y => {
    const n = Math.min(y, 10) * 12;
    const principal = monthly * n;
    const result = calcWithExpenseLevelup(monthly, annualBase, y);
    const fv = result.fv;
    const gain = fv - principal;
    const totalReturn = principal > 0 ? (fv / principal - 1) * 100 : 0;

    const isConvert = (y === 7);
    const isComplete = (y === 10);

    let badge = '<span class="year-badge blue">보장+적립</span>';
    if (isConvert)  badge = '<span class="year-badge levelup-convert-badge">🔄 7년 유지보너스</span>';
    if (isComplete) badge = '<span class="year-badge gold">✨ 10년 유지보너스</span>';

    const rowNote = isConvert
      ? '<div class="sim-sub" style="color:#4b5a96;font-weight:700;">설명서 기준 7년차 보너스 반영</div>'
      : isComplete
        ? '<div class="sim-sub" style="color:#22467c;font-weight:700;">설명서 기준 20년납 · 납입 중</div>'
        : '';

    // 수익률 소수점 처리
    const retFormatted = Math.abs(totalReturn) < 1
      ? totalReturn.toFixed(2)
      : formatPctComma(totalReturn);

    html += `
      <tr class="${isComplete ? 'highlight-row levelup-y10-row' : isConvert ? 'levelup-convert-row' : ''}">
        <td>
          <strong>${y}년 후</strong>
          ${rowNote}
        </td>
        <td>
          <div class="sim-principal">${formatMoneyComma(Math.round(principal))}원</div>
          <div class="sim-sub">${formatMoneyComma(monthly)}원 × ${n}회</div>
        </td>
        <td class="${gain >= 0 ? 'pos' : 'neg'}">
          <strong>${gain >= 0 ? '+' : ''}${formatMoneyComma(Math.round(gain))}원</strong>
        </td>
        <td><strong class="fv-val">${formatMoneyComma(Math.round(fv))}원</strong></td>
        <td class="${totalReturn >= 0 ? 'pos' : 'neg'}">
          <strong>${totalReturn >= 0 ? '+' : ''}${retFormatted}%</strong>
        </td>
        <td>${badge}</td>
      </tr>`;
  });

  html += "</tbody>";
  document.getElementById("simTable").innerHTML = html;

  const bannerEl = document.getElementById("expenseBannerArea");
  if (bannerEl) bannerEl.innerHTML = expenseBanner;

  // 레벨UP 안내 박스 (7년 전환 안내)
  const breakdownEl = document.getElementById("expenseBreakdownArea");
  if (breakdownEl) {
    breakdownEl.innerHTML = `
      <div class="levelup-info-box">
        <div class="levelup-info-header">
          <i class="fa-solid fa-circle-info"></i>
          <strong>레벨UP 7년 전환 핵심 안내</strong>
        </div>
        <div class="levelup-info-grid">
          <div class="lui-item">
            <div class="lui-icon" style="background:#f8efd8;color:#9a6d12;"><i class="fa-solid fa-shield-halved"></i></div>
            <div class="lui-text">
              <div class="lui-title">사망보험금 종료</div>
              <div class="lui-desc">7년 시점에 보장성 기능 소멸<br>이후 <strong>순수 저축 전환</strong></div>
            </div>
          </div>
          <div class="lui-item">
            <div class="lui-icon" style="background:#e8f5e9;color:#2f6f5e;"><i class="fa-solid fa-arrows-rotate"></i></div>
            <div class="lui-text">
              <div class="lui-title">피보험자 변경 가능</div>
              <div class="lui-desc">본인 → <strong>배우자·자녀</strong>로<br>주피보험자 변경 가능</div>
            </div>
          </div>
          <div class="lui-item">
            <div class="lui-icon" style="background:#e8ecf5;color:#3f5290;"><i class="fa-solid fa-hand-holding-heart"></i></div>
            <div class="lui-text">
              <div class="lui-title">무상증여 가능</div>
              <div class="lui-desc">적립금 <strong>무상증여</strong> 활용<br>가족 자산이전 수단</div>
            </div>
          </div>
          <div class="lui-item">
            <div class="lui-icon" style="background:#ecedf6;color:#56609a;"><i class="fa-solid fa-certificate"></i></div>
            <div class="lui-text">
              <div class="lui-title">전액 비과세 적용</div>
              <div class="lui-desc">비과세 한도 제한 없이<br><strong>수익 전액 비과세</strong> 적용</div>
            </div>
          </div>
        </div>
        <div class="levelup-info-footer">
          <i class="fa-solid fa-lightbulb"></i>
          7년(84회차) 전환 후에는 MMF형 20% 의무편입이 <strong>해제</strong>되며, AI 추천 포트폴리오로 재배분이 가능합니다.
          위 예상적립금은 상품설명서(20년납·보장 유지) 비용 기준이며, 7년 전환 뒤 비용이 줄어드는 효과는 넣지 않은 보수적 참고치입니다.
        </div>
      </div>`;
  }
}

// ─── 시뮬레이션 차트 ────────────────────────────
function renderSimChart() {
  const { monthly, annualBase, levelupApplied } = proposalData;
  // ★ isMokiLump / mokiApplied: proposalData + 실시간 DOM 이중 확인
  const mokiApplied = proposalData.mokiApplied || document.getElementById("mokiCheck")?.checked || false;
  const _liveMode   = document.getElementById("monthlyAmount")?.getAttribute("data-mode");
  const isMokiLump  = proposalData.isMokiLump || mokiApplied || (_liveMode === "lump");
  const expenseApplied = isExpenseChecked();

  // 일시납: 1~10년 표시 (납입원금 고정), 적립식·레벨UP: 동일 범위
  const years = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const principals = [], fvsNet = [], fvsBase = [], expenses = [];

  years.forEach(y => {
    // 일시납(isMokiLump): 납입원금 고정
    let p, fvNet, fvBase;

    if (isMokiLump) {
      const lumpsum = getMonthlyAmount();
      p = lumpsum;
      if (mokiApplied) {
        fvNet  = calcWithExpenseMokiLump(lumpsum, annualBase, y).fv;
        fvBase = calcWithoutExpenseLumpsum(lumpsum, annualBase, y);
      } else {
        fvNet  = calcWithoutExpenseLumpsum(lumpsum, annualBase, y);
        fvBase = fvNet;
      }
    } else if (levelupApplied) {
      p = monthly * Math.min(y, 10) * 12;
      fvNet = calcWithExpenseLevelup(monthly, annualBase, y).fv;
      fvBase = calcWithoutExpense(monthly, annualBase, Math.min(y, 10));
    } else if (expenseApplied) {
      p = monthly * Math.min(y, 10) * 12;
      fvNet = calcWithExpense(monthly, annualBase, y).fv;
      fvBase = calcWithoutExpense(monthly, annualBase, y);
    } else {
      p = monthly * Math.min(y, 10) * 12;
      fvNet = calcWithoutExpense(monthly, annualBase, y);
      fvBase = fvNet;
    }

    principals.push(Math.round(p / 10000));
    fvsNet.push(Math.round(fvNet / 10000));
    fvsBase.push(Math.round(fvBase / 10000));
    expenses.push(Math.max(0, Math.round((fvBase - fvNet) / 10000)));
  });

  const ctx = document.getElementById("simChart")?.getContext("2d");
  if (!ctx) return;
  if (simChartInstance) simChartInstance.destroy();

  const datasets = [
    {
      label: "납입원금 (만원)",
      data: principals,
      backgroundColor: levelupApplied ? "rgba(75,90,150,0.45)"
                     : mokiApplied    ? "rgba(43,122,111,0.42)" : "rgba(20,49,92,0.78)",
      borderColor:     levelupApplied ? "#4b5a96"
                     : mokiApplied    ? "#2b7a6f"              : "#14315c",
      borderWidth: 1, stack: "stack0"
    },
    {
      label: levelupApplied ? "예상 수익금 (레벨UP 사업비 반영, 만원)"
           : mokiApplied    ? "예상 수익금 (모키일시납 사업비 반영, 만원)"
           : expenseApplied ? "예상 수익금 (사업비 반영, 만원)" : "예상 수익금 (만원)",
      data: fvsNet.map((f, i) => Math.max(0, f - principals[i])),
      backgroundColor: levelupApplied ? "rgba(185,141,46,0.65)"
                     : mokiApplied    ? "rgba(74,140,185,0.65)"
                     : expenseApplied ? "rgba(201,162,74,0.65)" : "rgba(201,162,74,0.85)",
      borderColor:     levelupApplied ? "#b98d2e"
                     : mokiApplied    ? "#4a9cb5"              : "#b98d2e",
      borderWidth: 1, stack: "stack0"
    }
  ];

  simChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: years.map(y => levelupApplied && y === 10 ? `10년\n(거치)` : `${y}년`),
      datasets
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top", labels: { font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (c) => ` ${c.dataset.label}: ${c.raw.toLocaleString()}만원`,
            afterBody: (items) => {
              const total = items.reduce((a, b) => a + b.raw, 0);
              return [`예상 평가액: ${total.toLocaleString()}만원`];
            }
          }
        }
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true, ticks: { callback: (v) => v.toLocaleString() + "만" } }
      }
    }
  });
}


// ═══════════════════════════════════════════════════════════════
// ─── 우측 라인 차트 (미래 예상 적립액) — 실시간 반영 ──────────
// ═══════════════════════════════════════════════════════════════
let simLineChartInstance = null;

function renderSimLineChart() {
  const { monthly, annualBase, expenseApplied, levelupApplied } = proposalData;
  // ★ isMokiLump / mokiApplied: proposalData + 실시간 DOM 이중 확인
  //    proposalData.isMokiLump가 undefined인 경우(구버전 데이터)에도 안전하게 동작
  const mokiApplied = proposalData.mokiApplied || document.getElementById("mokiCheck")?.checked || false;
  const _liveMode   = document.getElementById("monthlyAmount")?.getAttribute("data-mode");
  const isMokiLump  = proposalData.isMokiLump || mokiApplied || (_liveMode === "lump");

  const ctx = document.getElementById("simLineChart")?.getContext("2d");
  if (!ctx) return;
  if (simLineChartInstance) { simLineChartInstance.destroy(); simLineChartInstance = null; }

  // ── 표시 기간: 1/3/5/10년 ──
  const PERIODS = [1, 3, 5, 10];
  const labels  = PERIODS.map(y => `${y}년 후`);

  // ── 데이터 계산 ──
  const principals = [];  // 납입 원금 (만원)
  const fvsNet     = [];  // 예상 적립액 (만원)
  const totalReturns = []; // 누적 수익률 (%)

  // ★ 일시납: lumpsum 미리 계산 (principals 배열이 수평선이 되도록 루프 밖에서 고정)
  const lumpsum = isMokiLump ? getMonthlyAmount() : 0;

  PERIODS.forEach(y => {
    // ★ 일시납(isMokiLump): 납입원금 고정 수평선 — 월납 기준 n×monthly 절대 금지
    let principal, fv;

    if (isMokiLump) {
      // 일시납: principal = lumpsum 고정 (y값 무관 — 수평선)
      principal = lumpsum;
      fv = mokiApplied
        ? calcWithExpenseMokiLump(lumpsum, annualBase, y).fv
        : calcWithoutExpenseLumpsum(lumpsum, annualBase, y);
    } else if (levelupApplied) {
      const n = Math.min(y, 10) * 12;
      principal = monthly * n;
      fv = calcWithExpenseLevelup(monthly, annualBase, y).fv;
    } else if (expenseApplied) {
      const n = Math.min(y, 10) * 12;
      principal = monthly * n;
      fv = calcWithExpense(monthly, annualBase, y).fv;
    } else {
      const n = Math.min(y, 10) * 12;
      principal = monthly * n;
      fv = calcWithoutExpense(monthly, annualBase, y);
    }

    const totalRet = principal > 0 ? (fv / principal - 1) * 100 : 0;
    principals.push(Math.round(principal / 10000));
    fvsNet.push(Math.round(fv / 10000));
    totalReturns.push(totalRet);
  });

  // ── 그라디언트 채우기 ──
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(20,49,92,0.22)');
  gradient.addColorStop(1, 'rgba(20,49,92,0.01)');

  simLineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '예상 적립액',
          data: fvsNet,
          borderColor: '#14315c',
          borderWidth: 3,
          pointBackgroundColor: '#d9a636',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 7,
          pointHoverRadius: 9,
          fill: true,
          backgroundColor: gradient,
          tension: 0.42,
          order: 1
        },
        {
          label: '납입 원금',
          data: principals,
          borderColor: '#94a3b8',
          borderWidth: 2,
          borderDash: [6, 4],
          pointBackgroundColor: '#94a3b8',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: false,
          tension: 0.2,
          order: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            borderRadius: 6,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { size: 12, weight: '600' },
            color: '#374151',
            padding: 16
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.88)',
          padding: 14,
          cornerRadius: 10,
          titleFont: { size: 13, weight: '700' },
          bodyFont: { size: 12 },
          callbacks: {
            label: (c) => {
              const val = c.raw;
              if (val >= 10000) {
                const eok = Math.floor(val / 10000);
                const man = val % 10000;
                return ` ${c.dataset.label}: ${eok}억 ${man > 0 ? man.toLocaleString() + '만' : ''}원`;
              }
              return ` ${c.dataset.label}: ${val.toLocaleString()}만원`;
            },
            afterBody: (items) => {
              const idx = items[0]?.dataIndex;
              if (idx === undefined) return [];
              const ret = totalReturns[idx];
              return [`수익률: ${ret >= 0 ? '+' : ''}${ret.toFixed(1)}%`];
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 12, weight: '600' }, color: '#6b7280' }
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.06)', drawBorder: false },
          ticks: {
            font: { size: 11 },
            color: '#9ca3af',
            callback: (v) => {
              if (v >= 10000) return `${(v / 10000).toFixed(0)}억`;
              if (v >= 1000)  return `${(v / 1000).toFixed(0)}천만`;
              return `${v.toLocaleString()}만`;
            }
          }
        }
      }
    },
    plugins: [{
      // ── 포인트 위 수익률 배지 플러그인 ──
      id: 'returnBadge',
      afterDraw(chart) {
        const { ctx: c, scales: { x, y } } = chart;
        const dataset = chart.data.datasets[0]; // 예상 적립액
        chart.getDatasetMeta(0).data.forEach((pt, i) => {
          const ret = totalReturns[i];
          const label = `${ret >= 0 ? '+' : ''}${Math.round(ret)}%`;
          const bw = c.measureText(label).width + 16;
          const bh = 22;
          const bx = pt.x - bw / 2;
          const by = pt.y - bh - 10;

          // 배지 배경
          c.save();
          c.fillStyle = ret >= 0 ? '#2f6f5e' : '#3d6199';
          c.beginPath();
          c.roundRect(bx, by, bw, bh, 11);
          c.fill();

          // 배지 텍스트
          c.fillStyle = '#fff';
          c.font = 'bold 11px system-ui, sans-serif';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText(label, pt.x, by + bh / 2);
          c.restore();
        });
      }
    }]
  });
}

// ─── 하단 4개 시뮬레이션 카드 — 실시간 반영 ──────────
const SIM_CARD_THEMES = [
  { year: 1,  color: '#14315c', bg: '#eef3fa', border: '#cddcee', label: '1년 후'  },
  { year: 3,  color: '#3d6199', bg: '#f0f4fa', border: '#d2ddec', label: '3년 후'  },
  { year: 5,  color: '#a87a17', bg: '#fbf5e4', border: '#ecdcaa', label: '5년 후'  },
  { year: 10, color: '#2f6f5e', bg: '#eef6f3', border: '#c7e1d8', label: '10년 후' },
];

function renderSimCards() {
  const { monthly, annualBase, expenseApplied, levelupApplied } = proposalData;
  // ★ isMokiLump / mokiApplied: proposalData + 실시간 DOM 이중 확인
  //    proposalData.isMokiLump가 undefined인 경우(구버전 데이터)에도 안전하게 동작
  const mokiApplied = proposalData.mokiApplied || document.getElementById("mokiCheck")?.checked || false;
  const _liveMode   = document.getElementById("monthlyAmount")?.getAttribute("data-mode");
  const isMokiLump  = proposalData.isMokiLump || mokiApplied || (_liveMode === "lump");

  const container = document.getElementById("simCardsRow");
  if (!container) return;

  const html = SIM_CARD_THEMES.map(theme => {
    const y = theme.year;
    // 일시납(isMokiLump): 납입원금 고정 — 월납 기준 n×monthly 절대 금지
    let principal, fv;

    if (isMokiLump) {
      const lumpsum = getMonthlyAmount();
      principal = lumpsum;
      fv = mokiApplied
        ? calcWithExpenseMokiLump(lumpsum, annualBase, y).fv
        : calcWithoutExpenseLumpsum(lumpsum, annualBase, y);
    } else if (levelupApplied) {
      const n = Math.min(y, 10) * 12;
      principal = monthly * n;
      fv = calcWithExpenseLevelup(monthly, annualBase, y).fv;
    } else if (expenseApplied) {
      const n = Math.min(y, 10) * 12;
      principal = monthly * n;
      fv = calcWithExpense(monthly, annualBase, y).fv;
    } else {
      const n = Math.min(y, 10) * 12;
      principal = monthly * n;
      fv = calcWithoutExpense(monthly, annualBase, y);
    }

    const gain = fv - principal;
    const totalReturn = principal > 0 ? (fv / principal - 1) * 100 : 0;

    // 금액 포맷: 억단위 혼합
    function fmtWon(n) {
      if (n >= 100000000) {
        const eok = Math.floor(n / 100000000);
        const man = Math.floor((n % 100000000) / 10000);
        return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
      }
      const man = Math.floor(n / 10000);
      const rem = Math.round(n % 10000);
      if (man > 0 && rem > 0) return `${man.toLocaleString()}만 ${rem.toLocaleString()}원`;
      if (man > 0) return `${man.toLocaleString()}만원`;
      return `${Math.round(n).toLocaleString()}원`;
    }

    const fvStr  = fmtWon(Math.round(fv));
    const gainStr = fmtWon(Math.abs(Math.round(gain)));
    const retStr = `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}%`;
    const gainSign = gain >= 0 ? '+' : '-';

    return `
      <div class="sim-card" style="border-color:${theme.border};background:${theme.bg};">
        <div class="sim-card-year" style="color:${theme.color}">${theme.label}</div>
        <div class="sim-card-amount" style="color:${theme.color}">${fvStr}</div>
        <div class="sim-card-sub">누적 예상액</div>
        <div class="sim-card-badge" style="background:${theme.color}20;color:${theme.color};border:1px solid ${theme.border}">
          ${retStr} &nbsp;|&nbsp; ${gainSign}${gainStr}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}


// ─── 펀드 상세 카드 (New Card Design v15) ──────────────────────────────
function renderFundDetailCards() {
  const { selectedFunds } = proposalData;
  const container = document.getElementById("fundDetailCards");
  container.innerHTML = "";

  // ── 펀드 테마 매핑: 타입 + 카테고리 조합으로 정밀 구분 ──
  // key: "type|category" 또는 "type" 폴백
  const THEME_FULL_MAP = {
    "채권형|국내투자":     { bg: "#eaf3f0", accent: "#2f6f5e", label: "채권형",    country: "KR", icon: "🏦" },
    "주식형|국내투자":     { bg: "#e9eff8", accent: "#14315c", label: "국내주식형", country: "KR", icon: "🇰🇷" },
    "주식형|해외투자":     { bg: "#e8eef8", accent: "#2c5c9a", label: "해외주식형", country: "US", icon: "🌏" },
    "커머더티형|해외투자": { bg: "#fbf5e4", accent: "#a87a17", label: "커머디티형", country: "AU", icon: "🥇" },
    "기타(달러)|국내외투자":{ bg: "#e6f1f5", accent: "#2d7f99", label: "기타",      country: "US", icon: "💵" },
  };

  // 국가코드 매핑 (카테고리별)
  const COUNTRY_MAP = {
    "국내투자":   "KR",
    "해외투자":   "US",
    "국내외투자": "KR/US",
  };

  // 펀드별 특별 아이콘 (id 기반 오버라이드)
  const ICON_MAP = {
    "VU40000": "🏦",   // MMF형
    "VU63300": "🇺🇸",  // 미국주식형II
    "VU71002": "💵",   // 미국달러투자형
    "V0050":   "🇨🇳",  // 중국주식형
    "VU67100": "🇻🇳",  // 베트남주식형
    "VU72000": "🇰🇷",  // 인덱스주식형II
    "VU61100": "🇯🇵",  // 일본주식형
    "VU33000": "💎",   // 가치주식형
    "VU71001": "🥇",   // 골드투자형
  };

  // TOP5 최대 바 너비 기준 (최대값=100%)
  function getTop5BarWidth(holdings, weight, maxW) {
    return Math.round((weight / maxW) * 100);
  }

  selectedFunds.forEach(fund => {
    const r    = fund.returns;
    // 타입+카테고리 조합으로 테마 결정, 폴백은 펀드 자체 color
    const themeKey = `${fund.type}|${fund.category}`;
    const theme = THEME_FULL_MAP[themeKey]
               || THEME_FULL_MAP[fund.type]
               || { bg: "#f3f4f6", accent: fund.color, label: fund.type, country: null, icon: "💼" };
    const countryCode = COUNTRY_MAP[fund.category] || theme.country || "";
    // 특별 아이콘 오버라이드
    const displayIcon = ICON_MAP[fund.id] || theme.icon;

    // 유형 배지 라벨 (theme에서 가져옴)
    const typeBadge = theme.label;

    // TOP5 보유종목 바 차트 데이터
    const top5 = fund.top10Holdings.slice(0, 5);
    const maxW5 = top5.length > 0 ? top5[0].weight : 100;

    // 주요 투자종목 Pill 태그 (TOP5 종목명 핵심어만)
    const pillNames = top5.map(h => {
      let nm = h.name;
      // 긴 이름 줄임 (최대 8자)
      if (nm.length > 10) nm = nm.slice(0, 10).replace(/[\s\(].*$/, '');
      return nm;
    });
    const pillsHTML = pillNames.map(n =>
      `<span class="fnc-pill" style="border-color:${theme.accent};color:${theme.accent}">${n}</span>`
    ).join('');

    // 기간별 수익률 그리드 (1개월/3개월/1년/3년)
    const retItems = [
      { label: "1개월", val: r.m1 },
      { label: "3개월", val: r.m3 },
      { label: "1년",   val: r.y1 },
      { label: "3년",   val: r.y3 },
    ];
    const retGridHTML = retItems.map(item => `
      <div class="fnc-ret-item">
        <div class="fnc-ret-label">${item.label}</div>
        <div class="fnc-ret-val ${item.val >= 0 ? 'pos' : 'neg'}">${item.val >= 0 ? '+' : ''}${item.val}%</div>
      </div>
    `).join('');

    // TOP5 바 차트 HTML
    const top5HTML = top5.map(h => {
      const barW = getTop5BarWidth(top5, h.weight, maxW5);
      return `
        <div class="fnc-bar-row">
          <div class="fnc-bar-name">${h.name.length > 14 ? h.name.slice(0,14)+'…' : h.name}</div>
          <div class="fnc-bar-track">
            <div class="fnc-bar-fill" style="width:${barW}%;background:${theme.accent}"></div>
          </div>
          <div class="fnc-bar-pct">${h.weight}%</div>
        </div>
      `;
    }).join('');

    // 설정연도 (YYYY-MM-DD → YYYY년)
    const setupYear = fund.setupDate ? fund.setupDate.slice(0, 4) + '년 설정' : '';

    // 카드 생성
    const card = document.createElement("div");
    card.className = "fnc-card";
    card.innerHTML = `
      <!-- 파스텔 헤더 -->
      <div class="fnc-header" style="background:${theme.bg}">
        <div class="fnc-header-top">
          <div class="fnc-header-left">
            <div class="fnc-country-icon">${displayIcon}</div>
            ${countryCode ? `<span class="fnc-country-code" style="color:${theme.accent}">${countryCode}</span>` : ''}
          </div>
          <div class="fnc-header-right">
            <span class="fnc-type-badge" style="background:${theme.accent}20;color:${theme.accent};border:1px solid ${theme.accent}40">${typeBadge}</span>
            <span class="fnc-ratio-badge" style="background:${theme.accent}">비중 ${fund.ratio}%</span>
          </div>
        </div>
        <div class="fnc-header-body">
          <div class="fnc-header-name-area">
            <div class="fnc-fund-name" style="color:${theme.accent}">${fundHeadline(fund)}</div>
            <div class="fnc-fund-sub">${fund.name}</div>
            <div class="fnc-fund-manager">${fund.manager}</div>
          </div>
          <div class="fnc-return-big-area">
            <div class="fnc-return-label">1년 수익률</div>
            <div class="fnc-return-big ${r.y1 >= 0 ? 'pos' : 'neg'}">${r.y1 >= 0 ? '+' : ''}${r.y1}%</div>
          </div>
        </div>
      </div>

      <!-- 카드 바디 (흰 배경) -->
      <div class="fnc-body">

        <!-- 주요 투자 종목 Pill 태그 -->
        <div class="fnc-section">
          <div class="fnc-section-title"><span class="fnc-fire">🔥</span> 주요 투자 종목</div>
          <div class="fnc-pills">${pillsHTML}</div>
        </div>

        <!-- 전략 설명 -->
        <div class="fnc-desc">${fund.monthlyComment}</div>

        <!-- 기간별 수익률 그리드 -->
        <div class="fnc-ret-grid">${retGridHTML}</div>

        <!-- 주요 보유 비중 TOP5 -->
        <div class="fnc-section fnc-section-top5">
          <div class="fnc-section-title">주요 보유 비중 TOP5</div>
          <div class="fnc-bars">${top5HTML}</div>
        </div>

        <!-- 하단 메타 정보 -->
        <div class="fnc-meta">
          <span class="fnc-meta-item">
            <i class="fa-solid fa-building-columns" style="color:${theme.accent}"></i>
            ${fund.netAsset}
          </span>
          <span class="fnc-meta-item">
            <i class="fa-solid fa-percent" style="color:${theme.accent}"></i>
            보수 ${fund.fee}
          </span>
          <span class="fnc-meta-item">
            <i class="fa-solid fa-calendar-days" style="color:${theme.accent}"></i>
            ${setupYear}
          </span>
        </div>

      </div>
    `;
    container.appendChild(card);
  });
}

// ─── 뒤로가기 ───────────────────────────────────
function goBack() {
  document.getElementById("page2").classList.remove("active");
  document.getElementById("page1").classList.add("active");
  window.scrollTo(0, 0);
}

// ─── 유틸: 금액 포맷 (억/만 단위 한글 혼합) ──────
function formatMoney(n) {
  if (n >= 100000000) {
    const eok = Math.floor(n / 100000000);
    const man = Math.floor((n % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`;
  } else if (n >= 10000) {
    const man = Math.floor(n / 10000);
    const rest = n % 10000;
    return rest > 0 ? `${man.toLocaleString()}만 ${rest.toLocaleString()}` : `${man.toLocaleString()}만`;
  }
  return n.toLocaleString();
}

// ─── 유틸: 숫자에 콤마만 붙이기 (단위 한글 없음) ──
// 예: 12345678 → "12,345,678"
function formatMoneyComma(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('ko-KR');
}

// ─── 유틸: 퍼센트 수치 콤마 포맷 ─────────────────
// 예: 3587.1 → "3,587.1"  /  27109.6 → "27,109.6"
function formatPctComma(n, decimals = 1) {
  if (typeof n !== 'number' || isNaN(n)) return '0.0';
  const parts = n.toFixed(decimals).split('.');
  parts[0] = parseInt(parts[0]).toLocaleString('ko-KR');
  return parts.join('.');
}

// ─── 인쇄 시 차트 높이 동적 제어 (A4 가로/세로 공통 대응 v5.0, v18r21) ────
// 문제: .sim-line-chart-wrap에 style="height:300px" 인라인이 있어
//       CSS !important로도 override 불가 → JS로 직접 변경 필요
//       (A4 가로 인쇄영역이 넓어진 만큼 190px로 여유있게 확보)
// ★★★ 버그수정(v18r21, "차트가 간혹 인쇄 안 됨"):
//   1) afterprint에서 simLineChartInstance를 재조정하지 않던 비대칭 버그 수정
//      → 인쇄를 연속 2번 이상 하면 두번째부터 라인차트가 깨지는 원인이었음.
//   2) beforeprint 이벤트 발생 시점에 브라우저가 아직 인쇄용 CSS 레이아웃을
//      100% 반영하지 못한 상태에서 resize()가 실행되어 "간혹" 빈 캔버스로
//      인쇄되는 타이밍 이슈 → 0ms/60ms 지연 재호출을 추가해 레이아웃 확정
//      이후 한번 더 강제 resize (더블 세이프가드).
(function setupPrintChartResize() {
  var _origLineHeight    = "300px";
  var _origChartHeight    = "340px";
  var _origChartMarginTop = "18px";

  function resizeAllPrintCharts() {
    try { if (typeof simChartInstance !== 'undefined' && simChartInstance) simChartInstance.resize(); } catch(e) {}
    try { if (typeof simLineChartInstance !== 'undefined' && simLineChartInstance) simLineChartInstance.resize(); } catch(e) {}
    // ★★ 버그수정(인쇄시 그래프 안보임): 포트폴리오 도넛차트(pieChart2Instance)가
    //    resize 목록에서 빠져있었음 — .donut-canvas-wrap이 인쇄모드에서
    //    200px→115px로 축소되는데 캔버스 버퍼가 재계산되지 않아 빈 화면으로 인쇄됨
    try { if (typeof pieChart2Instance !== 'undefined' && pieChart2Instance) pieChart2Instance.resize(); } catch(e) {}
    try { if (typeof pieChartInstance   !== 'undefined' && pieChartInstance)   pieChartInstance.resize(); } catch(e) {}
  }

  window.addEventListener("beforeprint", function() {
    // 라인차트(sim-line-chart-wrap) — 실제 인쇄에 노출되는 차트
    var lineWrap = document.querySelector(".sim-line-chart-wrap");
    if (lineWrap) {
      _origLineHeight = lineWrap.style.height || "300px";
      lineWrap.style.height    = "160px";
      lineWrap.style.maxHeight = "160px";
    }
    // 구버전 bar차트(sim-chart-wrap, 현재는 숨김 유지용) 대비 호환 처리
    var chartWrap = document.querySelector(".sim-chart-wrap");
    if (chartWrap) {
      _origChartHeight    = chartWrap.style.height    || "340px";
      _origChartMarginTop = chartWrap.style.marginTop || "18px";
      chartWrap.style.height    = "130px";
      chartWrap.style.maxHeight = "130px";
      chartWrap.style.marginTop = "3px";
    }
    // 즉시 1차 리사이즈 + 레이아웃 확정 후 지연 재리사이즈(더블 세이프가드)
    resizeAllPrintCharts();
    setTimeout(resizeAllPrintCharts, 0);
    setTimeout(resizeAllPrintCharts, 60);
    setTimeout(resizeAllPrintCharts, 200);
  });

  window.addEventListener("afterprint", function() {
    // 라인차트 원상 복원
    var lineWrap = document.querySelector(".sim-line-chart-wrap");
    if (lineWrap) {
      lineWrap.style.height    = _origLineHeight || "300px";
      lineWrap.style.maxHeight = "";
    }
    // 구버전 bar차트 원상 복원
    var chartWrap = document.querySelector(".sim-chart-wrap");
    if (chartWrap) {
      chartWrap.style.height    = _origChartHeight    || "340px";
      chartWrap.style.maxHeight = "";
      chartWrap.style.marginTop = _origChartMarginTop || "18px";
    }
    // 인쇄 종료 후 화면 크기로 원복 리사이즈 (라인차트 포함 — 이전엔 빠져있던 부분)
    resizeAllPrintCharts();
    setTimeout(resizeAllPrintCharts, 60);
  });

  // ★ matchMedia('print') 보조 감지 — 일부 브라우저(사파리 등)는 beforeprint/
  //   afterprint 대신 이쪽으로만 인쇄 상태변화를 알려주는 경우가 있어 이중 보장
  if (window.matchMedia) {
    try {
      var mql = window.matchMedia('print');
      var onPrintChange = function(e) {
        if (e.matches) {
          resizeAllPrintCharts();
          setTimeout(resizeAllPrintCharts, 60);
        } else {
          setTimeout(resizeAllPrintCharts, 60);
        }
      };
      if (mql.addEventListener) mql.addEventListener('change', onPrintChange);
      else if (mql.addListener) mql.addListener(onPrintChange);
    } catch(e) {}
  }
})();

function printToPDF() {
  // ① 고객명 추출 — proposalData 우선, 없으면 입력 필드, 최후엔 "고객"
  var rawName = "";
  if (proposalData && proposalData.name && proposalData.name.trim()) {
    rawName = proposalData.name.trim();
  } else {
    var nameEl = document.getElementById("clientName");
    rawName = (nameEl && nameEl.value.trim()) ? nameEl.value.trim() : "고객";
  }

  // ② 파일명 구성 — 특수문자 제거, 날짜 포함
  //    예: "홍길동" → "홍길동_ETF저축변액_제안서_20260623"
  var safeDate = (window._todayStr || "").replace(/\./g, "");
  var safeName = rawName.replace(/[\\\/:\*\?"<>\|]/g, "").trim() || "고객";
  var pdfTitle = safeDate
    ? (safeName + "_ETF저축변액_제안서_" + safeDate)
    : (safeName + "_ETF저축변액_제안서");

  // ③ 원래 title 백업 + 즉시 교체 (document.title + <title> 태그 직접 변경 이중 보장)
  var _origTitle = document.title;
  document.title = pdfTitle;
  var titleTag = document.querySelector("title");
  if (titleTag) titleTag.textContent = pdfTitle;

  // ④ 버튼 로딩 UI
  var btn = document.querySelector(".print-btn");
  var origBtnHTML = btn ? btn.innerHTML : "";
  if (btn) {
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 준비중...';
    btn.disabled  = true;
  }

  // ⑤ afterprint 일회성 리스너 — title·버튼 복원
  function restoreAfterPrint() {
    document.title = _origTitle;
    if (titleTag) titleTag.textContent = _origTitle;
    if (btn) {
      btn.innerHTML = origBtnHTML;
      btn.disabled  = false;
    }
    window.removeEventListener("afterprint", restoreAfterPrint);
  }
  window.addEventListener("afterprint", restoreAfterPrint);

  // ⑥ title 변경이 DOM에 완전히 반영된 후 인쇄 실행
  //    requestAnimationFrame 두 번 → DOM 커밋 보장 → setTimeout으로 추가 확보
  var _cpPrepared = null;
  try { if (window.cpPrintPrepare) _cpPrepared = window.cpPrintPrepare(); } catch (e) { /* 실패하면 원래 그래프 그대로 인쇄 */ }
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      setTimeout(function() {
        Promise.resolve(_cpPrepared).then(function() { window.print(); }, function() { window.print(); });
        return;
        window.print();
      }, 300);
    });
  });
}

// ─── 합계 배지 floating 풍선 ─────────────────────────
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var src = document.getElementById('totalRatioDisplay');
    if (!src) return;

    // floating 배지 생성
    var badge = document.createElement('div');
    badge.id = 'ratioFloatBadge';
    document.body.appendChild(badge);

    // 원본 배지 텍스트·클래스 → floating 배지에 동기화
    function sync() {
      badge.textContent = src.textContent;  // "합계: 100%"
      // ok / over 클래스 그대로 복사
      badge.className = src.classList.contains('over') ? 'over' : 'ok';
    }

    sync();  // 초기 동기화

    // src 변경 감지 → 즉시 반영
    new MutationObserver(sync).observe(src, {
      characterData: true, childList: true,
      attributes: true, subtree: true
    });
  });
})();
