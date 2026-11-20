(() => {
  const STORAGE_KEY = "ondo-self-reflection-v1";
  const prompts = [
    "네 그림자가 오늘 하루 대신 학교에 갔다면, 집에 와서 뭐라고 했을까?",
    "오늘 있었던 일 중 영화로 만들면 제목이 가장 이상해질 장면은?",
    "오늘의 기분을 날씨 말고 '장소'로 표현하면 어디에 가까울까?",
    "내일의 네가 오늘의 너에게 암호 하나를 남긴다면 뭐라고 쓸까?",
    "오늘 하루를 괴물 하나로 그린다면, 어떤 약점이 있을까?",
    "오늘의 너에게 능력을 하나 붙일 수 있다면, 쓸모없어 보여도 어떤 능력이 좋을까?",
    "오늘 있었던 일 중 나중에 떠올리면 웃길 것 같은 건 뭐야?"
  ];
  const questionPool = [
    "네 그림자가 오늘 하루 대신 학교에 갔다면, 돌아와서 뭐라고 했을까?",
    "오늘 하루에 숨겨진 보스가 있었다면, 정체는 사람이었을까 상황이었을까?",
    "네가 자주 미루는 일에 별명을 붙인다면 뭐라고 부를래?",
    "이 세계의 늑대가 네 가방을 열어본다면 가장 먼저 뭘 발견할까?",
    "오늘의 기분을 소리로만 표현한다면 어떤 소리일까?",
    "내일의 네가 오늘의 너에게 암호 하나를 남긴다면 뭐라고 쓸까?",
    "요즘 네 머릿속에서 가장 시끄럽게 떠드는 생각은 뭐야?",
    "오늘 있었던 일 중 영화로 만들면 제목이 가장 이상해질 장면은?",
    "네가 하루 동안 투명해진다면 제일 먼저 어디로 가고 싶어?",
    "오늘의 에너지를 게임 배터리로 바꾸면 몇 퍼센트쯤 남았어?",
    "누가 네 하루를 관찰했다면, 네가 몰랐던 어떤 습관을 먼저 알아챌까?",
    "지금 네 앞에 문이 생겼다면, 열기 전에 문에 어떤 질문을 할래?"
  ];
  const gameDeck = [
    { symbol: "∴", label: "세 개의 점", title: "흔적 01", text: "나무껍질에 점 세 개가 새겨져 있어. 루나는 그게 별자리라고 하고, 레이븐은 누군가의 암호라고 해." },
    { symbol: "◒", label: "뒤집힌 달", title: "흔적 02", text: "연못에 달이 거꾸로 비쳐. 그런데 하늘에는 달이 없어. 물속을 들여다볼까?" },
    { symbol: "⌁", label: "낯선 발자국", title: "흔적 03", text: "늑대 발자국 옆에 네 운동화 자국이 하나 더 있어. 이 숲에 먼저 온 적이 있었을까?" },
    { symbol: "⊙", label: "숲의 눈", title: "흔적 04", text: "덤불 사이에서 빛 두 개가 깜박였어. 무섭다기보다 네가 아는 눈빛 같아." },
    { symbol: "⟡", label: "깨진 별", title: "흔적 05", text: "별 조각 뒷면에 네 글씨와 비슷한 글자가 있어. 읽을 수는 없지만 이상하게 낯설지 않아." },
    { symbol: "↟", label: "갈라진 길", title: "흔적 06", text: "갈림길은 둘인데 그림자는 셋이야. 셋째 그림자는 어느 쪽으로 가고 있을까?" }
  ];

  const loadState = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        aiName: typeof saved.aiName === "string" ? saved.aiName : "",
        theme: saved.theme === "light" ? "light" : "dark",
        onboardingSeen: Boolean(saved.onboardingSeen),
        records: saved.records && typeof saved.records === "object" ? saved.records : {},
        change: saved.change && typeof saved.change.title === "string" ? saved.change : null,
        practices: Array.isArray(saved.practices) ? saved.practices : [],
        questionHistory: Array.isArray(saved.questionHistory) ? saved.questionHistory : [],
        messages: Array.isArray(saved.messages) ? saved.messages : []
      };
    } catch (error) {
      console.error("저장된 기록을 불러오지 못했습니다.", error);
      return { aiName: "", theme: "dark", onboardingSeen: false, records: {}, change: null, practices: [], questionHistory: [], messages: [] };
    }
  };
  let state = loadState();
  let toastTimer;
  let activeGameCards = [];
  let whisperIndex = -1;
  const doorWhispers = [
    "문 안쪽에서 네 목소리가 들렸다. 그런데 오늘은 아직 아무 말도 하지 않았는데.",
    "루나가 문을 긁었다. 잠시 뒤, 문 안쪽에서도 똑같은 소리가 돌아왔다.",
    "문틈으로 오래된 시험지 한 장이 밀려 나왔다. 네가 아직 풀지 않은 문제였다.",
    "레이븐이 한 발 물러섰다. 처음으로, 무언가를 경계하는 것처럼.",
    "문에 새겨진 이름은 지워져 있다. 이상하게도 네가 지운 것 같은 기분이 든다."
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const todayKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  };
  const dateFromKey = (key) => {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  };
  const formatDate = (key, options = { month: "long", day: "numeric" }) =>
    new Intl.DateTimeFormat("ko-KR", options).format(dateFromKey(key));
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const sortedRecords = () => Object.entries(state.records)
    .filter(([, record]) => record && typeof record === "object")
    .sort(([a], [b]) => a.localeCompare(b));

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error("기록을 저장하지 못했습니다.", error);
      showToast("저장 공간에 기록할 수 없어요. 브라우저 저장 공간을 확인해 주세요.");
      return false;
    }
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function setDate() {
    const date = new Date();
    $("#today-date").textContent = new Intl.DateTimeFormat("ko-KR", {
      year: "numeric", month: "long", day: "numeric", weekday: "short"
    }).format(date);
    const promptIndex = Math.floor(date.getTime() / 86400000) % prompts.length;
    $("#daily-prompt").textContent = prompts[promptIndex];
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    const nextMode = state.theme === "dark" ? "화이트" : "다크";
    $("#theme-toggle").setAttribute("aria-label", `${nextMode} 모드로 바꾸기`);
    $("#theme-toggle").title = `${nextMode} 모드로 바꾸기`;
    $('meta[name="theme-color"]').content = state.theme === "dark" ? "#0b1118" : "#f6f7f4";
  }

  function startGame() {
    activeGameCards = [...gameDeck].sort(() => Math.random() - 0.5).slice(0, 3);
    $("#game-doors").innerHTML = activeGameCards.map((card, index) =>
      `<button class="game-door" type="button" data-game-index="${index}"><span>${card.symbol}</span>${card.label}</button>`
    ).join("");
    $("#game-result").classList.add("hidden");
    $("#game-result").innerHTML = "";
    $("#game-again").classList.add("hidden");
  }

  function getFateOptions() {
    const record = state.records[todayKey()];
    const energy = Number(record?.energy || 0);
    if (energy > 0 && energy <= 2) {
      return [
        { title: "초소에 잠깐 앉기", detail: "물 한 모금 마시고 2분 쉬기", symbol: "⌁" },
        { title: "첫 조각만 건드리기", detail: "미뤄둔 일의 첫 줄만 읽기", symbol: "↗" },
        { title: "오늘은 흔적 남기기", detail: "지금 상태를 한 줄로 기록하기", symbol: "✎" }
      ];
    }
    return [
      { title: "첫 페이지의 방", detail: "공부할 것 하나를 펴고 5분만 보기", symbol: "01" },
      { title: "갈라진 길", detail: "지금 신경 쓰이는 일의 첫 동작 해보기", symbol: "02" },
      { title: "이름 없는 길", detail: "네가 직접 오늘의 미션 정하기", symbol: "??", custom: true }
    ];
  }

  function updateWorldProgress() {
    const xp = state.practices.reduce((total, entry) => total + (Number(entry.xp) || 20), 0);
    const bond = Math.min(100, state.practices.length * 8);
    const regions = [
      { name: "잊힌 숲", detail: "네가 처음 발을 디딘 곳", threshold: 0, symbol: "✳" },
      { name: "얼어붙은 산맥", detail: "60 XP · 흔적이 모이면 열림", threshold: 60, symbol: "⌁" },
      { name: "그림자 성", detail: "140 XP · 아직 문이 잠겨 있음", threshold: 140, symbol: "◇" },
      { name: "별빛 균열", detail: "280 XP · 지도 밖의 장소", threshold: 280, symbol: "⟡" }
    ];
    const currentRegion = [...regions].reverse().find((region) => xp >= region.threshold);
    const nextRegion = regions.find((region) => xp < region.threshold);
    const regionIndex = regions.indexOf(currentRegion);
    const world = $(".quest-world");
    world.dataset.region = String(regionIndex);
    $("#world-chapter").textContent = `CHAPTER ${String(regionIndex + 1).padStart(2, "0")} · ${currentRegion.name}`;
    $("#world-level").textContent = `LVL ${String(Math.floor(xp / 60) + 1).padStart(2, "0")}`;
    $("#region-list").innerHTML = regions.map((region) => {
      const unlocked = xp >= region.threshold;
      const current = currentRegion.name === region.name;
      return `<div class="region-item${unlocked ? " unlocked" : " locked"}${current ? " current" : ""}"><span class="region-symbol">${unlocked ? region.symbol : "?"}</span><span class="region-copy"><strong>${region.name}</strong><small>${unlocked ? (current ? "현재 위치 · 지도에 흔적이 생겼다" : "발견됨") : region.detail}</small></span><span class="region-state">${current ? "HERE" : unlocked ? "OPEN" : "LOCKED"}</span></div>`;
    }).join("");
    $("#world-xp-label").textContent = `${xp} XP`;
    $("#world-progress-bar").style.width = nextRegion
      ? `${Math.max(4, Math.min(100, ((xp - currentRegion.threshold) / (nextRegion.threshold - currentRegion.threshold)) * 100))}%`
      : "100%";
    $("#wolf-bond-progress").style.width = `${bond}%`;
    $("#wolf-bond-label").textContent = `${bond}%`;
    const days = new Set([...Object.keys(state.records), ...state.practices.map((entry) => entry.date)].filter(Boolean)).size;
    $("#world-day-count").textContent = String(Math.max(1, days)).padStart(2, "0");
    const reaction = state.practices.length === 0
      ? "늑대들은 아직 말이 없다. 네가 남길 첫 흔적을 기다리는 중."
      : state.practices.length === 1
        ? "루나가 네 발자국 옆에 자기 흔적을 남겼다. 레이븐은 모른 척한다."
        : state.practices.length < 5
          ? "레이븐이 조금 가까이 다가왔다. 루나는 네가 다음에 어디로 갈지 이미 알고 있는 듯하다."
          : "둘은 네가 돌아올 때마다 숲이 조금씩 달라지는 걸 알고 있다.";
    $("#wolf-reaction").textContent = reaction;
    world.classList.toggle("has-traces", state.practices.length > 0);
    world.classList.toggle("deep-bond", bond >= 40);
  }

  function renderAdventure() {
    const options = $("#fate-options");
    const active = Boolean(state.change);
    options.classList.toggle("hidden", active);
    $("#active-quest").classList.toggle("hidden", !active);
    $("#quest-custom-link").classList.toggle("hidden", active);
    if (active) {
      $("#active-quest-title").textContent = state.change.title;
      $("#active-quest-detail").textContent = state.change.detail || "네가 고른 길. 어디까지 갈지는 네가 정해.";
      $("#fate-description").textContent = "길을 골랐어. 작은 흔적 하나면 충분해.";
    } else {
      $("#fate-description").textContent = "세 갈래 길이 나타났다. 어느 쪽이든 네 선택이야.";
      options.innerHTML = getFateOptions().map((option, index) =>
        `<button class="fate-option" type="button" data-fate-index="${index}"><span class="fate-symbol">${option.symbol}</span><span class="fate-copy"><strong>${escapeHtml(option.title)}</strong><small>${escapeHtml(option.detail)}</small></span><span class="fate-arrow">↗</span></button>`
      ).join("");
    }
    updateWorldProgress();
  }

  function activateQuest(title, detail) {
    state.change = { id: `quest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title, detail, createdAt: todayKey() };
    if (persist()) {
      renderAdventure();
      renderTodayChange();
      showToast("새 길이 기록됐다. 네 방식대로 가면 돼.");
    }
  }

  function completeCurrentQuest() {
    if (!state.change) return;
    const existing = state.practices.find((entry) => entry.changeId === state.change.id);
    if (existing) {
      showToast("이 퀘스트의 흔적은 이미 남겼어.");
      return;
    }
    state.practices.push({
      date: todayKey(),
      changeId: state.change.id,
      title: state.change.title,
      xp: 20,
      kind: "quest"
    });
    state.change = null;
    if (persist()) {
      renderAdventure();
      renderChange();
      renderTodayChange();
      renderWeekChart();
      showToast("흔적 +20 XP · 두 늑대가 네 쪽을 돌아봤다.");
    }
  }

  function navigate(viewName) {
    $$(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${viewName}`));
    $$("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
    const labels = { today: "탐험", insights: "기록", change: "퀘스트", conversation: "기억 조각" };
    $("#page-label").textContent = labels[viewName] || labels.today;
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (viewName === "insights") renderInsights();
    if (viewName === "change") renderChange();
    if (viewName === "conversation") renderChatContext();
  }

  function renderCheckin() {
    const record = state.records[todayKey()];
    if (record) {
      if (record.mood) {
        const mood = $(`input[name="mood"][value="${CSS.escape(record.mood)}"]`);
        if (mood) mood.checked = true;
      }
      if (record.energy) {
        const energy = $(`input[name="energy"][value="${CSS.escape(String(record.energy))}"]`);
        if (energy) energy.checked = true;
      }
      $("#sleep-hours").value = record.sleep ?? "";
      $("#study-start").value = record.studyStart ?? "";
      $("#day-note").value = record.note ?? "";
      $("#save-button-label").textContent = "로그 수정";
      $("#save-hint").textContent = "언제든 다시 수정할 수 있어.";
    }
  }

  function renderWeekChart() {
    const chart = $("#week-bars");
    const days = [];
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      days.push({ key, label: new Intl.DateTimeFormat("ko-KR", { weekday: "narrow" }).format(date), record: state.records[key] });
    }
    chart.innerHTML = days.map(({ label, record }) => {
      const height = record ? Math.max(12, Number(record.energy || 3) * 8) : 4;
      return `<span class="mini-day${record ? " recorded" : ""}" title="${record ? "기록한 날" : "기록 없음"}"><i style="height:${height}px"></i>${label}</span>`;
    }).join("");
    $("#week-count").textContent = `${days.filter((day) => day.record).length}일`;
  }

  function renderChange() {
    const active = Boolean(state.change);
    $("#change-empty").classList.toggle("hidden", active);
    $("#change-active").classList.toggle("hidden", !active);
    $("#remove-change").classList.toggle("hidden", !active);
    if (active) {
      $("#change-input").value = state.change.title;
      $("#active-change-title").textContent = state.change.title;
      const count = state.practices.filter((entry) => entry.changeId === state.change.id).length;
      $("#change-progress-label").textContent = `${count}번 흔적을 남겼어`;
      $("#save-change").innerHTML = '퀘스트 내용 수정 <span>→</span>';
    } else {
      $("#change-input").value = "";
      $("#save-change").innerHTML = '이 퀘스트로 가기 <span>→</span>';
    }
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const weekCount = state.practices.filter((entry) => dateFromKey(entry.date) >= new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())).length;
    $("#change-week-count").textContent = `${weekCount}회`;
    $("#change-total-count").textContent = `${state.practices.length}회`;
    const recent = [...state.practices].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    $("#practice-history-list").innerHTML = recent.length
      ? recent.map((entry) => `<div class="practice-row"><span class="practice-check">✓</span><div><strong>${escapeHtml(entry.title)}</strong></div><time>${formatDate(entry.date)}</time></div>`).join("")
      : '<p class="practice-empty">아직 지도에 흔적이 없어. 아무 때나 시작해도 돼.</p>';
  }

  function renderInsights() {
    const records = sortedRecords();
    $("#total-records").textContent = records.length;
    $("#last-record-date").textContent = records.length ? formatDate(records[records.length - 1][0]) : "아직 없어요";
    const recentWeek = [];
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      recentWeek.push({ key, record: state.records[key], label: new Intl.DateTimeFormat("ko-KR", { weekday: "narrow" }).format(date) });
    }
    $("#insight-chart").innerHTML = recentWeek.map(({ record, label }) => {
      const energy = record ? Math.max(1, Math.min(5, Number(record.energy || 3))) : 0;
      const height = record ? 17 + energy * 17 : 3;
      return `<span class="insight-day${record ? "" : " empty"}"><span class="bar-area"><i style="height:${height}px"></i></span>${label}</span>`;
    }).join("");

    const findings = [];
    const withSleep = records.filter(([, record]) => Number.isFinite(Number(record.sleep)) && record.sleep !== "");
    if (withSleep.length >= 3) {
      const average = withSleep.reduce((sum, [, record]) => sum + Number(record.sleep), 0) / withSleep.length;
      findings.push(`수면 시간을 적어준 ${withSleep.length}일의 평균은 약 ${average.toFixed(1)}시간이에요. 이 숫자가 나에게 어떤 느낌인지 살펴봐도 좋겠어요.`);
    }
    const withStudy = records.filter(([, record]) => record.studyStart);
    if (withStudy.length >= 3) {
      const minutes = withStudy.map(([, record]) => {
        const [hour, minute] = record.studyStart.split(":").map(Number);
        return hour * 60 + minute;
      });
      const average = Math.round(minutes.reduce((sum, value) => sum + value, 0) / minutes.length);
      findings.push(`공부 시작 시간을 기록한 ${withStudy.length}일을 보면 평균 시작 시각은 ${String(Math.floor(average / 60)).padStart(2, "0")}:${String(average % 60).padStart(2, "0")}예요. 이 시간대가 편한지 함께 알아가 봐요.`);
    }
    const withMood = records.filter(([, record]) => record.mood);
    if (withMood.length >= 3) {
      const counts = withMood.reduce((result, [, record]) => {
        result[record.mood] = (result[record.mood] || 0) + 1;
        return result;
      }, {});
      const [mood, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      findings.push(`기분을 남긴 ${withMood.length}일 중 '${mood}'라고 적은 날이 ${count}번 있어요. 그날들에 겹치는 일이 있었는지는 아직 기록을 더 모아봐야 알 수 있어요.`);
    }
    if (records.length >= 7) {
      const last = records.slice(-3);
      const before = records.slice(-6, -3);
      const moodScore = (mood) => ({ "편안했어": 3, "그저 그랬어": 2, "조금 버거웠어": 1, "잘 모르겠어": null })[mood] ?? null;
      const currentMood = last.map(([, record]) => moodScore(record.mood)).filter((score) => score !== null);
      const previousMood = before.map(([, record]) => moodScore(record.mood)).filter((score) => score !== null);
      if (currentMood.length >= 2 && previousMood.length >= 2) {
        const currentAverage = currentMood.reduce((sum, score) => sum + score, 0) / currentMood.length;
        const previousAverage = previousMood.reduce((sum, score) => sum + score, 0) / previousMood.length;
        if (Math.abs(currentAverage - previousAverage) >= 0.6) {
          findings.push("최근 3회와 그 이전 3회를 비교하면 기분 기록의 분포가 달라졌어요. 그 사이 달라진 환경이나 일정이 있었는지 떠올려 볼 수 있어요.");
        }
      }
    }
    const findingsList = $("#findings-list");
    findingsList.innerHTML = findings.length
      ? findings.map((finding) => `<div class="finding-item"><span class="finding-mark">✳</span><p>${escapeHtml(finding)}</p></div>`).join("")
      : `<div class="finding-empty"><span class="empty-symbol">⌁</span><div><strong>${records.length < 3 ? "조금 더 기록이 쌓이면 함께 살펴볼게요" : "아직 반복되는 흐름을 말하기엔 정보가 부족해요"}</strong><p>${records.length < 3 ? `현재 ${records.length}일의 기록이 있어요. 최소 3일의 기록이 모이면 수면, 공부 시간처럼 직접 적어준 항목에서만 조심스러운 발견을 보여드릴게요.` : "수면 시간이나 공부 시작 시각을 몇 번 더 적어주면 확인 가능한 흐름을 보여드릴게요. 확인되지 않은 패턴은 추측하지 않을게요."}</p></div></div>`;

    const history = records.slice().reverse().slice(0, 6);
    $("#history-list").innerHTML = history.length
      ? history.map(([key, record]) => {
        const detail = [record.mood && `기분은 ${record.mood}`, record.sleep && `수면 ${record.sleep}시간`, record.studyStart && `공부 시작 ${record.studyStart}`, record.note && `“${escapeHtml(record.note)}”`].filter(Boolean).join(" · ");
        return `<div class="history-row"><time>${formatDate(key, { month: "short", day: "numeric", weekday: "short" })}</time><p>${detail ? escapeHtml(detail) : "간단히 오늘을 돌아봤어요."}</p></div>`;
      }).join("")
      : '<p class="history-empty">아직 기록이 없어. 네가 남길 첫 흔적을 기다리는 중.</p>';
  }

  function renderChatContext() {
    const records = sortedRecords();
    if (!records.length) {
      $("#chat-context").innerHTML = "아직 남겨둔 기록은 없어요. 오늘 어떤 하루였는지 이야기하면서 시작해도 괜찮아요.";
      return;
    }
    const [key, record] = records[records.length - 1];
    const details = [record.mood && `기분은 <strong>${escapeHtml(record.mood)}</strong>`, record.sleep && `수면은 <strong>${escapeHtml(record.sleep)}시간</strong>`, record.studyStart && `공부 시작은 <strong>${escapeHtml(record.studyStart)}</strong>`].filter(Boolean).join(", ");
    $("#chat-context").innerHTML = `${formatDate(key)} 기록${details ? `에서 ${details}` : ""}${record.note ? `<br>“${escapeHtml(record.note)}”` : ""}<br>이 중 이야기해 보고 싶은 게 있나요?`;
  }

  function renderChat() {
    const title = state.aiName ? state.aiName : "생각 정리";
    $("#chat-name").textContent = title;
    const messages = $("#chat-messages");
    if (!state.messages.length) return;
    messages.innerHTML = state.messages.slice(-60).map((message) => {
      const isUser = message.role === "user";
      return `<div class="message ${isUser ? "user-message" : "assistant-message"}">${isUser ? "" : '<div class="message-avatar">✳</div>'}<div class="message-bubble"><p>${escapeHtml(message.text).replace(/\n/g, "<br>")}</p><span class="message-time">${escapeHtml(message.time || "지금")}</span></div></div>`;
    }).join("");
    messages.scrollTop = messages.scrollHeight;
  }

  function chooseQuestion() {
    const unused = questionPool.filter((question) => !state.questionHistory.slice(-5).includes(question));
    const question = unused[Math.floor(Math.random() * unused.length)] || questionPool[Math.floor(Math.random() * questionPool.length)];
    state.questionHistory.push(question);
    state.questionHistory = state.questionHistory.slice(-12);
    return question;
  }

  function chooseStrangeQuestion() {
    const record = state.records[todayKey()];
    const creativePool = record?.energy && Number(record.energy) <= 2
      ? questionPool.filter((question) => /그림자|소리|암호|투명|문에/.test(question))
      : questionPool;
    const unused = creativePool.filter((question) => !state.questionHistory.slice(-5).includes(question));
    const question = unused[Math.floor(Math.random() * unused.length)] || questionPool[Math.floor(Math.random() * questionPool.length)];
    state.questionHistory.push(question);
    state.questionHistory = state.questionHistory.slice(-12);
    $("#strange-question").textContent = question;
    persist();
  }

  function buildReply(text) {
    const lower = text.toLowerCase();
    const nameIntro = state.aiName ? `${state.aiName}가 그 말을 기억해둘게. ` : "";
    const record = state.records[todayKey()];
    let reflection;
    if (/미루|시작|공부|숙제/.test(lower)) {
      reflection = "레이븐이 네 말에 귀를 세웠어. 시작이 막힐 땐 일 전체보다 첫 동작이 너무 흐릿할 때도 있어. 딱 2분짜리 첫 동작으로 줄인다면 뭐가 제일 작을까?";
    } else if (/힘들|버거|불안|걱정|답답|속상|슬프|지쳐/.test(lower)) {
      reflection = "루나는 대답을 재촉하지 않아. 지금 그 기분을 만든 장면이 떠오르면 말해줘. 아직 정리 안 된 말이어도 괜찮아.";
    } else if (/패턴|습관|생활|잠|수면|아침|늦게/.test(lower)) {
      const records = sortedRecords();
      const withSleep = records.filter(([, item]) => item.sleep !== "" && item.sleep != null);
      if (withSleep.length >= 3) {
        const avg = withSleep.reduce((sum, [, item]) => sum + Number(item.sleep), 0) / withSleep.length;
        reflection = `네가 직접 적은 ${withSleep.length}일의 수면 기록은 평균 ${avg.toFixed(1)}시간이야. 이유까지는 이 기록만으로 알 수 없어. 잠든 다음 날의 느낌도 같이 남겨볼까?`;
      } else {
        reflection = "이 숲엔 아직 네 생활 패턴을 읽을 만큼 흔적이 없어. 더 적어주기 전엔 추측하지 않을게. 잠, 아침, 공부 시작 중 어디가 제일 궁금해?";
      }
    } else {
      reflection = "루나는 조용히 듣고 있고, 레이븐은 네가 한 말에서 단서를 찾는 중이야. 아직 답을 정하지 않아도 돼.";
    }
    const question = chooseQuestion();
    const todayContext = record?.mood ? ` 오늘은 기분이 '${record.mood}'라고 남겨줬는데, 그 느낌과도 이어져 있을까요?` : "";
    return { text: `${nameIntro}${reflection}${todayContext}\n\n${question}`, question };
  }

  function addMessage(role, text, question = "") {
    const time = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    state.messages.push({ role, text, question, time });
    if (state.messages.length > 100) state.messages = state.messages.slice(-100);
    if (!persist()) return false;
    renderChat();
    return true;
  }

  $("#checkin-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const mood = $('input[name="mood"]:checked')?.value || "";
    const energy = $('input[name="energy"]:checked')?.value || "";
    const sleepValue = $("#sleep-hours").value;
    if (!mood && !energy && !sleepValue && !$("#study-start").value && !$("#day-note").value.trim()) {
      showToast("오늘의 기분이나 에너지처럼 한 가지만 골라도 괜찮아요.");
      return;
    }
    if (sleepValue && (Number(sleepValue) < 0 || Number(sleepValue) > 24)) {
      showToast("수면 시간은 0시간에서 24시간 사이로 적어주세요.");
      return;
    }
    state.records[todayKey()] = {
      mood,
      energy: energy ? Number(energy) : "",
      sleep: sleepValue ? Number(sleepValue) : "",
      studyStart: $("#study-start").value,
      note: $("#day-note").value.trim(),
      updatedAt: new Date().toISOString()
    };
    if (persist()) {
      $("#save-button-label").textContent = "로그 수정";
      $("#save-hint").textContent = "언제든 다시 수정할 수 있어.";
      renderWeekChart();
      renderAdventure();
      showToast("오늘 로그 저장 완료.");
    }
  });

  $("#game-doors").addEventListener("click", (event) => {
    const button = event.target.closest("[data-game-index]");
    if (!button) return;
    const card = activeGameCards[Number(button.dataset.gameIndex)];
    if (!card) return;
    $$(".game-door", $("#game-doors")).forEach((door) => {
      door.disabled = true;
      door.classList.toggle("selected", door === button);
    });
    $("#game-result").innerHTML = `<strong>${card.title}</strong>${card.text}`;
    $("#game-result").classList.remove("hidden");
    $("#game-again").classList.remove("hidden");
  });
  $("#game-again").addEventListener("click", startGame);

  $("#fate-options").addEventListener("click", (event) => {
    const button = event.target.closest("[data-fate-index]");
    if (!button) return;
    const option = getFateOptions()[Number(button.dataset.fateIndex)];
    if (!option) return;
    if (option.custom) {
      navigate("change");
      $("#change-input").focus();
      return;
    }
    activateQuest(option.title, option.detail);
  });
  $("#complete-quest").addEventListener("click", completeCurrentQuest);
  $("#world-question-button").addEventListener("click", () => {
    let next = Math.floor(Math.random() * doorWhispers.length);
    if (doorWhispers.length > 1 && next === whisperIndex) next = (next + 1) % doorWhispers.length;
    whisperIndex = next;
    $("#world-whisper").textContent = doorWhispers[whisperIndex];
    $("#world-whisper").classList.remove("hidden");
    $("#world-question-button").innerHTML = '문틈을 더 살핀다 <span>↗</span>';
    $(".quest-world").classList.add("door-opened");
  });
  $("#next-clue").addEventListener("click", chooseStrangeQuestion);

  $$("#suggestion-list .suggestion-chip").forEach((button) => {
    button.addEventListener("click", () => {
      $("#change-input").value = button.dataset.suggestion;
      $$("#suggestion-list .suggestion-chip").forEach((chip) => chip.classList.toggle("selected", chip === button));
    });
  });

  $("#save-change").addEventListener("click", () => {
    const title = $("#change-input").value.trim();
    if (!title) {
      showToast("해보고 싶은 행동을 먼저 적거나 골라주세요.");
      $("#change-input").focus();
      return;
    }
    state.change = {
      id: state.change?.id || `quest-${Date.now()}`,
      title,
      detail: "네가 직접 만든 퀘스트. 어디까지 할지는 네가 정해.",
      createdAt: state.change?.createdAt || todayKey()
    };
    if (persist()) {
      renderChange();
      renderTodayChange();
      renderAdventure();
      showToast("네 퀘스트가 지도에 기록됐다.");
    }
  });

  function renderTodayChange() {
    const active = Boolean(state.change);
    $("#change-empty").classList.toggle("hidden", active);
    $("#change-active").classList.toggle("hidden", !active);
    if (active) {
      $("#active-change-title").textContent = state.change.title;
      const count = state.practices.filter((entry) => entry.changeId === state.change.id).length;
      $("#change-progress-label").textContent = `지금까지 ${count}번 해봤어요`;
    }
  }

  $("#remove-change").addEventListener("click", () => {
    state.change = null;
    if (persist()) {
      renderChange();
      renderTodayChange();
      renderAdventure();
      showToast("퀘스트를 내려놨어. 다른 길은 언제든 열려.");
    }
  });

  $("#practice-today").addEventListener("click", () => {
    completeCurrentQuest();
  });

  $("#chat-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = $("#chat-input");
    const text = input.value.trim();
    if (!text) return;
    const reply = buildReply(text);
    if (addMessage("user", text) && addMessage("assistant", reply.text, reply.question)) input.value = "";
  });
  $$(".chat-suggestions button").forEach((button) => button.addEventListener("click", () => {
    $("#chat-input").value = button.dataset.chatSuggestion;
    $("#chat-input").focus();
  }));
  $("#context-question").addEventListener("click", () => {
    const records = sortedRecords();
    const [key, record] = records[records.length - 1] || [];
    const suggested = record?.mood
      ? `오늘 기분을 '${record.mood}'라고 남겼어. 그 기분에 영향을 준 일이 있었을까?`
      : "내 기록에서 발견할 수 있는 생활 패턴이 있는지 같이 살펴보고 싶어.";
    $("#chat-input").value = suggested;
    navigate("conversation");
    $("#chat-input").focus();
  });
  $("#prompt-to-chat").addEventListener("click", () => {
    $("#chat-input").value = $("#daily-prompt").textContent;
    navigate("conversation");
    $("#chat-input").focus();
  });

  function openSettings() {
    $("#ai-name-input").value = state.aiName;
    $("#settings-modal").classList.add("open");
    $("#settings-modal").setAttribute("aria-hidden", "false");
    setTimeout(() => $("#ai-name-input").focus(), 0);
  }
  function closeSettings() {
    $("#settings-modal").classList.remove("open");
    $("#settings-modal").setAttribute("aria-hidden", "true");
    if (!state.onboardingSeen) {
      state.onboardingSeen = true;
      persist();
    }
  }
  $("#open-settings").addEventListener("click", openSettings);
  $("#open-settings-mobile").addEventListener("click", openSettings);
  $("#close-settings").addEventListener("click", closeSettings);
  $("#settings-modal").addEventListener("click", (event) => {
    if (event.target === $("#settings-modal")) closeSettings();
  });
  $("#save-ai-name").addEventListener("click", () => {
    state.aiName = $("#ai-name-input").value.trim();
    state.onboardingSeen = true;
    if (persist()) {
      renderChat();
      closeSettings();
      showToast(state.aiName ? `${state.aiName}와 함께하는 대화 공간을 만들었어요.` : "이름 없이도 편하게 사용할 수 있어요.");
    }
  });
  $("#clear-ai-name").addEventListener("click", () => {
    state.aiName = "";
    state.onboardingSeen = true;
    if (persist()) {
      renderChat();
      closeSettings();
      showToast("이름을 정하지 않고 사용할게요.");
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSettings();
  });
  $$("[data-view]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.view)));
  $$("[data-go]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.go)));
  $("#theme-toggle").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    persist();
  });

  applyTheme();
  setDate();
  startGame();
  renderCheckin();
  renderWeekChart();
  renderChange();
  renderTodayChange();
  renderAdventure();
  renderInsights();
  renderChatContext();
  renderChat();
  if (!state.onboardingSeen) setTimeout(openSettings, 450);
})();
