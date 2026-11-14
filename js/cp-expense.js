// =====================================================
// 사업비 반영 켜기/끄기 버튼 (한호 2.1.5, 2026-11-14 주성씨 지시: "사업비 반영 중 너무 길어, 그냥 사업비 반영 버튼 만들고 켰다 껐다 되게")
//  · 긴 안내 띠 대신 [사업비 반영 ON/OFF] 버튼 하나. 누르면 고른 상품(레벨UP·모키적립식·모키일시납)의 사업비를 켜고 끈다.
//  · 상품 버튼을 누르면 자동으로 켜진다. 끌 때 고른 상품을 기억해 두었다가 다시 켤 때 그 상품으로 켠다.
// =====================================================
(function () {
  const $ = id => document.getElementById(id);
  const IDS = { levelup: 'levelupCheck', standard: 'expenseCheck', moki: 'mokiCheck' };
  const NAME = { levelup: '레벨UP', standard: '모키적립식', moki: '모키일시납' };
  let remembered = 'standard';

  function current() {
    if ($('crossCheck')?.checked) return 'cross';
    for (const k in IDS) if ($(IDS[k])?.checked) return k;
    return null;
  }

  function toggle() {
    const k = current();
    if (k === 'cross') { $('crossCheck').checked = false; onCrossCheckChange(); render(); return; }
    if (k) {                       // 끄기
      remembered = k;
      $(IDS[k]).checked = false;
      if (k === 'levelup') { toggleLevelupUI(false); validateRatios(); updateExpenseStatusBadge(); }
      else onExpenseGroupChange(k); // 모키적립식·일시납: 원래 함수가 끈 상태(일시납은 금액 유지)로 정리
    } else {                       // 켜기
      const el = $(IDS[remembered]);
      el.checked = true;
      if (remembered === 'moki') onExpenseGroupChange('moki');
      else onExpenseGroupChange(remembered);
    }
    render();
  }

  function render() {
    const el = $('expenseBanner');
    if (!el) return;
    const k = current();
    if (k && k !== 'cross') remembered = k;
    const on = !!k;
    el.className = 'hh-exp-toggle' + (on ? ' on' : '');
    el.setAttribute('role', 'switch'); el.setAttribute('aria-checked', on);
    el.innerHTML = `<span class="sw"><i></i></span><b>사업비 반영 ${on ? 'ON' : 'OFF'}</b><small>${k === 'cross' ? '동시체크' : NAME[k || remembered]}</small>`;
  }

  window.hhExpToggle = toggle;
  document.addEventListener('click', () => setTimeout(render, 0), true);
  document.addEventListener('change', () => setTimeout(render, 0), true);
  function init() { const el = $('expenseBanner'); if (el) el.onclick = toggle; render(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  setTimeout(render, 800);
  window.cpExpenseRender = render;
})();
