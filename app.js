/* ============================================================
   슈퍼리치키드 하계 MT — 앱 로직
   - 데이터: Firebase 실시간 DB (설정 없으면 데모 모드 = localStorage)
   - 화면: 홈 / 투표 / 정산 / 준비(일정·공지·준비물)
   ============================================================ */
(function () {
  "use strict";
  var CFG = window.SRK_CONFIG || {};
  var CATEGORIES = ["액티비티", "식비", "마트/장보기", "숙소", "교통", "기타"];

  /* ---------- 상태 ---------- */
  var DB = {};                 // DB 전체 미러
  var me = localStorage.getItem("srk_me") || null;
  var state = { tab: "home", pollId: null, prep: "schedule" };
  var booted = false;

  /* ============================================================
     유틸
     ============================================================ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function won(n) { return (Math.round(Number(n) || 0)).toLocaleString("ko-KR") + "원"; }
  function clampStr(s, n) { s = String(s == null ? "" : s).trim(); return s.length > n ? s.slice(0, n) : s; }
  function obj(o) { return o && typeof o === "object" ? o : {}; }
  function entries(o) { return Object.keys(obj(o)).map(function (k) { return [k, o[k]]; }); }
  function bySort(arr, fn) { return arr.slice().sort(function (a, b) { return fn(a) - fn(b); }); }

  var _kc = 0;
  function key() { return "k" + Date.now().toString(36) + (_kc++).toString(36) + Math.random().toString(36).slice(2, 6); }

  function memberName(id) {
    var m = obj(DB.members)[id];
    return m && m.name ? m.name : (id || "?");
  }
  function memberRole(id) {
    var m = obj(DB.members)[id];
    return m && m.role ? m.role : "";
  }
  function initials(name) {
    name = String(name || "").trim();
    if (!name) return "?";
    // 한글 이름이면 성 제외한 이름 부분(끝 2자), 그 외엔 앞 2자
    if (name.length >= 3) return name.slice(-2);
    return name.slice(0, 2);
  }
  var AV_COLORS = ["#FF6B35", "#12B5A5", "#5B8DEF", "#E8489E", "#7C5CFC",
    "#F7A325", "#22A06B", "#EF476F", "#118AB2", "#8338EC", "#F4791F", "#06A77D"];
  function avColor(id) {
    var s = String(id || ""); var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return AV_COLORS[h % AV_COLORS.length];
  }
  function avatar(id, size) {
    var nm = memberName(id);
    var st = size ? ("width:" + size + "px;height:" + size + "px;font-size:" + Math.round(size * 0.4) + "px;") : "";
    return '<span class="av" style="' + st + 'background:' + avColor(id) + '">' + esc(initials(nm)) + "</span>";
  }
  function chip(id) {
    return '<span class="mchip">' + avatar(id, 22) + '<span>' + esc(memberName(id)) + "</span></span>";
  }

  function todayKST() {
    // 사용자의 로컬 날짜 기준 자정
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }
  function parseDate(s) {
    var p = String(s || "").split("-");
    return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
  }
  function dday() {
    var t = (CFG.trip && CFG.trip.startDate) ? CFG.trip.startDate : null;
    if (!t) return null;
    var diff = Math.round((parseDate(t) - todayKST()) / 86400000);
    return diff;
  }
  function ddayLabel() {
    var d = dday(); if (d == null) return "";
    if (d > 0) return "D-" + d;
    if (d === 0) return "D-DAY";
    return "D+" + (-d);
  }
  function dateKo(s) {
    if (!s) return "미정";
    var d = parseDate(s);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "미정";
    var wk = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
    return (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + wk + ")";
  }
  function timeago(ts) {
    if (!ts) return "";
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "방금 전";
    if (s < 3600) return Math.floor(s / 60) + "분 전";
    if (s < 86400) return Math.floor(s / 3600) + "시간 전";
    if (s < 86400 * 7) return Math.floor(s / 86400) + "일 전";
    var d = new Date(ts);
    return (d.getMonth() + 1) + "/" + d.getDate();
  }

  /* ============================================================
     스토어 (Firebase | 데모/localStorage) — 공통 인터페이스
     set / update / push / remove / onRoot
     ============================================================ */
  var Store = (function () {
    var fb = CFG.firebase || {};
    var useCloud = !!(fb.apiKey && fb.databaseURL && window.firebase);
    if (useCloud) {
      try {
        firebase.initializeApp({
          apiKey: fb.apiKey, authDomain: fb.authDomain,
          databaseURL: fb.databaseURL, projectId: fb.projectId, appId: fb.appId
        });
      } catch (e) { /* 이미 초기화됨 */ }
    }

    if (useCloud) {
      var db = firebase.database();
      return {
        mode: "cloud",
        onRoot: function (cb) { db.ref("/").on("value", function (s) { cb(s.val() || {}); }); },
        set: function (p, v) { return db.ref(p).set(v); },
        update: function (p, v) { return db.ref(p).update(v); },
        push: function (p, v) { var r = db.ref(p).push(); r.set(v); return r.key; },
        remove: function (p) { return db.ref(p).remove(); },
        // 시드는 트랜잭션으로 — 여러 명이 빈 DB에 동시 첫 접속해도 한 번만 심긴다(덮어쓰기 방지)
        seedRoot: function (builder) {
          db.ref("/").transaction(function (cur) {
            if (cur && cur.members && Object.keys(cur.members).length) return; // 이미 시드됨 → abort
            return builder();
          });
        }
      };
    }

    /* ---- 데모 백엔드 ---- */
    var LKEY = "srk_mt_db";
    var subs = [];
    var bc = null;
    try { bc = new BroadcastChannel("srk_mt"); } catch (e) { bc = null; }
    function read() { try { return JSON.parse(localStorage.getItem(LKEY) || "{}"); } catch (e) { return {}; } }
    function writeAll(o, silent) {
      localStorage.setItem(LKEY, JSON.stringify(o));
      if (!silent && bc) try { bc.postMessage(Date.now()); } catch (e) {}
      notify();
    }
    function notify() { var d = read(); subs.forEach(function (cb) { cb(d); }); }
    function navSet(o, path, val) {
      var ks = path.replace(/^\/|\/$/g, "").split("/");
      var cur = o;
      for (var i = 0; i < ks.length - 1; i++) {
        if (!cur[ks[i]] || typeof cur[ks[i]] !== "object") cur[ks[i]] = {};
        cur = cur[ks[i]];
      }
      var last = ks[ks.length - 1];
      if (val === null) delete cur[last]; else cur[last] = val;
    }
    if (bc) bc.onmessage = function () { notify(); };
    window.addEventListener("storage", function (e) { if (e.key === LKEY) notify(); });

    return {
      mode: "demo",
      onRoot: function (cb) { subs.push(cb); cb(read()); },
      set: function (p, v) { var o = read(); if (p === "/" || p === "") { writeAll(v); } else { navSet(o, p, v); writeAll(o); } },
      update: function (p, v) { var o = read(); var ks = p.replace(/^\/|\/$/g, "").split("/"); var cur = o; for (var i = 0; i < ks.length; i++) { if (!cur[ks[i]] || typeof cur[ks[i]] !== "object") cur[ks[i]] = {}; cur = cur[ks[i]]; } Object.keys(obj(v)).forEach(function (k) { cur[k] = v[k]; }); writeAll(o); },
      push: function (p, v) { var o = read(); var k = key(); navSet(o, p + "/" + k, v); writeAll(o); return k; },
      remove: function (p) { var o = read(); navSet(o, p, null); writeAll(o); },
      seedRoot: function (builder) { var o = read(); if (o && o.members && Object.keys(o.members).length) return; writeAll(builder()); }
    };
  })();

  /* ============================================================
     초기 데이터 심기 (DB가 비어 있을 때 1회)
     ============================================================ */
  function buildSeed() {
    var s = CFG.seed || {}, root = { trip: Object.assign({}, CFG.trip), members: {}, notices: {}, schedule: {}, packing: {}, polls: {}, expenses: {} };
    (CFG.roster || []).forEach(function (m) { root.members[m.id] = { name: m.name, role: m.role || null }; });
    var t = Date.now();
    (s.notices || []).forEach(function (n, i) { root.notices[key()] = { text: n.text, by: n.by || null, pinned: !!n.pinned, ts: t + i }; });
    (s.schedule || []).forEach(function (x, i) { root.schedule[key()] = { day: x.day, time: x.time, title: x.title, ts: t + i }; });
    (s.packing || []).forEach(function (p, i) { root.packing[key()] = { label: p.label, type: p.type || "shared", assignee: p.assignee || null, done: !!p.done, ready: {}, ts: t + i }; });
    (s.polls || []).forEach(function (p, i) {
      var opts = {}; (p.options || []).forEach(function (o) { opts[key()] = { label: o }; });
      root.polls[key()] = { title: p.title, desc: p.desc || "", type: p.type || "single", status: p.status || "open", createdBy: p.createdBy || null, allowAddOptions: !!p.allowAddOptions, options: opts, votes: {}, comments: {}, ts: t + i };
    });
    (s.expenses || []).forEach(function (e, i) {
      var ex = { title: e.title, amount: e.amount, payer: e.payer, splitType: e.splitType || "equal", category: e.category || "", note: e.note || "", ts: t + i };
      if (e.participantsAll) ex.participantsAll = true; else if (e.participants) ex.participants = e.participants;
      root.expenses[key()] = ex;
    });
    return root;
  }
  function seedIfEmpty(root) {
    if (root && root.members && Object.keys(root.members).length) return false;
    Store.seedRoot(buildSeed);
    return true;
  }

  /* ============================================================
     정산 엔진
     ============================================================ */
  function splitEqual(amount, n) {
    amount = Math.round(Number(amount) || 0);
    if (n <= 0) return [];
    var base = Math.floor(amount / n), rem = amount - base * n, out = [];
    for (var i = 0; i < n; i++) out.push(base + (i < rem ? 1 : 0));
    return out;
  }
  function expandShares(e) {
    var members = obj(DB.members), out = {};
    var ids;
    if (e.participantsAll) ids = Object.keys(members);
    else if (e.participants) ids = Object.keys(e.participants);
    else ids = Object.keys(members);
    ids = ids.filter(function (id) { return members[id]; });
    if (e.splitType === "custom" && e.participants) {
      ids.forEach(function (id) { out[id] = Math.round(Number(e.participants[id]) || 0); });
      return out;
    }
    var shares = splitEqual(e.amount, ids.length);
    ids.forEach(function (id, i) { out[id] = shares[i] || 0; });
    return out;
  }
  function computeBalances() {
    var bal = {};
    Object.keys(obj(DB.members)).forEach(function (id) { bal[id] = 0; });
    entries(DB.expenses).forEach(function (kv) {
      var e = kv[1]; if (!e || !(Number(e.amount) > 0) || !e.payer) return;
      if (bal[e.payer] == null) bal[e.payer] = 0;
      bal[e.payer] += Math.round(Number(e.amount) || 0);
      var shares = expandShares(e);
      Object.keys(shares).forEach(function (id) { if (bal[id] == null) bal[id] = 0; bal[id] -= shares[id]; });
    });
    return bal;
  }
  function minimalTransfers(bal) {
    var cred = [], deb = [];
    Object.keys(bal).forEach(function (id) {
      var v = Math.round(bal[id]);
      if (v > 0) cred.push({ id: id, amt: v });
      else if (v < 0) deb.push({ id: id, amt: -v });
    });
    cred.sort(function (a, b) { return b.amt - a.amt; });
    deb.sort(function (a, b) { return b.amt - a.amt; });
    var tr = [], i = 0, j = 0, guard = 0;
    while (i < deb.length && j < cred.length && guard++ < 100000) {
      var pay = Math.min(deb[i].amt, cred[j].amt);
      if (pay > 0) tr.push({ from: deb[i].id, to: cred[j].id, amount: pay });
      deb[i].amt -= pay; cred[j].amt -= pay;
      if (deb[i].amt === 0) i++;
      if (cred[j].amt === 0) j++;
    }
    return tr;
  }
  function myPaid(id) { var t = 0; entries(DB.expenses).forEach(function (kv) { if (kv[1] && kv[1].payer === id) t += Math.round(Number(kv[1].amount) || 0); }); return t; }
  function myShare(id) { var t = 0; entries(DB.expenses).forEach(function (kv) { var sh = expandShares(kv[1] || {}); if (sh[id]) t += sh[id]; }); return t; }
  function totalSpent() { var t = 0; entries(DB.expenses).forEach(function (kv) { t += Math.round(Number((kv[1] || {}).amount) || 0); }); return t; }

  /* ============================================================
     렌더
     ============================================================ */
  function render() {
    if (!me) { renderGate(); return; }
    $("#gate").classList.add("hidden");
    renderHeader();
    var main = $("#app-main");
    if (state.tab === "home") main.innerHTML = viewHome();
    else if (state.tab === "vote") main.innerHTML = state.pollId ? viewPollDetail(state.pollId) : viewVote();
    else if (state.tab === "settle") main.innerHTML = viewSettle();
    else if (state.tab === "prep") main.innerHTML = viewPrep();
    renderNav();
    main.scrollTop = 0;
  }
  function scheduleRender() { if (booted) render(); }

  function renderHeader() {
    var h = $("#app-header");
    var t = CFG.trip || {};
    h.innerHTML =
      '<div class="hd-left"><div class="hd-title">' + esc(t.title || "MT") + "</div>" +
      '<div class="hd-sub">' + (Store.mode === "demo" ? '<span class="badge-demo">데모</span>' : '<span class="badge-live">LIVE</span>') +
      " " + esc(t.subtitle || "") + "</div></div>" +
      '<button class="me-chip" data-action="switch-me">' + avatar(me, 30) + "<span>" + esc(memberName(me)) + "</span></button>";
  }
  function renderNav() {
    var tabs = [["home", "🏠", "홈"], ["vote", "🗳️", "투표"], ["settle", "💸", "정산"], ["prep", "🎒", "준비"]];
    $("#app-nav").innerHTML = tabs.map(function (t) {
      var on = state.tab === t[0] ? " on" : "";
      return '<button class="navbtn' + on + '" data-action="tab" data-tab="' + t[0] + '"><span class="nav-ic">' + t[1] + "</span><span>" + t[2] + "</span></button>";
    }).join("");
  }

  /* ---------- 이름 선택 게이트 ---------- */
  function renderGate() {
    var g = $("#gate");
    g.classList.remove("hidden");
    var roster = (CFG.roster || []);
    g.innerHTML =
      '<div class="gate-card">' +
      '<div class="gate-emoji">🧗</div>' +
      '<h1>' + esc((CFG.trip || {}).title || "MT") + "</h1>" +
      '<p class="gate-p">누구세요? 본인 이름을 선택하면 입장돼요.</p>' +
      '<input id="gate-search" class="gate-search" placeholder="이름 검색…" autocomplete="off">' +
      '<div class="gate-grid" id="gate-grid">' +
      roster.map(function (m) {
        return '<button class="gate-name" data-action="pick-me" data-id="' + m.id + '">' +
          avatar(m.id, 34) + "<span>" + esc(m.name) + (m.role ? ' <i class="role">' + esc(m.role) + "</i>" : "") + "</span></button>";
      }).join("") +
      "</div></div>";
    var search = $("#gate-search");
    if (search) search.oninput = function () {
      var q = this.value.trim().toLowerCase();
      Array.prototype.forEach.call($("#gate-grid").children, function (btn) {
        var nm = btn.textContent.toLowerCase();
        btn.style.display = !q || nm.indexOf(q) >= 0 ? "" : "none";
      });
    };
  }

  /* ---------- 홈 ---------- */
  function viewHome() {
    var t = CFG.trip || {};
    var openPolls = entries(DB.polls).filter(function (kv) { return (kv[1] || {}).status !== "closed"; });
    var packArr = entries(DB.packing);
    var packDone = packArr.filter(function (kv) { var p = kv[1] || {}; return p.type === "personal" ? readyCount(p) >= memberCount() : p.done; }).length;
    var bal = computeBalances();
    var myNet = Math.round(bal[me] || 0);
    var mapUrl = "https://map.naver.com/v5/search/" + encodeURIComponent(t.address || t.location || "");

    var h = "";
    if (Store.mode === "demo") {
      h += '<div class="demo-note">📍 <b>데모 모드</b> — 지금은 이 기기에만 저장돼요. 20명 실시간 공유는 <b>Firebase 연결</b> 후 켜집니다. (README 참고)</div>';
    }
    // 히어로
    h += '<div class="hero">' +
      '<div class="hero-dday">' + ddayLabel() + "</div>" +
      '<div class="hero-title">' + esc(t.title || "") + "</div>" +
      '<div class="hero-sub">' + esc(t.subtitle || "") + "</div>" +
      '<div class="hero-meta">' +
      '<div>📅 ' + dateKo(t.startDate) + " → " + dateKo(t.endDate) + "</div>" +
      '<div>📍 <a href="' + mapUrl + '" target="_blank" rel="noopener">' + esc(t.location || "") + "</a> · " + esc(t.address || "") + "</div>" +
      '<div>🏠 ' + esc(t.lodging || "") + (t.airbnbUrl ? ' · <a href="' + esc(t.airbnbUrl) + '" target="_blank" rel="noopener">숙소 보기</a>' : "") + "</div>" +
      (t.note ? '<div class="hero-note">' + esc(t.note) + "</div>" : "") +
      "</div></div>";

    // 빠른 통계
    h += '<div class="stat-row">' +
      '<button class="stat" data-action="tab" data-tab="vote"><div class="stat-n">' + openPolls.length + '</div><div class="stat-l">진행 중 투표</div></button>' +
      '<button class="stat" data-action="tab" data-tab="settle"><div class="stat-n">' + (totalSpent() / 10000).toFixed(totalSpent() % 10000 ? 1 : 0) + '<i>만원</i></div><div class="stat-l">총 지출</div></button>' +
      '<button class="stat" data-action="tab" data-tab="prep"><div class="stat-n">' + packDone + "/" + packArr.length + '</div><div class="stat-l">준비물</div></button>' +
      "</div>";

    // 내 정산 요약
    h += '<div class="card my-settle ' + (myNet > 0 ? "pos" : myNet < 0 ? "neg" : "") + '" data-action="tab" data-tab="settle">' +
      '<div class="ms-row"><span>' + avatar(me, 26) + " <b>" + esc(memberName(me)) + "</b>님 정산</span>" +
      "<span class='ms-amt'>" + (myNet > 0 ? "받을 돈 " + won(myNet) : myNet < 0 ? "보낼 돈 " + won(-myNet) : "정산 완료 ✓") + "</span></div>" +
      '<div class="ms-sub">낸 돈 ' + won(myPaid(me)) + " · 내 몫 " + won(myShare(me)) + "</div></div>";

    // 진행 중 투표 (상위 2개, 빠른 투표)
    if (openPolls.length) {
      h += '<h2 class="sec">🗳️ 진행 중 투표</h2>';
      bySort(openPolls, function (kv) { return -(kv[1].ts || 0); }).slice(0, 2).forEach(function (kv) {
        h += pollMiniCard(kv[0], kv[1]);
      });
    }

    // 최근 공지
    var notices = bySort(entries(DB.notices), function (kv) { return -((kv[1].pinned ? 1e15 : 0) + (kv[1].ts || 0)); });
    if (notices.length) {
      h += '<h2 class="sec">📢 공지</h2>';
      notices.slice(0, 3).forEach(function (kv) {
        var n = kv[1];
        h += '<div class="card notice' + (n.pinned ? " pin" : "") + '">' + (n.pinned ? '<span class="pin-tag">📌 고정</span>' : "") +
          '<div class="notice-text">' + esc(n.text) + "</div>" +
          '<div class="notice-by">' + (n.by ? chip(n.by) : "") + '<span class="ago">' + timeago(n.ts) + "</span></div></div>";
      });
    }
    return h;
  }
  function memberCount() { return Object.keys(obj(DB.members)).length || 1; }
  // 준비완료 인원 = ready에 있는 id 중 '현재 명단'에 있는 사람만 (옛 멤버 잔여 id 제외)
  function readyCount(p) { var mem = obj(DB.members); return Object.keys(obj(p.ready)).filter(function (id) { return mem[id]; }).length; }

  function pollMiniCard(id, p) {
    var opts = entries(p.options);
    var voters = voterCount(p);
    var myVote = obj(p.votes)[me] || {};
    var h = '<div class="card poll-mini" data-action="open-poll" data-id="' + id + '">' +
      '<div class="pm-title">' + esc(p.title) + "</div>";
    opts.forEach(function (o) {
      var oid = o[0], cnt = countVotes(p, oid), pct = voters ? Math.round(cnt / voters * 100) : 0;
      var mine = myVote[oid] ? " mine" : "";
      h += '<button class="opt' + mine + '" data-action="vote" data-poll="' + id + '" data-opt="' + oid + '">' +
        '<span class="opt-bar" style="width:' + pct + '%"></span>' +
        '<span class="opt-l">' + esc(o[1].label) + (myVote[oid] ? " ✓" : "") + "</span>" +
        '<span class="opt-c">' + cnt + "</span></button>";
    });
    h += '<div class="pm-foot">' + voters + "/" + memberCount() + "명 참여 · 눌러서 자세히</div></div>";
    return h;
  }
  function countVotes(p, oid) {
    var c = 0; entries(p.votes).forEach(function (kv) { if (kv[1] && kv[1][oid]) c++; }); return c;
  }
  // 실제 투표자 수 = 선택지를 1개 이상 고른 사람 (멀티 투표에서 전부 해제한 빈 객체 제외 → 데모/클라우드 일관)
  function voterCount(p) {
    return Object.keys(obj(p.votes)).filter(function (u) { return Object.keys(obj(p.votes[u])).length; }).length;
  }

  /* ---------- 투표 목록 ---------- */
  function viewVote() {
    var polls = bySort(entries(DB.polls), function (kv) { return ((kv[1].status === "closed") ? 1e15 : 0) - (kv[1].ts || 0); });
    var h = '<div class="page-head"><h1>🗳️ 의사결정</h1><button class="btn-pri" data-action="new-poll">+ 새 투표</button></div>';
    if (!polls.length) h += '<div class="empty">아직 투표가 없어요.<br>오른쪽 위 <b>+ 새 투표</b>로 첫 결정을 올려보세요!</div>';
    polls.forEach(function (kv) { h += pollMiniCard(kv[0], kv[1]); });
    return h;
  }

  /* ---------- 투표 상세 ---------- */
  function viewPollDetail(id) {
    var p = obj(DB.polls)[id];
    if (!p) { state.pollId = null; return viewVote(); }
    var opts = entries(p.options);
    var voters = voterCount(p);
    var myVote = obj(p.votes)[me] || {};
    var closed = p.status === "closed";
    var h = '<div class="page-head"><button class="back" data-action="back-vote">‹ 투표</button>' +
      (p.createdBy === me || true ? '<button class="link-danger" data-action="del-poll" data-id="' + id + '">삭제</button>' : "") + "</div>";

    h += '<div class="card poll-detail">' +
      '<div class="pd-type">' + (p.type === "multi" ? "여러 개 선택 가능" : "하나만 선택") + (closed ? ' · <span class="closed-tag">마감됨</span>' : "") + "</div>" +
      '<h1 class="pd-title">' + esc(p.title) + "</h1>" +
      (p.desc ? '<p class="pd-desc">' + esc(p.desc) + "</p>" : "");

    opts.forEach(function (o) {
      var oid = o[0], cnt = countVotes(p, oid), pct = voters ? Math.round(cnt / voters * 100) : 0;
      var mine = myVote[oid] ? " mine" : "";
      var who = entries(p.votes).filter(function (kv) { return kv[1] && kv[1][oid]; }).map(function (kv) { return kv[0]; });
      h += '<div class="opt-row">' +
        '<button class="opt big' + mine + (closed ? " dis" : "") + '" ' + (closed ? "disabled" : ('data-action="vote" data-poll="' + id + '" data-opt="' + oid + '"')) + ">" +
        '<span class="opt-bar" style="width:' + pct + '%"></span>' +
        '<span class="opt-l">' + (myVote[oid] ? "✓ " : "") + esc(o[1].label) + "</span>" +
        '<span class="opt-c">' + cnt + " · " + pct + "%</span></button>" +
        (who.length ? '<div class="opt-who">' + who.map(function (w) { return avatar(w, 22); }).join("") + "</div>" : "") +
        "</div>";
    });

    if (p.allowAddOptions && !closed) {
      h += '<button class="add-opt" data-action="add-opt" data-id="' + id + '">+ 선택지 추가</button>';
    }
    h += '<div class="pd-foot"><span>' + voters + "/" + memberCount() + "명 참여</span>" +
      '<button class="link" data-action="toggle-poll" data-id="' + id + '">' + (closed ? "다시 열기" : "투표 마감") + "</button></div>";
    h += "</div>";

    // 댓글
    var comments = bySort(entries(p.comments), function (kv) { return kv[1].ts || 0; });
    h += '<h2 class="sec">💬 댓글 ' + comments.length + "</h2>";
    h += '<div class="comments">';
    if (!comments.length) h += '<div class="empty sm">첫 댓글을 남겨보세요 (예: 지역별 배차 정리)</div>';
    comments.forEach(function (kv) {
      var c = kv[1];
      h += '<div class="cmt">' + avatar(c.by, 28) +
        '<div class="cmt-body"><div class="cmt-head"><b>' + esc(memberName(c.by)) + "</b><span class='ago'>" + timeago(c.ts) + "</span>" +
        (c.by === me ? ' <button class="cmt-del" data-action="del-cmt" data-poll="' + id + '" data-cmt="' + kv[0] + '">×</button>' : "") +
        '</div><div class="cmt-text">' + esc(c.text) + "</div></div></div>";
    });
    h += "</div>";
    h += '<div class="cmt-input"><input id="cmt-' + id + '" placeholder="댓글 달기…" maxlength="500">' +
      '<button class="btn-pri" data-action="send-cmt" data-id="' + id + '">등록</button></div>';
    return h;
  }

  /* ---------- 정산 ---------- */
  function viewSettle() {
    var exps = bySort(entries(DB.expenses), function (kv) { return -(kv[1].ts || 0); });
    var bal = computeBalances();
    var transfers = minimalTransfers(bal);
    var total = totalSpent();
    var h = '<div class="page-head"><h1>💸 정산</h1><button class="btn-pri" data-action="new-expense">+ 지출 추가</button></div>';

    // 요약
    h += '<div class="settle-top">' +
      '<div class="st-box"><div class="st-n">' + won(total) + '</div><div class="st-l">총 지출</div></div>' +
      '<div class="st-box"><div class="st-n">' + transfers.length + '<i>건</i></div><div class="st-l">송금</div></div>' +
      "</div>";
    if ((CFG.trip || {}).poolFee) {
      h += '<div class="hint">ℹ️ 수영장 입장권 인당 ' + won(CFG.trip.poolFee) + '은 현장 개별 결제라 정산에 포함되지 않아요.</div>';
    }

    // 내 정산
    var myNet = Math.round(bal[me] || 0);
    h += '<div class="card my-settle big ' + (myNet > 0 ? "pos" : myNet < 0 ? "neg" : "") + '">' +
      '<div class="ms-row"><span>' + avatar(me, 28) + " <b>" + esc(memberName(me)) + "</b>님</span>" +
      "<span class='ms-amt'>" + (myNet > 0 ? "+" + won(myNet) : myNet < 0 ? "−" + won(-myNet) : "정산 완료 ✓") + "</span></div>" +
      '<div class="ms-sub">낸 돈 ' + won(myPaid(me)) + " · 내 몫 " + won(myShare(me)) + "</div>";
    var mine = transfers.filter(function (t) { return t.from === me || t.to === me; });
    if (mine.length) {
      h += '<div class="ms-actions">';
      mine.forEach(function (t) {
        if (t.from === me) h += '<div class="pay-line out">' + chip(t.to) + " 에게 <b>" + won(t.amount) + "</b> 보내기</div>";
        else h += '<div class="pay-line in">' + chip(t.from) + " 에게서 <b>" + won(t.amount) + "</b> 받기</div>";
      });
      h += "</div>";
    }
    h += "</div>";

    // 송금 정리 (전체)
    h += '<h2 class="sec">🔁 송금 정리 (최소 횟수)</h2>';
    if (!transfers.length) h += '<div class="empty sm">정산할 송금이 없어요.</div>';
    else {
      h += '<div class="card transfers">';
      transfers.forEach(function (t) {
        h += '<div class="tr-line">' + chip(t.from) + '<span class="tr-arrow">→</span>' + chip(t.to) + '<span class="tr-amt">' + won(t.amount) + "</span></div>";
      });
      h += "</div>";
    }

    // 멤버별 잔액
    h += '<h2 class="sec">👥 멤버별 잔액</h2><div class="card balances">';
    var balArr = bySort(Object.keys(bal), function (id) { return bal[id]; }); // 보낼 사람(음수) 먼저
    balArr.forEach(function (id) {
      var v = Math.round(bal[id]);
      h += '<div class="bal-line">' + chip(id) +
        '<span class="bal-v ' + (v > 0 ? "pos" : v < 0 ? "neg" : "zero") + '">' + (v > 0 ? "+" + won(v) : v < 0 ? "−" + won(-v) : "0원") + "</span></div>";
    });
    h += "</div>";

    // 지출 내역
    h += '<h2 class="sec">🧾 지출 내역 ' + exps.length + "</h2>";
    if (!exps.length) h += '<div class="empty sm">아직 지출이 없어요. <b>+ 지출 추가</b>를 눌러보세요.</div>';
    exps.forEach(function (kv) {
      var e = kv[1];
      var n = e.participantsAll ? memberCount() : (e.participants ? Object.keys(e.participants).length : memberCount());
      var per = e.splitType === "custom" ? "항목별" : won(Math.round((Number(e.amount) || 0) / (n || 1))) + " / 인";
      h += '<div class="card exp" data-action="edit-expense" data-id="' + kv[0] + '">' +
        '<div class="exp-top"><span class="exp-title">' + esc(e.title) + "</span><span class='exp-amt'>" + won(e.amount) + "</span></div>" +
        '<div class="exp-meta">' + (e.category ? '<span class="cat">' + esc(e.category) + "</span>" : "") +
        " 결제 " + chip(e.payer) + " · " + n + "명 · " + per + "</div>" +
        (e.note ? '<div class="exp-note">' + esc(e.note) + "</div>" : "") + "</div>";
    });
    return h;
  }

  /* ---------- 준비 (일정 / 공지 / 준비물) ---------- */
  function viewPrep() {
    var seg = [["schedule", "일정"], ["notice", "공지"], ["packing", "준비물"]];
    var h = '<div class="seg">' + seg.map(function (s) {
      return '<button class="seg-b' + (state.prep === s[0] ? " on" : "") + '" data-action="prep" data-prep="' + s[0] + '">' + s[1] + "</button>";
    }).join("") + "</div>";
    if (state.prep === "schedule") h += prepSchedule();
    else if (state.prep === "notice") h += prepNotice();
    else h += prepPacking();
    return h;
  }
  function prepSchedule() {
    var items = entries(DB.schedule).slice().sort(function (a, b) {
      var ka = (a[1].day || "") + (a[1].time || ""), kb = (b[1].day || "") + (b[1].time || "");
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
    var h = '<div class="page-head sm"><h2>📅 일정</h2><button class="btn-ghost" data-action="new-schedule">+ 추가</button></div>';
    if (!items.length) h += '<div class="empty sm">일정이 없어요.</div>';
    var curDay = null;
    items.forEach(function (kv) {
      var s = kv[1];
      if (s.day !== curDay) { curDay = s.day; h += '<div class="day-head">' + dateKo(s.day) + "</div>"; }
      h += '<div class="tl-item"><div class="tl-time">' + esc(s.time) + "</div>" +
        '<div class="tl-dot"></div><div class="tl-body"><div class="tl-title">' + esc(s.title) + "</div></div>" +
        '<button class="tl-del" data-action="del-schedule" data-id="' + kv[0] + '">×</button></div>';
    });
    return h;
  }
  function prepNotice() {
    var notices = bySort(entries(DB.notices), function (kv) { return -((kv[1].pinned ? 1e15 : 0) + (kv[1].ts || 0)); });
    var h = '<div class="page-head sm"><h2>📢 공지</h2><button class="btn-ghost" data-action="new-notice">+ 추가</button></div>';
    if (!notices.length) h += '<div class="empty sm">공지가 없어요.</div>';
    notices.forEach(function (kv) {
      var n = kv[1];
      h += '<div class="card notice' + (n.pinned ? " pin" : "") + '">' + (n.pinned ? '<span class="pin-tag">📌 고정</span>' : "") +
        '<div class="notice-text">' + esc(n.text) + "</div>" +
        '<div class="notice-by">' + (n.by ? chip(n.by) : "") + '<span class="ago">' + timeago(n.ts) + "</span>" +
        (n.by === me ? ' <button class="cmt-del" data-action="del-notice" data-id="' + kv[0] + '">×</button>' : "") + "</div></div>";
    });
    return h;
  }
  function prepPacking() {
    var shared = entries(DB.packing).filter(function (kv) { return (kv[1] || {}).type !== "personal"; });
    var personal = entries(DB.packing).filter(function (kv) { return (kv[1] || {}).type === "personal"; });
    shared = bySort(shared, function (kv) { return kv[1].ts || 0; });
    personal = bySort(personal, function (kv) { return kv[1].ts || 0; });
    var h = '<div class="page-head sm"><h2>🎒 준비물</h2><button class="btn-ghost" data-action="new-packing">+ 추가</button></div>';

    h += '<div class="pk-sub">공용 (담당자가 챙겨요)</div>';
    if (!shared.length) h += '<div class="empty sm">공용 준비물이 없어요.</div>';
    shared.forEach(function (kv) {
      var p = kv[1];
      h += '<div class="pk-item' + (p.done ? " done" : "") + '">' +
        '<button class="pk-check" data-action="toggle-pack" data-id="' + kv[0] + '">' + (p.done ? "✓" : "") + "</button>" +
        '<div class="pk-label">' + esc(p.label) + (p.assignee ? ' <span class="pk-who">' + chip(p.assignee) + "</span>" : ' <span class="pk-need">담당 미정</span>') + "</div>" +
        '<button class="tl-del" data-action="del-pack" data-id="' + kv[0] + '">×</button></div>';
    });

    h += '<div class="pk-sub">개인 (전원 각자 · 본인 이름 눌러 체크)</div>';
    if (!personal.length) h += '<div class="empty sm">개인 준비물이 없어요.</div>';
    personal.forEach(function (kv) {
      var p = kv[1], ready = obj(p.ready), iReady = !!ready[me], cnt = readyCount(p);
      h += '<div class="pk-item personal">' +
        '<button class="pk-check ' + (iReady ? "on" : "") + '" data-action="toggle-ready" data-id="' + kv[0] + '">' + (iReady ? "✓" : "") + "</button>" +
        '<div class="pk-label">' + esc(p.label) + '<span class="pk-prog">' + cnt + "/" + memberCount() + "명 준비완료</span></div>" +
        '<button class="tl-del" data-action="del-pack" data-id="' + kv[0] + '">×</button></div>';
    });
    return h;
  }

  /* ============================================================
     모달 & 폼
     ============================================================ */
  function openModal(html) {
    var r = $("#modal-root");
    r.innerHTML = '<div class="modal-back" data-action="close-modal"></div><div class="modal">' + html + "</div>";
    r.classList.add("open");
  }
  function closeModal() { var r = $("#modal-root"); r.classList.remove("open"); r.innerHTML = ""; }

  function memberOptions(sel) {
    return (CFG.roster || []).map(function (m) {
      return '<option value="' + m.id + '"' + (sel === m.id ? " selected" : "") + ">" + esc(m.name) + "</option>";
    }).join("");
  }

  function formNewPoll() {
    openModal(
      '<h2>새 투표</h2>' +
      '<label>질문</label><input id="f-title" placeholder="예: 27일 저녁 메뉴는?">' +
      '<label>설명 (선택)</label><textarea id="f-desc" rows="2" placeholder="부연 설명"></textarea>' +
      '<label>선택 방식</label><select id="f-type"><option value="single">하나만 선택</option><option value="multi">여러 개 선택</option></select>' +
      '<label>선택지</label><div id="f-opts">' + optInput("") + optInput("") + "</div>" +
      '<button class="btn-ghost sm" data-action="add-opt-field">+ 선택지 추가</button>' +
      '<label class="chk"><input type="checkbox" id="f-add"> 크루원이 선택지를 추가할 수 있게</label>' +
      '<div class="modal-foot"><button class="btn-line" data-action="close-modal">취소</button><button class="btn-pri" data-action="save-poll">만들기</button></div>'
    );
  }
  function optInput(v) { return '<input class="opt-field" placeholder="선택지" value="' + esc(v) + '">'; }

  function formNewExpense(editId) {
    var e = editId ? obj(DB.expenses)[editId] : null;
    var selPart = {};
    if (e && e.participants) Object.keys(e.participants).forEach(function (k) { selPart[k] = e.participants[k]; });
    var all = !e || e.participantsAll || !e.participants;
    var rosterChecks = (CFG.roster || []).map(function (m) {
      var on = all || selPart[m.id] != null;
      return '<label class="pchk"><input type="checkbox" class="f-part" value="' + m.id + '"' + (on ? " checked" : "") + ">" + avatar(m.id, 24) + "<span>" + esc(m.name) + "</span></label>";
    }).join("");
    openModal(
      "<h2>" + (editId ? "지출 수정" : "지출 추가") + "</h2>" +
      '<label>내용</label><input id="f-title" placeholder="예: 마트 장보기" value="' + (e ? esc(e.title) : "") + '">' +
      '<label>금액 (원)</label><input id="f-amt" type="number" inputmode="numeric" placeholder="0" value="' + (e ? e.amount : "") + '">' +
      '<div class="row2"><div><label>결제자</label><select id="f-payer">' + memberOptions(e ? e.payer : me) + "</select></div>" +
      '<div><label>분류</label><select id="f-cat">' + CATEGORIES.map(function (c) { return '<option' + (e && e.category === c ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select></div></div>" +
      '<label>나누는 방식</label><select id="f-split"><option value="equal"' + (e && e.splitType === "custom" ? "" : " selected") + ">1/N (똑같이)</option><option value=\"custom\"" + (e && e.splitType === "custom" ? " selected" : "") + ">항목별 직접 입력</option></select>" +
      '<label>참여자 <button class="mini" data-action="part-all">전체</button><button class="mini" data-action="part-none">해제</button></label>' +
      '<div class="part-grid" id="f-parts">' + rosterChecks + "</div>" +
      '<div id="f-custom" class="hidden"></div>' +
      '<div id="f-preview" class="preview"></div>' +
      '<div class="modal-foot">' + (editId ? '<button class="link-danger" data-action="del-expense" data-id="' + editId + '">삭제</button>' : "") +
      '<button class="btn-line" data-action="close-modal">취소</button><button class="btn-pri" data-action="save-expense" data-edit="' + (editId || "") + '">저장</button></div>'
    );
    bindExpenseForm(e);
  }
  function bindExpenseForm(e) {
    var split = $("#f-split"), amt = $("#f-amt");
    function checkedIds() { return Array.prototype.slice.call(document.querySelectorAll(".f-part:checked")).map(function (c) { return c.value; }); }
    function customRow(id, val) {
      return '<div class="custom-row">' + avatar(id, 22) + "<span>" + esc(memberName(id)) + "</span>" +
        '<input type="number" inputmode="numeric" class="f-cust" data-id="' + id + '" placeholder="0"' +
        (val != null && val !== "" ? ' value="' + val + '"' : "") + "></div>";
    }
    // 참여자/분배방식이 바뀔 때만 행을 다시 그린다. (타이핑 중에는 호출하지 않아 포커스·입력값 유지)
    function rebuildCustom() {
      var cont = $("#f-custom");
      if (split.value !== "custom") { cont.classList.add("hidden"); cont.innerHTML = ""; return; }
      cont.classList.remove("hidden");
      var typed = {}; // 이미 입력한 값 보존
      Array.prototype.forEach.call(document.querySelectorAll(".f-cust"), function (i) { typed[i.getAttribute("data-id")] = i.value; });
      cont.innerHTML = '<label>각자 금액</label>' + checkedIds().map(function (id) {
        var v = (typed[id] != null) ? typed[id]
          : (e && e.splitType === "custom" && e.participants && e.participants[id] != null) ? e.participants[id] : "";
        return customRow(id, v);
      }).join("");
    }
    function updatePreview() {
      var pv = $("#f-preview"), checks = checkedIds();
      if (split.value === "custom") {
        var sum = 0; Array.prototype.forEach.call(document.querySelectorAll(".f-cust"), function (i) { sum += Number(i.value) || 0; });
        var amtV = Number(amt.value) || 0;
        pv.innerHTML = "합계 " + won(sum) + " / 총액 " + won(amtV) + (sum !== amtV ? ' <b class="warn">차이 ' + won(amtV - sum) + "</b>" : " ✓");
      } else {
        var n = checks.length, per = n ? Math.floor((Number(amt.value) || 0) / n) : 0;
        pv.innerHTML = n ? (n + "명이 " + won(amt.value) + " → 인당 약 " + won(per)) : "참여자를 선택하세요";
      }
    }
    split.onchange = function () { rebuildCustom(); updatePreview(); };
    amt.oninput = updatePreview;
    $("#f-parts").addEventListener("change", function () { rebuildCustom(); updatePreview(); }); // 참여자 토글
    $("#f-custom").addEventListener("input", updatePreview);                                     // 금액 타이핑 → 미리보기만
    rebuildCustom(); updatePreview();
    window.__expRefresh = function () { rebuildCustom(); updatePreview(); };
  }

  function formNewNotice() {
    openModal('<h2>공지 추가</h2><label>내용</label><textarea id="f-text" rows="3" placeholder="공지 내용"></textarea>' +
      '<label class="chk"><input type="checkbox" id="f-pin"> 상단 고정</label>' +
      '<div class="modal-foot"><button class="btn-line" data-action="close-modal">취소</button><button class="btn-pri" data-action="save-notice">등록</button></div>');
  }
  function formNewSchedule() {
    openModal('<h2>일정 추가</h2><div class="row2"><div><label>날짜</label><input id="f-day" type="date" value="' + ((CFG.trip || {}).startDate || "") + '"></div>' +
      '<div><label>시간</label><input id="f-time" type="time"></div></div>' +
      '<label>내용</label><input id="f-title" placeholder="예: 바베큐 시작">' +
      '<div class="modal-foot"><button class="btn-line" data-action="close-modal">취소</button><button class="btn-pri" data-action="save-schedule">추가</button></div>');
  }
  function formNewPacking() {
    openModal('<h2>준비물 추가</h2><label>준비물</label><input id="f-label" placeholder="예: 아이스박스">' +
      '<label>종류</label><select id="f-type"><option value="shared">공용 (담당자가 챙김)</option><option value="personal">개인 (전원 각자)</option></select>' +
      '<label>담당자 (공용일 때, 선택)</label><select id="f-assignee"><option value="">미정</option>' + memberOptions("") + "</select>" +
      '<div class="modal-foot"><button class="btn-line" data-action="close-modal">취소</button><button class="btn-pri" data-action="save-packing">추가</button></div>');
  }

  /* ============================================================
     액션 (이벤트 위임)
     ============================================================ */
  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-action]");
    if (!t) return;
    var a = t.getAttribute("data-action");

    /* 게이트 */
    if (a === "pick-me") { me = t.getAttribute("data-id"); localStorage.setItem("srk_me", me); booted = true; render(); return; }
    if (a === "switch-me") { me = null; localStorage.removeItem("srk_me"); renderGate(); return; }

    /* 네비/탭 */
    if (a === "tab") { state.tab = t.getAttribute("data-tab"); state.pollId = null; render(); return; }
    if (a === "prep") { state.prep = t.getAttribute("data-prep"); render(); return; }
    if (a === "close-modal") { closeModal(); return; }

    /* 투표 */
    if (a === "open-poll") { state.tab = "vote"; state.pollId = t.getAttribute("data-id"); render(); return; }
    if (a === "back-vote") { state.pollId = null; render(); return; }
    if (a === "vote") { ev.stopPropagation(); doVote(t.getAttribute("data-poll"), t.getAttribute("data-opt")); return; }
    if (a === "new-poll") { formNewPoll(); return; }
    if (a === "add-opt-field") { $("#f-opts").insertAdjacentHTML("beforeend", optInput("")); return; }
    if (a === "save-poll") { savePoll(); return; }
    if (a === "del-poll") { if (confirm("이 투표를 삭제할까요?")) { Store.remove("polls/" + t.getAttribute("data-id")); state.pollId = null; } return; }
    if (a === "toggle-poll") { var pid = t.getAttribute("data-id"); var pp = obj(DB.polls)[pid]; if (!pp) return; Store.update("polls/" + pid, { status: pp.status === "closed" ? "open" : "closed" }); return; }
    if (a === "add-opt") { var pid2 = t.getAttribute("data-id"); var lbl = prompt("추가할 선택지"); if (lbl && lbl.trim()) Store.set("polls/" + pid2 + "/options/" + key(), { label: clampStr(lbl, 80) }); return; }
    if (a === "send-cmt") { sendComment(t.getAttribute("data-id")); return; }
    if (a === "del-cmt") { Store.remove("polls/" + t.getAttribute("data-poll") + "/comments/" + t.getAttribute("data-cmt")); return; }

    /* 정산 */
    if (a === "new-expense") { formNewExpense(null); return; }
    if (a === "edit-expense") { formNewExpense(t.getAttribute("data-id")); return; }
    if (a === "save-expense") { saveExpense(t.getAttribute("data-edit")); return; }
    if (a === "del-expense") { if (confirm("이 지출을 삭제할까요?")) { Store.remove("expenses/" + t.getAttribute("data-id")); closeModal(); } return; }
    if (a === "part-all") { ev.preventDefault(); document.querySelectorAll(".f-part").forEach(function (c) { c.checked = true; }); if (window.__expRefresh) window.__expRefresh(); return; }
    if (a === "part-none") { ev.preventDefault(); document.querySelectorAll(".f-part").forEach(function (c) { c.checked = false; }); if (window.__expRefresh) window.__expRefresh(); return; }

    /* 공지/일정/준비물 */
    if (a === "new-notice") { formNewNotice(); return; }
    if (a === "save-notice") { saveNotice(); return; }
    if (a === "del-notice") { if (confirm("공지를 삭제할까요?")) Store.remove("notices/" + t.getAttribute("data-id")); return; }
    if (a === "new-schedule") { formNewSchedule(); return; }
    if (a === "save-schedule") { saveSchedule(); return; }
    if (a === "del-schedule") { if (confirm("일정을 삭제할까요?")) Store.remove("schedule/" + t.getAttribute("data-id")); return; }
    if (a === "new-packing") { formNewPacking(); return; }
    if (a === "save-packing") { savePacking(); return; }
    if (a === "del-pack") { if (confirm("준비물을 삭제할까요?")) Store.remove("packing/" + t.getAttribute("data-id")); return; }
    if (a === "toggle-pack") { var id = t.getAttribute("data-id"); var pk = obj(DB.packing)[id]; if (!pk) return; Store.update("packing/" + id, { done: !pk.done }); return; }
    if (a === "toggle-ready") { var id2 = t.getAttribute("data-id"); var pk2 = obj(DB.packing)[id2]; if (!pk2) return; var rd = obj(pk2.ready); if (rd[me]) Store.remove("packing/" + id2 + "/ready/" + me); else Store.set("packing/" + id2 + "/ready/" + me, true); return; }
  });

  // 댓글 엔터 전송
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && ev.target.id && ev.target.id.indexOf("cmt-") === 0) {
      sendComment(ev.target.id.slice(4));
    }
  });

  function doVote(pid, oid) {
    var p = obj(DB.polls)[pid]; if (!p || p.status === "closed") return;
    var mv = obj(obj(p.votes)[me]);
    if (p.type === "multi") {
      if (mv[oid]) Store.remove("polls/" + pid + "/votes/" + me + "/" + oid);
      else Store.set("polls/" + pid + "/votes/" + me + "/" + oid, true);
    } else {
      if (mv[oid]) Store.remove("polls/" + pid + "/votes/" + me); // 같은 선택 다시 누르면 취소
      else Store.set("polls/" + pid + "/votes/" + me, (function () { var o = {}; o[oid] = true; return o; })());
    }
  }
  function savePoll() {
    var title = $("#f-title").value.trim(); if (!title) { alert("질문을 입력하세요"); return; }
    var opts = Array.prototype.slice.call(document.querySelectorAll(".opt-field")).map(function (i) { return i.value.trim(); }).filter(Boolean);
    if (opts.length < 2) { alert("선택지를 2개 이상 입력하세요"); return; }
    var optMap = {}; opts.forEach(function (o) { optMap[key()] = { label: clampStr(o, 80) }; });
    Store.push("polls", { title: clampStr(title, 100), desc: clampStr($("#f-desc").value, 1000), type: $("#f-type").value, status: "open", createdBy: me, allowAddOptions: $("#f-add").checked, options: optMap, votes: {}, comments: {}, ts: Date.now() });
    closeModal();
  }
  function sendComment(pid) {
    var inp = $("#cmt-" + pid); if (!inp) return; var v = inp.value.trim(); if (!v) return;
    Store.push("polls/" + pid + "/comments", { by: me, text: clampStr(v, 500), ts: Date.now() });
    inp.value = "";
  }
  function saveExpense(editId) {
    var title = $("#f-title").value.trim(), amt = Math.round(Number($("#f-amt").value) || 0);
    if (!title) { alert("내용을 입력하세요"); return; }
    if (amt <= 0) { alert("금액을 입력하세요"); return; }
    var split = $("#f-split").value;
    var checks = Array.prototype.slice.call(document.querySelectorAll(".f-part:checked")).map(function (c) { return c.value; });
    if (!checks.length) { alert("참여자를 1명 이상 선택하세요"); return; }
    var data = { title: clampStr(title, 100), amount: amt, payer: $("#f-payer").value, category: $("#f-cat").value, splitType: split, note: "", ts: (editId && obj(DB.expenses)[editId] ? obj(DB.expenses)[editId].ts : Date.now()) };
    if (split === "custom") {
      var parts = {}, sum = 0;
      document.querySelectorAll(".f-cust").forEach(function (i) { var v = Math.round(Number(i.value) || 0); parts[i.getAttribute("data-id")] = v; sum += v; });
      if (sum !== amt) { alert("각자 금액 합계(" + won(sum) + ")가 총액(" + won(amt) + ")과 같아야 정산이 맞아요.\n현재 차이: " + won(amt - sum)); return; }
      data.participants = parts;
    } else {
      if (checks.length === memberCount()) data.participantsAll = true;
      else { var pm = {}; checks.forEach(function (id) { pm[id] = true; }); data.participants = pm; }
    }
    if (editId) Store.set("expenses/" + editId, data); else Store.push("expenses", data);
    closeModal();
  }
  function saveNotice() {
    var v = $("#f-text").value.trim(); if (!v) return;
    Store.push("notices", { text: clampStr(v, 1000), by: me, pinned: $("#f-pin").checked, ts: Date.now() });
    closeModal();
  }
  function saveSchedule() {
    var day = $("#f-day").value, time = $("#f-time").value, title = $("#f-title").value.trim();
    if (!day || !time || !title) { alert("날짜·시간·내용을 모두 입력하세요"); return; }
    Store.push("schedule", { day: day, time: time, title: clampStr(title, 100), ts: Date.now() });
    closeModal();
  }
  function savePacking() {
    var label = $("#f-label").value.trim(); if (!label) return;
    Store.push("packing", { label: clampStr(label, 80), type: $("#f-type").value, assignee: $("#f-assignee").value || null, done: false, ready: {}, ts: Date.now() });
    closeModal();
  }

  /* ============================================================
     부팅
     ============================================================ */
  Store.onRoot(function (root) {
    DB = root || {};
    if (!booted) {
      booted = true;                 // 시드 쓰기의 재진입 onRoot가 booted=true를 보도록 먼저 세움
      if (seedIfEmpty(DB)) return;    // 데모: 재진입 콜백이 렌더 / 클라우드: 시드 완료 후 다음 onRoot가 렌더
    }
    // 명단(roster) 변경으로 저장된 본인 id가 사라졌으면 게이트로 되돌림
    if (me && DB.members && Object.keys(DB.members).length && !DB.members[me]) {
      me = null; localStorage.removeItem("srk_me");
    }
    render();
  });
})();
