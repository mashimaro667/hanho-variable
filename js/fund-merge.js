// fund-latest.js(데이터갱신.py 가 만든 최신 수치)를 FUND_DATA 위에 덮어쓴다. 글(전략·코멘트·보유종목)은 그대로 둔다.
(function () {
  try {
    if (typeof FUND_DATA === 'undefined' || !window.FUND_LATEST) return;
    FUND_DATA.forEach(function (f) {
      var n = window.FUND_LATEST.funds[f.id];
      if (!n) return;
      f.returns = Object.assign({}, f.returns, n.returns);
      if (n.netAsset) f.netAsset = n.netAsset;
      if (n.fee) f.fee = n.fee;
    });
  } catch (e) { console.warn('fund-merge 실패 — 기존 수치 사용', e); }
})();
