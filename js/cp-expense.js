// =====================================================
// 사업비 반영 상태를 눈에 띄게 보여 준다 (2026-09-21 상무님: "상품을 선택하면 사업비가 반영된 것을 육안으로 알 수 있게, 너무 작아서 찾기 힘들다")
//  · STEP2 상품 카드 아래 큰 안내 띠 + 오른쪽 미리보기 옆 상태 카드 — 어떤 상품을 골랐는지, 반영 중인지 한눈에
//  · 계산 로직은 건드리지 않는다. 체크박스 상태(레벨UP·모키적립식·모키일시납·동시체크)를 읽어서 표시만 한다.
// =====================================================
(function () {
  const $ = id => document.getElementById(id);
  const on = id => !!($(id) && $(id).checked);

  function state() {
    if (on('crossCheck'))   return { k: 'cross',    name: '동시체크 비교', icon: 'fa-code-compare', sub: '레벨UP과 모키적립식의 사업비를 각각 반영해 나란히 비교합니다' };
    if (on('levelupCheck')) return { k: 'levelup',  name: '레벨UP',       icon: 'fa-rocket',       sub: '계약체결·관리 비용이 차감된, 실제에 가까운 예상값으로 계산합니다' };
    if (on('mokiCheck'))    return { k: 'moki',     name: '모키일시납',   icon: 'fa-piggy-bank',   sub: '일시납 상품의 사업비가 차감된 예상값으로 계산합니다' };
    if (on('expenseCheck')) return { k: 'standard', name: '모키적립식',   icon: 'fa-seedling',     sub: '적립식 상품의 사업비가 차감된 예상값으로 계산합니다' };
    return { k: 'none', name: '', icon: '', sub: '위에서 상품(레벨UP·모키적립식·모키일시납)을 선택하면 사업비가 반영된 미래값으로 계산됩니다' };
  }

  let last = null;
  function render() {
    const s = state();
    ['expenseBanner', 'expenseBannerSide'].forEach(id => {
      const el = $(id);
      if (!el) return;
      const side = id === 'expenseBannerSide';
      const isOn = s.k !== 'none';
      el.className = 'exp-banner' + (side ? ' exp-side' : '') + (isOn ? ' on' : ' off') + (isOn && last !== s.k ? ' flash' : '');
      el.innerHTML = isOn
        ? `<i class="fa-solid fa-circle-check"></i><div><b>${s.name} 사업비 반영 중</b><span>${s.sub}</span></div>`
        : `<i class="fa-regular fa-circle-xmark"></i><div><b>사업비 미반영</b><span>${s.sub}</span></div>`;
    });
    last = s.k;
  }

  // 상품을 누르면 기존 코드가 다른 체크를 끄는 등 바로 뒤에 상태가 바뀌므로, 클릭이 끝난 뒤 한 번 더 읽는다.
  document.addEventListener('click', () => setTimeout(render, 0), true);
  document.addEventListener('change', () => setTimeout(render, 0), true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
  setTimeout(render, 800);
  window.cpExpenseRender = render;
})();
