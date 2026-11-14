// =====================================================
// 인쇄용 그래프 준비 (2026-09-21 상무님: "인쇄하면 잘리고 페이지가 비어 보인다 → 페이지별로 꽉 차게, 제대로 출력")
//  · 화면용 그래프는 화면 크기로 그려져 있어, 인쇄 칸이 더 좁으면 오른쪽이 잘렸다.
//  · 인쇄하기 버튼을 누르면 그래프를 '인쇄 칸 크기(160mm × 34mm)'로 다시 그린 채 인쇄하고, 인쇄가 끝나면 화면 크기로 되돌린다.
//  · 이미지로 바꾸지 않고 그래프 자체를 다시 그린다(이미지 변환·대기 없이 타이밍 문제가 없다).
//  · ※ beforeprint 이벤트 안에서 다시 그리면 인쇄 처리가 멈추는 것을 시험에서 확인 → 인쇄창을 열기 '전에' printToPDF 가 호출한다.
//  · 계산·화면 로직은 건드리지 않는다.
// =====================================================
(function () {
  const MM = 3.7795;                                   // 1mm ≈ 3.78px
  const LINE_W = 160 * MM;                             // cp-print.css 의 그래프 칸 폭(160mm)과 같아야 한다
  // 높이: 레벨UP 은 안내 박스가 추가되어 34mm, 그 외는 38mm (cp-print.css 와 같은 값)
  const lineH = () => (document.querySelector('#page2 .p2-sim-wrap .levelup-info-box') ? 31.5 : 33) * MM;
  let saved = null;

  function lineChart() {
    if (typeof simLineChartInstance !== 'undefined' && simLineChartInstance) return simLineChartInstance;
    const cv = document.getElementById('simLineChart');
    return (cv && window.Chart && Chart.getChart) ? Chart.getChart(cv) : null;
  }

  function prepare() {
    cleanup();
    const chart = lineChart();
    if (!chart || !chart.canvas || !chart.canvas.offsetParent) return Promise.resolve();
    try {
      const lg = chart.options.plugins && chart.options.plugins.legend;
      saved = { chart, responsive: chart.options.responsive, animation: chart.options.animation, dpr: chart.options.devicePixelRatio, legendAlign: lg ? lg.align : undefined };
      if (lg) lg.align = 'start';                      // 범례를 왼쪽으로(오른쪽 끝 수익률 배지와 겹침 방지)
      // 오른쪽 끝 수익률 배지·범례가 잘리지 않게 인쇄 동안만 오른쪽 여백을 늘린다 (2026-10-07)
      const lay = chart.options.layout || (chart.options.layout = {});
      saved.layoutPad = lay.padding;
      const bp = (typeof lay.padding === 'number') ? { top: lay.padding, right: lay.padding, bottom: lay.padding, left: lay.padding } : Object.assign({ top: 0, right: 0, bottom: 0, left: 0 }, lay.padding || {});
      lay.padding = Object.assign({}, bp, { top: (bp.top || 0) + 8, right: (bp.right || 0) + 40 });
      chart.options.responsive = false;
      chart.options.animation = false;
      chart.options.devicePixelRatio = 3;              // 종이에서 선명하도록
      // 진행 중인 애니메이션(탭이 숨겨져 있을 때 등)이 있으면 Chart.js 가 크기 변경을 미루므로, 먼저 멈추고 반영한다.
      try { chart.stop(); } catch (e) { /* 멈출 것이 없음 */ }
      chart.update('none');
      const w = Math.round(LINE_W), h = Math.round(lineH());
      chart.resize(w, h);
      if (Math.round(chart.width) !== w) { chart._resizeBeforeDraw = null; if (chart._resize) chart._resize(w, h); }
      chart.update('none');
    } catch (e) { cleanup(); }                         // 실패하면 원래 그래프 그대로 인쇄
    return Promise.resolve();
  }

  function cleanup() {
    if (!saved) return;
    const s = saved; saved = null;
    try {
      s.chart.options.responsive = s.responsive;
      if (s.animation === undefined) delete s.chart.options.animation; else s.chart.options.animation = s.animation;
      if (s.dpr === undefined) delete s.chart.options.devicePixelRatio; else s.chart.options.devicePixelRatio = s.dpr;
      if (s.chart.options.layout) { if (s.layoutPad === undefined) delete s.chart.options.layout.padding; else s.chart.options.layout.padding = s.layoutPad; }
      const lg = s.chart.options.plugins && s.chart.options.plugins.legend;
      if (lg) { if (s.legendAlign === undefined) delete lg.align; else lg.align = s.legendAlign; }
      s.chart.resize();                                // 화면용 크기로 복구
      s.chart.update('none');
    } catch (e) { /* 화면 그래프는 다음 새로고침 때 원래대로 */ }
  }

  window.addEventListener('afterprint', cleanup);
  window.cpPrintPrepare = prepare;
  window.cpPrintCleanup = cleanup;
})();
