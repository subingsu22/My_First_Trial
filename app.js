const mainPage = document.querySelector("#mainPage");
const practicePage = document.querySelector("#practicePage");
const practiceTabButton = document.querySelector("#practiceTabButton");
const recordsTabButton = document.querySelector("#recordsTabButton");
const setupTabContent = document.querySelector("#setupTabContent");
const recordsTabContent = document.querySelector("#recordsTabContent");
const showInputButton = document.querySelector("#showInputButton");
const showBulkButton = document.querySelector("#showBulkButton");
const questionForm = document.querySelector("#questionForm");
const questionInput = document.querySelector("#questionInput");
const categoryMenuButton = document.querySelector("#categoryMenuButton");
const categoryMenu = document.querySelector("#categoryMenu");
const categoryOptions = document.querySelector("#categoryOptions");
const categoryInput = document.querySelector("#categoryInput");
const addCategoryButton = document.querySelector("#addCategoryButton");
const bulkPanel = document.querySelector("#bulkPanel");
const bulkInput = document.querySelector("#bulkInput");
const splitBulkButton = document.querySelector("#splitBulkButton");
const addBulkButton = document.querySelector("#addBulkButton");
const bulkPreview = document.querySelector("#bulkPreview");
const bulkHint = document.querySelector("#bulkHint");
const questionList = document.querySelector("#questionList");
const categoryFilters = document.querySelector("#categoryFilters");
const pagination = document.querySelector("#pagination");
const emptyMessage = document.querySelector("#emptyMessage");
const startPracticeButton = document.querySelector("#startPracticeButton");
const startHint = document.querySelector("#startHint");
const exitButton = document.querySelector("#exitButton");
const completeButton = document.querySelector("#completeButton");
const currentQuestion = document.querySelector("#currentQuestion");
const progressText = document.querySelector("#progressText");
const selectedTimeText = document.querySelector("#selectedTimeText");
const answerTimer = document.querySelector("#answerTimer");
const answerLog = document.querySelector("#answerLog");
const logEmptyMessage = document.querySelector("#logEmptyMessage");
const currentCategory = document.querySelector("#currentCategory");
const recordsList = document.querySelector("#recordsList");
const recordsEmptyMessage = document.querySelector("#recordsEmptyMessage");
const calendarTitle = document.querySelector("#calendarTitle");
const calendarGrid = document.querySelector("#calendarGrid");
const prevMonthButton = document.querySelector("#prevMonthButton");
const nextMonthButton = document.querySelector("#nextMonthButton");
const selectedDateLabel = document.querySelector("#selectedDateLabel");

const QUESTIONS_PER_PAGE = 6;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let questions = [];
let categories = [];
let practiceRecords = [];
let selectedRecordDate = formatDateKey(new Date());
let calendarDate = new Date();
let selectedCategory = "";
let selectedFilter = "all";
let bulkItems = [];
let currentPage = 1;
let editingQuestionIndex = null;
let practiceQueue = [];
let currentPracticeQuestion = null;
let answerStartTime = null;
let timerId = null;
let sessionEndTime = null;
let sessionTimerId = null;
let completedAnswers = 0;
let isPracticeFinished = false;
let recognition = null;
let finalTranscript = "";
let interimTranscript = "";

showInputButton.addEventListener("click", () => {
  showSingleMode();
});

showBulkButton.addEventListener("click", () => {
  if (bulkPanel.classList.contains("hidden")) {
    showBulkMode();
  } else {
    showSingleMode();
  }
});

practiceTabButton.addEventListener("click", () => {
  showMainTab("setup");
});

recordsTabButton.addEventListener("click", () => {
  showMainTab("records");
});

prevMonthButton.addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthButton.addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
  renderCalendar();
});

questionForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const question = questionInput.value.trim();
  if (!question) return;

  questions.push({
    text: question,
    category: selectedCategory,
  });
  questionInput.value = "";
  selectedCategory = "";
  currentPage = getTotalPages();
  renderCategoryOptions();
  renderQuestionList();
});

categoryMenuButton.addEventListener("click", () => {
  const isOpen = !categoryMenu.classList.contains("hidden");
  closeAllCategoryMenus();
  setSingleCategoryMenuOpen(!isOpen);
});

addCategoryButton.addEventListener("click", () => {
  const newCategory = categoryInput.value.trim();
  if (!newCategory) return;

  addCategory(newCategory);
  selectedCategory = newCategory;
  categoryInput.value = "";
  setSingleCategoryMenuOpen(false);
  renderCategoryOptions();
});

splitBulkButton.addEventListener("click", () => {
  splitBulkQuestions();
});

addBulkButton.addEventListener("click", () => {
  addBulkQuestions();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".category-picker")) {
    closeAllCategoryMenus();
  }
});

startPracticeButton.addEventListener("click", () => {
  if (questions.length === 0) {
    startHint.textContent = "연습을 시작하려면 질문을 먼저 추가해주세요.";
    return;
  }

  practiceQueue = shuffleQuestions(questions);
  completedAnswers = 0;
  isPracticeFinished = false;
  answerLog.innerHTML = "";
  logEmptyMessage.classList.remove("hidden");
  startSessionTimer(getSelectedPracticeTime());
  showPage(practicePage);
  showNextQuestion();
});

completeButton.addEventListener("click", () => {
  if (isPracticeFinished) {
    stopAllTimers();
    showPage(mainPage);
    showMainTab("records");
    return;
  }

  const seconds = getElapsedSeconds();
  const transcript = getCurrentTranscript();
  stopSpeechRecognition();
  addAnswerLog(currentPracticeQuestion, seconds, transcript);
  completedAnswers += 1;
  showNextQuestion();
});

exitButton.addEventListener("click", () => {
  stopSpeechRecognition();
  stopAllTimers();
  showPage(mainPage);
});

showBulkButton.innerHTML = `${getSingleIcon()} 질문 여러 개 추가하기`;
renderCategoryOptions();

function showSingleMode() {
  questionForm.classList.remove("hidden");
  bulkPanel.classList.add("hidden");
  showBulkButton.innerHTML = `${getSingleIcon()} 질문 여러 개 추가하기`;
  closeAllCategoryMenus();
  questionInput.focus();
}

function showBulkMode() {
  questionForm.classList.add("hidden");
  bulkPanel.classList.remove("hidden");
  showBulkButton.innerHTML = `${getBulkIcon()} 질문 한 개 추가하기`;
  closeAllCategoryMenus();
  bulkInput.focus();
}

function showMainTab(tabName) {
  const isRecordsTab = tabName === "records";

  setupTabContent.classList.toggle("hidden", isRecordsTab);
  recordsTabContent.classList.toggle("hidden", !isRecordsTab);
  practiceTabButton.classList.toggle("tab-button-active", !isRecordsTab);
  recordsTabButton.classList.toggle("tab-button-active", isRecordsTab);

  if (isRecordsTab) {
    renderCalendar();
    renderPracticeRecords();
  }
}

function renderQuestionList() {
  questionList.innerHTML = "";
  const filteredQuestions = getFilteredQuestions();
  const totalPages = getTotalPages(filteredQuestions.length);

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const startIndex = (currentPage - 1) * QUESTIONS_PER_PAGE;
  const visibleQuestions = filteredQuestions.slice(startIndex, startIndex + QUESTIONS_PER_PAGE);

  visibleQuestions.forEach((question, index) => {
    const displayIndex = startIndex + index;
    const absoluteIndex = question.originalIndex;
    const item = document.createElement("li");
    const number = document.createElement("span");
    const content = document.createElement("div");
    const text = document.createElement("p");
    const actions = document.createElement("div");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");

    item.className = "question-item";
    number.className = "question-number";
    number.textContent = displayIndex + 1;
    content.className = "question-content";
    actions.className = "question-actions";

    if (editingQuestionIndex === absoluteIndex) {
      renderQuestionEditor(item, number, content, actions, question, absoluteIndex);
      questionList.appendChild(item);
      return;
    }

    text.className = "question-text";
    text.textContent = question.text;
    editButton.className = "edit-button";
    editButton.type = "button";
    editButton.setAttribute("aria-label", `${question.text} 수정`);
    editButton.innerHTML = getPencilIcon();
    editButton.addEventListener("click", () => {
      editingQuestionIndex = absoluteIndex;
      renderQuestionList();
    });
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", `${question.text} 삭제`);
    deleteButton.innerHTML = getTrashIcon();
    deleteButton.addEventListener("click", () => {
      questions.splice(absoluteIndex, 1);
      renderQuestionList();
    });

    if (question.category) {
      const chip = document.createElement("span");
      chip.className = "category-chip";
      chip.textContent = question.category;
      content.appendChild(chip);
    }

    content.appendChild(text);
    actions.append(editButton, deleteButton);
    item.append(number, content, actions);
    questionList.appendChild(item);
  });

  emptyMessage.classList.toggle("hidden", questions.length > 0);
  categoryFilters.classList.toggle("hidden", questions.length === 0);
  pagination.classList.toggle("hidden", filteredQuestions.length <= QUESTIONS_PER_PAGE);
  renderCategoryFilters();
  renderPagination(filteredQuestions.length);

  startHint.textContent = questions.length > 0
    ? "준비가 되면 면접 연습을 시작해보세요."
    : "질문을 1개 이상 추가하면 연습을 시작할 수 있어요.";
}

function renderQuestionEditor(item, number, content, actions, question, questionIndex) {
  const input = document.createElement("input");
  const categorySelect = document.createElement("select");
  const saveButton = document.createElement("button");
  const cancelButton = document.createElement("button");

  item.classList.add("question-item-editing");
  input.className = "edit-question-input";
  input.value = question.text;
  categorySelect.className = "edit-category-select";
  categorySelect.innerHTML = '<option value="">카테고리 없음</option>';

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });

  categorySelect.value = question.category;
  saveButton.className = "secondary-button small-button";
  saveButton.type = "button";
  saveButton.textContent = "저장";
  cancelButton.className = "ghost-button small-button";
  cancelButton.type = "button";
  cancelButton.textContent = "취소";

  saveButton.addEventListener("click", () => {
    const nextText = input.value.trim();
    if (!nextText) return;

    questions[questionIndex] = {
      text: nextText,
      category: categorySelect.value,
    };
    editingQuestionIndex = null;
    renderQuestionList();
  });

  cancelButton.addEventListener("click", () => {
    editingQuestionIndex = null;
    renderQuestionList();
  });

  content.append(input, categorySelect);
  actions.append(saveButton, cancelButton);
  item.append(number, content, actions);
  input.focus();
}

function renderPagination(totalItems) {
  pagination.innerHTML = "";
  const totalPages = getTotalPages(totalItems);

  if (totalItems <= QUESTIONS_PER_PAGE) return;

  for (let page = 1; page <= totalPages; page += 1) {
    const button = document.createElement("button");
    button.className = "page-button";
    button.type = "button";
    button.textContent = page;
    button.setAttribute("aria-label", `${page}페이지 보기`);

    if (page === currentPage) {
      button.classList.add("page-button-active");
    }

    button.addEventListener("click", () => {
      currentPage = page;
      renderQuestionList();
    });

    pagination.appendChild(button);
  }
}

function renderCategoryFilters() {
  categoryFilters.innerHTML = "";

  const filters = [
    { label: "전체", value: "all" },
    { label: "카테고리 없음", value: "" },
    ...categories.map((category) => ({ label: category, value: category })),
  ];

  filters.forEach((filter) => {
    const count = questions.filter((question) => {
      if (filter.value === "all") return true;
      return question.category === filter.value;
    }).length;

    if (count === 0) return;

    const button = document.createElement("button");
    button.className = "filter-chip";
    button.type = "button";
    button.textContent = `${filter.label} ${count}`;

    if (selectedFilter === filter.value) {
      button.classList.add("filter-chip-active");
    }

    button.addEventListener("click", () => {
      selectedFilter = filter.value;
      currentPage = 1;
      renderQuestionList();
    });

    categoryFilters.appendChild(button);
  });
}

function getFilteredQuestions() {
  return questions
    .map((question, originalIndex) => ({
      ...question,
      originalIndex,
    }))
    .filter((question) => {
      if (selectedFilter === "all") return true;
      return question.category === selectedFilter;
    });
}

function getTotalPages(totalItems = questions.length) {
  return Math.max(1, Math.ceil(totalItems / QUESTIONS_PER_PAGE));
}

function renderCategoryOptions() {
  categoryOptions.innerHTML = "";
  categoryOptions.appendChild(createCategoryOption("카테고리 없음", "", (value) => {
    selectedCategory = value;
    setSingleCategoryMenuOpen(false);
  }, selectedCategory));

  categories.forEach((category) => {
    categoryOptions.appendChild(createCategoryOption(category, category, (value) => {
      selectedCategory = value;
      setSingleCategoryMenuOpen(false);
    }, selectedCategory));
  });

  categoryMenuButton.textContent = selectedCategory || "카테고리 없음";
  renderBulkPreview();
}

function createCategoryOption(label, value, onSelect, activeValue) {
  const option = document.createElement("button");
  option.className = "category-option";
  option.type = "button";
  option.textContent = label;

  if (activeValue === value) {
    option.classList.add("category-option-active");
  }

  option.addEventListener("click", () => {
    onSelect(value);
    renderCategoryOptions();
  });

  return option;
}

function addCategory(category) {
  if (!categories.includes(category)) {
    categories.push(category);
  }
}

function getSingleIcon() {
  return `
    <span class="mode-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M7 7h10l-3-3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M17 17H7l3 3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
  `;
}

function getBulkIcon() {
  return `
    <span class="mode-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M7 7h10l-3-3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M17 17H7l3 3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
  `;
}

function setSingleCategoryMenuOpen(isOpen) {
  categoryMenu.classList.toggle("hidden", !isOpen);
  categoryMenuButton.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    categoryInput.focus();
  }
}

function closeAllCategoryMenus() {
  categoryMenu.classList.add("hidden");
  categoryMenuButton.setAttribute("aria-expanded", "false");
  document.querySelectorAll(".bulk-category-menu").forEach((menu) => {
    menu.classList.add("hidden");
  });
  document.querySelectorAll(".bulk-category-button").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

function splitBulkQuestions() {
  bulkItems = bulkInput.value
    .split("\n")
    .map((question) => question.trim())
    .filter(Boolean)
    .map((question) => ({
      text: question,
      category: selectedCategory,
    }));

  bulkHint.textContent = bulkItems.length > 0
    ? "각 질문마다 카테고리를 고른 뒤 모두 추가를 눌러주세요."
    : "추가할 질문을 한 줄에 하나씩 입력해주세요.";
  renderBulkPreview();
}

function renderBulkPreview() {
  bulkPreview.innerHTML = "";

  bulkItems.forEach((item, index) => {
    const row = document.createElement("div");
    const number = document.createElement("span");
    const question = document.createElement("p");
    const picker = createBulkCategoryPicker(item, index);

    row.className = "bulk-row";
    number.className = "bulk-row-number";
    number.textContent = index + 1;
    question.className = "bulk-row-question";
    question.textContent = item.text;

    row.append(number, question, picker);
    bulkPreview.appendChild(row);
  });
}

function createBulkCategoryPicker(item, index) {
  const picker = document.createElement("div");
  const button = document.createElement("button");
  const menu = document.createElement("div");
  const options = document.createElement("div");
  const addArea = document.createElement("div");
  const input = document.createElement("input");
  const addButton = document.createElement("button");

  picker.className = "category-picker";
  button.className = "category-menu-button bulk-category-button";
  button.type = "button";
  button.textContent = item.category || "카테고리 없음";
  button.setAttribute("aria-expanded", "false");
  menu.className = "category-menu bulk-category-menu hidden";
  options.className = "category-options";
  addArea.className = "category-menu-add";
  input.type = "text";
  input.placeholder = "새 카테고리";
  addButton.className = "secondary-button";
  addButton.type = "button";
  addButton.textContent = "추가";

  options.appendChild(createCategoryOption("카테고리 없음", "", (value) => {
    bulkItems[index].category = value;
    closeAllCategoryMenus();
  }, item.category));

  categories.forEach((category) => {
    options.appendChild(createCategoryOption(category, category, (value) => {
      bulkItems[index].category = value;
      closeAllCategoryMenus();
    }, item.category));
  });

  button.addEventListener("click", () => {
    const isOpen = !menu.classList.contains("hidden");
    closeAllCategoryMenus();
    menu.classList.toggle("hidden", isOpen);
    button.setAttribute("aria-expanded", String(!isOpen));

    if (!isOpen) {
      input.focus();
    }
  });

  addButton.addEventListener("click", () => {
    const newCategory = input.value.trim();
    if (!newCategory) return;

    addCategory(newCategory);
    bulkItems[index].category = newCategory;
    renderCategoryOptions();
  });

  addArea.append(input, addButton);
  menu.append(options, addArea);
  picker.append(button, menu);
  return picker;
}

function addBulkQuestions() {
  if (bulkItems.length === 0) {
    splitBulkQuestions();
  }

  if (bulkItems.length === 0) return;

  questions.push(...bulkItems.map((item) => ({
    text: item.text,
    category: item.category,
  })));

  bulkItems = [];
  bulkInput.value = "";
  selectedCategory = "";
  currentPage = getTotalPages();
  bulkHint.textContent = "줄바꿈으로 질문을 구분한 뒤, 각 질문의 카테고리를 선택할 수 있어요.";
  renderCategoryOptions();
  renderBulkPreview();
  renderQuestionList();
}

function showPage(page) {
  mainPage.classList.remove("page-active");
  practicePage.classList.remove("page-active");
  page.classList.add("page-active");
}

function showNextQuestion() {
  if (practiceQueue.length === 0) {
    finishPractice("모든 질문을 연습했어요. 수고했어요!");
    return;
  }

  if (sessionEndTime && Date.now() >= sessionEndTime) {
    finishPractice("선택한 연습 시간이 끝났어요. 수고했어요!");
    return;
  }

  completeButton.disabled = false;
  completeButton.textContent = "답변 완료";
  currentPracticeQuestion = practiceQueue.shift();
  currentQuestion.textContent = currentPracticeQuestion.text;
  renderCurrentCategory(currentPracticeQuestion.category);

  progressText.textContent = `${completedAnswers + 1} / ${questions.length}`;
  startAnswerTimer();
  startSpeechRecognition();
}

function finishPractice(message) {
  stopAllTimers();
  stopSpeechRecognition();
  isPracticeFinished = true;
  currentQuestion.textContent = message;
  renderCurrentCategory("");
  progressText.textContent = `${completedAnswers} / ${questions.length}`;
  selectedTimeText.textContent = "연습 종료";
  completeButton.disabled = false;
  completeButton.textContent = "연습 완료";
}

function startSessionTimer(minutes) {
  stopAllTimers();

  if (minutes === "unlimited") {
    sessionEndTime = null;
    selectedTimeText.textContent = "무제한 연습";
    return;
  }

  sessionEndTime = Date.now() + Number(minutes) * 60 * 1000;
  updateSessionTimer();
  sessionTimerId = window.setInterval(() => {
    updateSessionTimer();

    if (sessionEndTime && Date.now() >= sessionEndTime) {
      finishPractice("선택한 연습 시간이 끝났어요. 수고했어요!");
    }
  }, 1000);
}

function updateSessionTimer() {
  if (!sessionEndTime) return;

  const remainingSeconds = Math.max(0, Math.ceil((sessionEndTime - Date.now()) / 1000));
  selectedTimeText.textContent = `남은 시간 ${formatSeconds(remainingSeconds)}`;
}

function stopAllTimers() {
  stopTimer();

  if (sessionTimerId) {
    window.clearInterval(sessionTimerId);
    sessionTimerId = null;
  }

  sessionEndTime = null;
}

function startAnswerTimer() {
  stopTimer();
  answerStartTime = Date.now();
  answerTimer.textContent = "00:00";
  timerId = window.setInterval(() => {
    answerTimer.textContent = formatSeconds(getElapsedSeconds());
  }, 1000);
}

function startSpeechRecognition() {
  resetTranscript();

  if (!SpeechRecognition) {
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "ko-KR";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    interimTranscript = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0].transcript.trim();

      if (event.results[index].isFinal) {
        finalTranscript = `${finalTranscript} ${transcript}`.trim();
      } else {
        interimTranscript = `${interimTranscript} ${transcript}`.trim();
      }
    }

  };

  recognition.onerror = () => {
    stopSpeechRecognition();
  };

  recognition.onend = () => {
    if (!recognition || isPracticeFinished || !currentPracticeQuestion) return;

    try {
      recognition.start();
    } catch (error) {
      recognition = null;
    }
  };

  try {
    recognition.start();
  } catch (error) {
    recognition = null;
  }
}

function stopSpeechRecognition() {
  if (!recognition) return;

  recognition.onend = null;
  try {
    recognition.stop();
  } catch (error) {
    // 이미 멈춘 경우에는 저장 흐름만 이어가면 됩니다.
  }
  recognition = null;
}

function resetTranscript() {
  finalTranscript = "";
  interimTranscript = "";
}

function getCurrentTranscript() {
  return `${finalTranscript} ${interimTranscript}`.trim();
}

function stopTimer() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function getElapsedSeconds() {
  if (!answerStartTime) return 0;
  return Math.floor((Date.now() - answerStartTime) / 1000);
}

function addAnswerLog(question, seconds, transcript) {
  const item = document.createElement("li");
  const text = document.createElement("p");
  const time = document.createElement("span");
  const transcriptText = document.createElement("p");

  item.className = "answer-log-item";
  text.className = "answer-log-question";
  text.textContent = question.text;
  time.className = "answer-log-time";
  time.textContent = formatSeconds(seconds);
  transcriptText.className = "transcript-text";
  transcriptText.textContent = transcript || "인식된 답변 텍스트가 없어요.";

  if (question.category) {
    const chip = document.createElement("span");
    chip.className = "category-chip";
    chip.textContent = question.category;
    item.appendChild(chip);
  }

  item.append(text, time, transcriptText);
  answerLog.appendChild(item);
  logEmptyMessage.classList.add("hidden");

  practiceRecords.push({
    question: question.text,
    category: question.category,
    seconds,
    transcript,
    createdAt: new Date(),
  });
  selectedRecordDate = formatDateKey(new Date());
  calendarDate = new Date();
  renderPracticeRecords();
}

function renderPracticeRecords() {
  recordsList.innerHTML = "";
  selectedDateLabel.textContent = `${formatDisplayDate(selectedRecordDate)} 연습 기록`;

  const selectedRecords = practiceRecords.filter((record) => {
    return formatDateKey(record.createdAt) === selectedRecordDate;
  });

  recordsEmptyMessage.classList.toggle("hidden", selectedRecords.length > 0);

  const recordsByQuestion = selectedRecords.reduce((groupedRecords, record) => {
    if (!groupedRecords[record.question]) {
      groupedRecords[record.question] = [];
    }

    groupedRecords[record.question].push(record);
    return groupedRecords;
  }, {});

  Object.entries(recordsByQuestion).forEach(([question, records]) => {
    const item = document.createElement("li");
    const title = document.createElement("div");
    const questionText = document.createElement("p");
    const count = document.createElement("span");
    const recordList = document.createElement("ul");

    item.className = "record-item";
    title.className = "record-title";
    questionText.className = "record-question";
    questionText.textContent = question;
    count.className = "record-count";
    count.textContent = `${records.length}회`;
    recordList.className = "record-times";

    title.append(questionText, count);
    item.appendChild(title);

    if (records[0].category) {
      const chip = document.createElement("span");
      chip.className = "category-chip";
      chip.textContent = records[0].category;
      item.appendChild(chip);
    }

    records.forEach((record, index) => {
      const recordItem = document.createElement("li");
      const time = document.createElement("strong");
      const transcript = document.createElement("p");

      time.textContent = `${index + 1}회차 - ${formatSeconds(record.seconds)}`;
      transcript.className = "transcript-text";
      transcript.textContent = record.transcript || "인식된 답변 텍스트가 없어요.";
      recordItem.append(time, transcript);
      recordList.appendChild(recordItem);
    });

    item.appendChild(recordList);
    recordsList.appendChild(item);
  });
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const recordDates = new Set(practiceRecords.map((record) => formatDateKey(record.createdAt)));

  calendarTitle.textContent = `${year}년 ${month + 1}월`;

  for (let blank = 0; blank < firstDay; blank += 1) {
    const emptyCell = document.createElement("span");
    emptyCell.className = "calendar-empty";
    calendarGrid.appendChild(emptyCell);
  }

  for (let date = 1; date <= lastDate; date += 1) {
    const button = document.createElement("button");
    const dateKey = formatDateKey(new Date(year, month, date));

    button.className = "calendar-day";
    button.type = "button";
    button.textContent = date;

    if (dateKey === selectedRecordDate) {
      button.classList.add("calendar-day-active");
    }

    if (recordDates.has(dateKey)) {
      button.classList.add("calendar-day-has-record");
    }

    button.addEventListener("click", () => {
      selectedRecordDate = dateKey;
      renderCalendar();
      renderPracticeRecords();
    });

    calendarGrid.appendChild(button);
  }
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateKey) {
  const [year, month, day] = dateKey.split("-");
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

function renderCurrentCategory(category) {
  currentCategory.textContent = category;
  currentCategory.classList.toggle("hidden", !category);
}

function shuffleQuestions(questionItems) {
  const shuffled = [...questionItems];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function getSelectedPracticeTime() {
  const selected = document.querySelector("input[name='practiceTime']:checked");
  return selected ? selected.value : "unlimited";
}

function formatSeconds(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getTrashIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6h18" stroke-width="2" stroke-linecap="round" />
      <path d="M8 6V4h8v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M19 6l-1 14H6L5 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M10 11v5" stroke-width="2" stroke-linecap="round" />
      <path d="M14 11v5" stroke-width="2" stroke-linecap="round" />
    </svg>
  `;
}

function getPencilIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4l11-11-4-4L4 16v4Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M13 7l4 4" stroke-width="2" stroke-linecap="round" />
    </svg>
  `;
}
