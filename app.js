(() => {
  const STORAGE_KEY = "ondo-self-reflection-v1";
  const prompts = [
    "오늘 하루 중, 생각보다 덜 힘들었던 순간이 있었나요?",
    "오늘 나를 조금 편하게 해준 건 무엇이었나요?",
    "미루고 싶었지만 결국 시작했던 일이 있다면, 시작 직전에 뭐가 달랐나요?",
    "오늘 에너지가 조금이라도 올라간 순간은 언제였나요?",
    "오늘의 나에게 내일 하나만 부탁한다면, 어떤 작은 부탁일까요?",
    "오늘 계획과 실제가 달랐던 순간에서 발견한 게 있나요?",
    "오늘은 무엇을 하지 않았을 때 오히려 괜찮았나요?"
  ];
  const questionPool = [
    "오늘 하루 중 생각보다 괜찮았던 순간이 있었나요?",
    "시작하기 직전에 가장 크게 걸렸던 건 무엇이었나요?",
    "지금 바꾼다면 가장 부담이 적은 한 가지는 뭘까요?",
    "그 일을 하기 조금 더 쉬운 시간이나 장소가 있을까요?",
    "오늘 나를 도와준 사람이나 환경이 있었나요?",
    "그때와 비슷한 상황이 다시 온다면, 무엇을 다르게 해보고 싶나요?",
    "지금은 해결보다 잠깐 쉬는 게 더 필요한 순간일까요?"
  ];
  const gameDeck = [
    { symbol: "↗", label: "시작", title: "미션: 첫 페이지", text: "공책이나 할 일 목록을 열고, 첫 줄만 읽어봐. 거기까지면 클리어." },
    { symbol: "⌁", label: "리셋", title: "미션: 30초 리셋", text: "자리에서 일어나 어깨를 한 번 돌리고 물 한 모금 마시기. 몸이 깨어나면 완료." },
    { symbol: "▦", label: "정리", title: "미션: 한 칸 정리", text: "책상이나 가방에서 물건 하나만 제자리로. 하나만 해도 미션 완료." },
    { symbol: "◷", label: "집중", title: "미션: 타이머 스타트", text: "미루던 일에 30초 타이머를 켜고 손대기. 계속할지는 30초 뒤에 정해도 돼." },
    { symbol: "✎", label: "메모", title: "미션: 머릿속 비우기", text: "지금 신경 쓰이는 것 하나를 메모장에 적기. 해결은 나중에 해도 괜찮아." },
    { symbol: "◌", label: "휴식", title: "미션: 화면 멈춤", text: "휴대폰 화면을 30초만 내려놓고 눈을 멀리 두기. 짧게 쉬어도 충분해." }
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
        messages: Array.isArray(saved.messages) ? saved.messages : []
      };
    } catch (error) {
      console.error("저장된 기록을 불러오지 못했습니다.", error);
      return { aiName: "", theme: "dark", onboardingSeen: false, records: {}, change: null, practices: [], messages: [] };
    }
  };
  let state = loadState();
  let toastTimer;
  let activeGameCards = [];

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

  function navigate(viewName) {
    $$(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${viewName}`));
    $$("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
    const labels = { today: "오늘 로그", insights: "패턴", change: "미션", conversation: "생각 정리" };
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
      $("#change-progress-label").textContent = `지금까지 ${count}번 해봤어요`;
      $("#save-change").textContent = "변화 내용 수정하기";
    } else {
      $("#change-input").value = "";
      $("#save-change").innerHTML = '이 행동을 해볼래요 <span>→</span>';
    }
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const weekCount = state.practices.filter((entry) => dateFromKey(entry.date) >= new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())).length;
    $("#change-week-count").textContent = `${weekCount}회`;
    $("#change-total-count").textContent = `${state.practices.length}회`;
    const recent = [...state.practices].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    $("#practice-history-list").innerHTML = recent.length
      ? recent.map((entry) => `<div class="practice-row"><span class="practice-check">✓</span><div><strong>${escapeHtml(entry.title)}</strong></div><time>${formatDate(entry.date)}</time></div>`).join("")
      : '<p class="practice-empty">해본 날이 생기면 여기에 기록돼요. 아직 없어도 괜찮아요.</p>';
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
      : '<p class="history-empty">아직 기록이 없어요. 오늘을 돌아보는 것부터 시작해도 괜찮아요.</p>';
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
    const asked = state.messages.filter((message) => message.role === "assistant").map((message) => message.question).filter(Boolean);
    const unused = questionPool.filter((question) => !asked.slice(-4).includes(question));
    return unused[Math.floor(Math.random() * unused.length)] || questionPool[Math.floor(Math.random() * questionPool.length)];
  }

  function buildReply(text) {
    const lower = text.toLowerCase();
    const nameIntro = state.aiName ? `${state.aiName}야. ` : "";
    const record = state.records[todayKey()];
    let reflection;
    if (/미루|시작|공부|숙제/.test(lower)) {
      reflection = "해야 할 일을 미루는 데에는 의지 말고도 시작의 크기나 그때의 에너지처럼 여러 이유가 있을 수 있어요. 어느 부분이 가장 크게 느껴졌는지부터 같이 살펴봐도 좋겠어요.";
    } else if (/힘들|버거|불안|걱정|답답|속상|슬프|지쳐/.test(lower)) {
      reflection = "그렇게 느낄 만한 일이 있었나 봐요. 지금 당장 해결책을 찾지 않아도 괜찮아요. 마음에 남은 상황을 조금 더 이야기해 줄 수 있나요?";
    } else if (/패턴|습관|생활|잠|수면|아침|늦게/.test(lower)) {
      const records = sortedRecords();
      const withSleep = records.filter(([, item]) => item.sleep !== "" && item.sleep != null);
      if (withSleep.length >= 3) {
        const avg = withSleep.reduce((sum, [, item]) => sum + Number(item.sleep), 0) / withSleep.length;
        reflection = `수면 시간을 적어준 ${withSleep.length}일의 평균은 약 ${avg.toFixed(1)}시간이에요. 기록만으로 원인을 정할 수는 없지만, 잠들기 전이나 일어난 뒤의 느낌도 함께 적으면 나에게 맞는 흐름을 더 잘 볼 수 있어요.`;
      } else {
        reflection = "생활 패턴을 알려면 기록이 조금 더 필요해요. 지금까지 확인할 수 있는 정보만으로 단정하지 않을게요. 수면이나 하루의 시작 중 어떤 부분이 가장 궁금한가요?";
      }
    } else {
      reflection = "그 이야기를 꺼내줘서 고마워요. 한 가지 답으로 정하지 않고, 지금의 경험을 더 들여다보고 싶어요.";
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
    state.change = { id: state.change?.id || `change-${Date.now()}`, title, createdAt: state.change?.createdAt || todayKey() };
    if (persist()) {
      renderChange();
      renderTodayChange();
      showToast("내가 고른 작은 변화를 저장했어요.");
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
      showToast("변화 목표를 지웠어요. 다시 정하고 싶을 때 시작해요.");
    }
  });

  $("#practice-today").addEventListener("click", () => {
    if (!state.change) return;
    if (state.practices.some((entry) => entry.date === todayKey() && entry.changeId === state.change.id)) {
      showToast("오늘 해본 기록이 이미 있어요. 충분해요.");
      return;
    }
    state.practices.push({ date: todayKey(), changeId: state.change.id, title: state.change.title });
    if (persist()) {
      renderChange();
      renderTodayChange();
      showToast("해본 순간을 기록했어요. 작은 시도도 의미 있어요.");
    }
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
  renderInsights();
  renderChatContext();
  renderChat();
  if (!state.onboardingSeen) setTimeout(openSettings, 450);
})();
