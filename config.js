/* ============================================================
   슈퍼리치키드 하계 MT — 설정 & 초기 데이터
   이 파일만 고치면 명단·일정·공지·준비물 등을 바꿀 수 있어요.
   (코드는 건드릴 필요 없습니다)
   ============================================================ */
window.SRK_CONFIG = {

  /* ── 1) Firebase (실시간 동기화) ────────────────────────────
     비워두면 "데모 모드"(이 브라우저에만 저장)로 동작합니다.
     README의 'Firebase 연결' 절차대로 아래 5개 값을 채우면
     20명이 같은 링크로 접속해 실시간으로 함께 쓰는 모드가 켜집니다. */
  firebase: {
    apiKey: "AIzaSyDBKcVMjKluqmeahRcZJcxrEfY_BmrsjfA",
    authDomain: "srk-mt.firebaseapp.com",
    databaseURL: "https://srk-mt-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "srk-mt",
    appId: "1:1080501646167:web:88abf17460342d6e260412"
  },

  /* ── 2) 여행 정보 ─────────────────────────────────────────── */
  trip: {
    title:    "슈퍼리치키드 하계 MT",
    subtitle: "슈리키 하계휴양 🏕️",
    startDate: "2026-06-27",   // YYYY-MM-DD
    endDate:   "2026-06-28",
    location: "일영랜드",
    address:  "경기 양주시 장흥면 일영로502번길 222-68",
    lodging:  "에어비앤비 · 최대 16인 (참석 17명)",
    note:     "+1명만큼 더 아늑하게 ❤️",
    poolFee:  17000,           // 수영장 입장권(현장 개별 결제) 안내용
    airbnbUrl: "https://www.airbnb.co.kr/rooms/13856178"
  },

  /* ── 3) 크루 명단 (로그인 없이 이름만 선택해서 입장) ────────── */
  roster: [
    { id: "m01", name: "김찬우", role: "방장" },
    { id: "m02", name: "최수원" },
    { id: "m03", name: "천재준" },
    { id: "m04", name: "정윤철", role: "디자인" },
    { id: "m05", name: "장기범" },
    { id: "m06", name: "이은진" },
    { id: "m07", name: "이은산" },
    { id: "m08", name: "이윤철" },
    { id: "m09", name: "이시윤" },
    { id: "m10", name: "으네" },
    { id: "m11", name: "세운" },
    { id: "m12", name: "서다정" },
    { id: "m13", name: "백성흠" },
    { id: "m14", name: "박설" },
    { id: "m15", name: "김태순" },
    { id: "m16", name: "김종민" },
    { id: "m17", name: "강민관", role: "운영" }
  ],

  /* ── 4) 초기 데이터 (DB가 비어 있을 때 딱 1번만 심어집니다) ───
     이후에는 사이트 안에서 직접 추가/수정/삭제하면 됩니다. */
  seed: {

    /* 공지 (pinned: 상단 고정) */
    notices: [
      { by: "m01", pinned: true,
        text: "🏠 숙소는 에어비앤비(최대 16인)예요. 총 17명이라 +1명만큼 아늑할 수 있으니 양해 부탁드려요!" },
      { by: "m01",
        text: "🏖️ 수영장 평상 3개 예약 완료 (1평상 6인). 입장권은 현장에서 인당 17,000원 별도 구매입니다!" },
      { by: "m01",
        text: "🎁 선물 증정식: 합계 1만원 내외로 '진짜 선물' + '쓸데없는 선물' 각 1개씩! 내용물 안 보이게 포장해오기." },
      { by: "m01",
        text: "🍚 집결 식당 정보 업데이트 완료 — 정갈한 한식집이에요." },
      { by: "m17",
        text: "🚩 현수막 주문 완료했습니다!" }
    ],

    /* 일정 (day: YYYY-MM-DD, time: HH:MM) */
    schedule: [
      { day: "2026-06-27", time: "11:00", title: "일영랜드 근처 식당 집결" },
      { day: "2026-06-27", time: "12:00", title: "편의점에서 간식·음료 구매 후 수영장 입장" },
      { day: "2026-06-27", time: "16:00", title: "수영 종료" },
      { day: "2026-06-27", time: "17:30", title: "마트 장보기 & 숙소 체크인" },
      { day: "2026-06-27", time: "20:30", title: "저녁식사 마무리 후 본격적으로 놀기 🎉" },
      { day: "2026-06-28", time: "11:00", title: "체크아웃" },
      { day: "2026-06-28", time: "12:30", title: "아점 & 커피 타임 ☕" },
      { day: "2026-06-28", time: "13:30", title: "해산" }
    ],

    /* 준비물 — type: 'shared'(공용, 담당자가 챙김) / 'personal'(전원 각자) */
    packing: [
      { label: "블루투스 마이크 / 스피커", type: "shared", assignee: "m17" },
      { label: "사회인 체육대회 게임 물품", type: "shared", assignee: "m03" },
      { label: "버물리 · 에프킬라 (벌레 대비)", type: "shared" },
      { label: "현수막", type: "shared", assignee: "m17", done: true },
      { label: "바베큐 소세지 (브라이 리퍼블릭)", type: "shared", assignee: "m13" },
      { label: "게임 · 놀이 준비", type: "shared", assignee: "m09" },
      { label: "🎁 진짜 선물 1개 (1만원 내외)", type: "personal" },
      { label: "🎁 쓸데없는 선물 1개", type: "personal" },
      { label: "수영복 · 수건", type: "personal" },
      { label: "세면도구 · 개인약", type: "personal" }
    ],

    /* 의사결정 / 투표 — type: 'single'(하나만) / 'multi'(여러 개) */
    polls: [
      { title: "🚗 차량 편성 — 운전 가능하신 분?",
        desc: "본인 차로 운전 가능하면 '운전 가능'을, 탑승만 하면 '탑승'을 골라주세요. 최소 4대 필요! 지역별 배차는 댓글로 맞춰봐요.",
        type: "single", status: "open", createdBy: "m07",
        options: ["운전 가능 🚗 (차 있음)", "탑승할게요 🙋"] },
      { title: "✅ 최종 참석 확인",
        desc: "예약 최종 확인 중이에요. 참석 여부가 바뀐 분은 오늘 중으로 알려주세요!",
        type: "single", status: "open", createdBy: "m01",
        options: ["참석합니다 🙆", "아쉽지만 불참 🙏"] }
    ],

    /* 정산 — splitType: 'equal'(1/N) / 'custom'. participantsAll:true = 전원 분배 */
    expenses: [
      { title: "수영장 평상 3개", amount: 90000, payer: "m01",
        splitType: "equal", participantsAll: true,
        category: "액티비티", note: "1평상 6인 × 3개" }
    ]
  }
};
