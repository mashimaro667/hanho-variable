// =====================================================
// 한호 2.2.0 상품 선택 (2026-11-14 주성씨 지시)
//  "사업비 반영 버튼은 누르면 켜지고 누르면 꺼지게, 상품 옵션 옆에 짧게.
//   상품 옵션은 동시체크(눌러진 채로 밑에 상품 2개 누르면 비교)·레벨업·모키적립·모키연금.
//   적립과 연금은 금액 부분에 일시납 버튼, 누르고 금액 누르면 일시납으로."
//
// 상태(HH) → 원본 계산 코드가 읽는 숨은 체크박스로 옮긴다.
//   사업비 ON + 레벨UP          → levelupCheck
//   사업비 ON + 적립/연금 월납  → expenseCheck
//   사업비 ON + 적립/연금 일시납 → mokiCheck
//   사업비 OFF                  → 체크 없음 (일시납이면 data-mode=lump)
//   동시체크 + 상품 2개         → crossCheck, 계산은 hanho-calc.js가 HH.pair로 고름
// 상품 이름은 원본 문구(모키적립식·모키일시납·레벨UP)를 화면에서 바꿔 보여 준다.
// =====================================================
(function () {
  const $ = id => document.getElementById(id);
  const NAME = { levelup: '레벨UP', save: '모키적립', annuity: '모키연금' };
  const HH = window.HH = { product: 'save', lump: false, expense: true, cross: false, pair: [] };
  let lastKey = 'standard';

  function legacyKey() {
    if (!HH.expense) return 'none';
    if (HH.product === 'levelup') return 'levelup';
    return HH.lump ? 'moki' : 'standard';
  }

  function apply() {
    const cross = $('crossCheck');
    if (HH.cross) {
      if (!cross.checked) { cross.checked = true; onCrossCheckChange(); }
      lastKey = 'cross';
      render(); return;
    }
    if (cross.checked) { cross.checked = false; onCrossCheckChange(); lastKey = 'x'; }
    const key = legacyKey();
    const ids = { levelup: 'levelupCheck', standard: 'expenseCheck', moki: 'mokiCheck' };
    Object.values(ids).forEach(id => { $(id).checked = false; });
    const amt = $('monthlyAmount');
    if (key === 'none') {
      toggleLevelupUI(false);
      toggleMokiLumpUI(HH.lump, false);
      amt.setAttribute('data-mode', HH.lump ? 'lump' : 'monthly');
      onExpenseGroupChange('none');
    } else {
      $(ids[key]).checked = true;
      const keepAmt = amt.value, keepMode = amt.getAttribute('data-mode');
      if (key !== lastKey) onExpenseGroupChange(key === 'standard' ? 'standard' : key);
      else onExpenseGroupChange('none');
      // 원본은 상품을 바꿀 때 금액을 30만원으로 되돌림 → 월납끼리 바꿀 때는 입력한 금액 유지
      if (key === 'standard' && keepMode !== 'lump') amt.value = keepAmt;
    }
    lastKey = key;
    updatePreview();
    render();
  }

  function setLump(on) {
    const amt = $('monthlyAmount');
    HH.lump = on;
    amt.value = on ? '0' : '500,000';   // 일시납: 0에서 금액 버튼을 눌러 합산
    amt.setAttribute('data-mode', on ? 'lump' : 'monthly');
    apply();
  }

  function onClick(k) {
    if (k === 'expense') { if (HH.cross) return; HH.expense = !HH.expense; apply(); return; }
    if (k === 'cross') {
      HH.cross = !HH.cross;
      if (HH.cross) { HH.pair = []; HH.lump = false; $('monthlyAmount').value = '500,000'; $('monthlyAmount').setAttribute('data-mode', 'monthly'); }
      else if (HH.pair.length) HH.product = HH.pair[HH.pair.length - 1];
      apply(); return;
    }
    if (HH.cross) {               // 비교할 상품 2개 고르기 (세 번째를 누르면 먼저 고른 것이 빠짐)
      const i = HH.pair.indexOf(k);
      if (i >= 0) HH.pair.splice(i, 1); else { HH.pair.push(k); if (HH.pair.length > 2) HH.pair.shift(); }
      // 레벨UP이 있으면 원본 화면의 '레벨UP 칸'(첫 칸)에 오게 정렬
      HH.pair.sort((a, b) => (a === 'levelup' ? -1 : b === 'levelup' ? 1 : 0));
      render(); return;
    }
    if (k === 'levelup' && HH.lump) { HH.lump = false; $('monthlyAmount').value = '500,000'; }
    HH.product = k;
    apply();
  }

  function render() {
    document.querySelectorAll('#hhProdRow .hh-pbtn').forEach(b => {
      const k = b.dataset.k;
      let on = false;
      if (k === 'cross') on = HH.cross;
      else if (k === 'expense') on = HH.cross || HH.expense;
      else on = HH.cross ? HH.pair.includes(k) : HH.product === k;
      b.classList.toggle('on', on);
      if (k === 'expense') b.classList.toggle('locked', HH.cross);
    });
    const lb = $('hhLumpBtn');
    if (lb) { lb.style.display = (!HH.cross && HH.product !== 'levelup') ? '' : 'none'; lb.classList.toggle('on', HH.lump); }
    const hint = $('hhProdHint');
    if (hint) {
      if (HH.cross) hint.innerHTML = HH.pair.length === 2
        ? `<b>${NAME[HH.pair[0]]}</b> vs <b>${NAME[HH.pair[1]]}</b> 비교 (월납·사업비 반영)`
        : `비교할 상품 2개를 고르세요 (${HH.pair.length}/2)`;
      else hint.innerHTML = `${NAME[HH.product]}${HH.lump ? ' 일시납' : ' 월납'} · 사업비 ${HH.expense ? '반영' : '미반영'}`;
    }
    const lbl = $('amountLabel');
    if (lbl && HH.lump && !HH.cross) lbl.innerHTML = `<i class="fa-solid fa-piggy-bank"></i> 일시납 금액 <span class="moki-lump-label-badge">${NAME[HH.product]} 일시납</span>`;
  }

  // ── 원본 문구의 상품 이름 바꾸기 ──
  function relabel(str) {
    if (!str) return str;
    let map;
    if (HH.cross && HH.pair.length === 2) map = { '모키적립식': NAME[HH.pair[1]], '레벨UP': NAME[HH.pair[0]], '모키일시납': NAME[HH.pair[1]] };
    else if (HH.product === 'annuity') map = { '모키적립식': '모키연금', '모키일시납': '모키연금 일시납', '모키(적립형)': '모키연금', '모키(일시납)': '모키연금 일시납', '모으고키우고변액적립보험': '모으고키우는변액연금보험', '모으고키우는변액적립보험': '모으고키우는변액연금보험', '모으고키우고': '모키연금' };
    else map = { '모키적립식': '모키적립', '모키일시납': '모키적립 일시납', '모키(적립형)': '모키적립', '모키(일시납)': '모키적립 일시납' };
    const keys = Object.keys(map).filter(k => map[k] !== k);
    if (!keys.length) return str;
    const re = new RegExp(keys.map(k => k.replace(/[()]/g, '\\$&')).join('|'), 'g');
    return str.replace(re, m => map[m]);
  }
  window.hhRelabel = relabel;
  function relabelTree(root) {
    if (!root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) { const v = relabel(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  }
  function watch(id) {
    const el = $(id); if (!el) return;
    new MutationObserver(() => relabelTree(el)).observe(el, { childList: true, subtree: true, characterData: true });
  }
  if (window.Chart && Chart.register) Chart.register({ id: 'hhRelabel', beforeInit(c) {
    (c.data.datasets || []).forEach(d => { if (d.label) d.label = relabel(d.label); });
    if (Array.isArray(c.data.labels)) c.data.labels = c.data.labels.map(l => typeof l === 'string' ? relabel(l) : l);
  } });

  // 동시체크인데 상품을 2개 고르지 않았으면 제안서를 만들지 않음
  const origGen = window.generateProposal;
  window.generateProposal = function () {
    if (HH.cross && HH.pair.length !== 2) { alert('동시체크: 비교할 상품 2개를 골라 주세요.'); return; }
    return origGen.apply(this, arguments);
  };

  function init() {
    document.querySelectorAll('#hhProdRow .hh-pbtn').forEach(b => b.addEventListener('click', () => onClick(b.dataset.k)));
    const lb = $('hhLumpBtn'); if (lb) lb.addEventListener('click', () => setLump(!HH.lump));
    ['page2', 'aiResultBox', 'expenseStatusBadge'].forEach(watch);
    // 2.3.2: AI 버튼 중 '예상 수익률 설정'만 입력 칸을 열고, 다른 버튼을 누르면 닫는다. 고른 버튼은 표시해 둔다.
    document.querySelectorAll('.ai-rec-types .ai-btn').forEach(b => b.addEventListener('click', () => {
      if (!b.classList.contains('ai-btn-target')) $('hhTargetPanel')?.classList.remove('open');
      document.querySelectorAll('.ai-rec-types .ai-btn').forEach(x => x.classList.toggle('hh-picked', x === b));
    }));
    // 첫 화면: 모키적립 월납 · 사업비 반영
    $('expenseCheck').checked = true;
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0)); else setTimeout(init, 0);
})();
