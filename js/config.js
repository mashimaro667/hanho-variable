// ╔══════════════════════════════════════════════════════════════╗
// ║         🎨 브랜딩 설정 파일 — 여기만 수정하면 됩니다!          ║
// ║  변액을더하다 · (주)컨설팅을더하다 자체개발프로그램  ║
// ╚══════════════════════════════════════════════════════════════╝
//
// ✅ 수정 방법:
//   1. 이 파일(config.js)만 열어서 아래 값들을 본인 정보로 교체
//   2. 저장 후 배포 — 끝!
//
// ⚠️ 주의: 따옴표(' ') 안의 값만 바꾸세요. 구조는 건드리지 마세요.
// ════════════════════════════════════════════════════════════════

const BRAND = {

  // ══════════════════════════════════════════
  // 🔐 1. 접속 비밀번호
  // ══════════════════════════════════════════
  password: '7730',          // ← 원하는 숫자/문자로 변경

  // ══════════════════════════════════════════
  // 👤 2. 만든이 정보
  // ══════════════════════════════════════════
  makerOrg:  '한호자산연구소',      // ← 소속 (지점·본부명은 쓰지 않는다 — 본사 지침)
  makerName: '김주성 소장',  // ← 이름 + 직함
  makerPhone: '010-2907-1416', // ← 비상연락망 전화번호

  // ══════════════════════════════════════════
  // 🏆 3. 헤더 수상/자격 배지 (빈 문자열 '' 로 두면 숨김)
  // ══════════════════════════════════════════
  badgeChampion: '',  // ← 수상 실적 또는 ''
  badgeMDRT:     '',  // ← MDRT 실적 또는 ''

  // ══════════════════════════════════════════
  // ☕ 4. 카카오 선물하기 버튼
  //    (팝업창 + 헤더 타이틀 옆 커피 아이콘)
  // ══════════════════════════════════════════
  kakaoGiftUrl: '#', // ← 본인 카카오 선물하기 링크
  // 선물하기 링크 만들기: 카카오톡 → 선물하기 → 링크 복사
  // 없으면 '#' 으로 설정

  // ══════════════════════════════════════════
  // 💬 5. 카카오톡 1:1 상담 플로팅 버튼 (우측 하단)
  // ══════════════════════════════════════════
  kakaoTalkUrl: '#',
  // ↑ 본인 카카오 오픈채팅 링크로 교체
  // 오픈채팅 링크 만들기: 카카오톡 → 오픈채팅 → 링크 복사
  // 없으면 'https://open.kakao.com/' 으로 설정

  // ══════════════════════════════════════════
  // 📱 6. 앱 타이틀 (브라우저 탭 + PWA 앱 이름)
  // ══════════════════════════════════════════
  appTitle: '한호 변액설계',  // ← 탭에 표시될 이름
  appSubTitle: '한호자산연구소',     // ← 회사명

};

// ════════════════════════════════════════════════════════════════
// 🔧 아래는 자동 적용 코드입니다 — 수정하지 마세요!
// ════════════════════════════════════════════════════════════════
(function applyBrand() {
  // DOM 준비 후 적용
  function apply() {

    // ── 1. 접속 비밀번호 적용
    if (typeof PASSWORD !== 'undefined') {
      // 전역 PASSWORD 변수 덮어쓰기
      window.PASSWORD = BRAND.password;
    }

    // ── 2. 팝업 만든이
    const pwSub = document.querySelector('.pw-lock-sub');
    if (pwSub) pwSub.textContent = `만든이: ${BRAND.makerOrg} ${BRAND.makerName}`;

    // ── 3. 팝업 연락처
    const pwContact = document.querySelector('.pw-lock-contact');
    if (pwContact) pwContact.innerHTML =
      `<i class="fa-solid fa-phone"></i> 비상연락망: ${BRAND.makerPhone}`;

    // ── 4. 헤더 만든이
    const logoAuthor = document.querySelector('.logo-author');
    if (logoAuthor) logoAuthor.textContent = `${BRAND.makerOrg} ${BRAND.makerName}`;

    // ── 5. 헤더 Champion 배지
    const champEl = document.querySelector('.logo-champion');
    if (champEl) {
      if (BRAND.badgeChampion) {
        champEl.textContent = BRAND.badgeChampion;
        champEl.style.display = '';
      } else {
        champEl.style.display = 'none';
      }
    }

    // ── 6. 헤더 MDRT 배지
    const mdrtEl = document.querySelector('.logo-mdrt');
    if (mdrtEl) {
      if (BRAND.badgeMDRT) {
        mdrtEl.textContent = BRAND.badgeMDRT;
        mdrtEl.style.display = '';
      } else {
        mdrtEl.style.display = 'none';
      }
    }

    // ── 7. 카카오 선물하기 URL (팝업 + 헤더 2곳)
    document.querySelectorAll('.kakao-gift-btn').forEach(el => {
      el.href = BRAND.kakaoGiftUrl;
    });

    // ── 8. 카카오톡 1:1 상담 플로팅 버튼
    const kakaoFloat = document.getElementById('kakaoFloatLink');
    if (kakaoFloat) kakaoFloat.href = BRAND.kakaoTalkUrl;

    // ── 9. 브라우저 탭 타이틀
    document.title = `${BRAND.appTitle} | ${BRAND.appSubTitle}`;

    // ── 10. 비밀번호 전역 변수 강제 갱신 (타이밍 이슈 방지)
    window.PASSWORD = BRAND.password;
  }

  // DOMContentLoaded 이후 실행 보장
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
