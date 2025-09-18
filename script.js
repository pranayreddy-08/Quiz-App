// ========== Config ==========
const HIGHSCORE_KEY = "quiz_highscore";
const CATEGORY_ID = 18; // Science: Computers (tech)
const DIFF_TO_TIME = { easy: 20, medium: 15, hard: 10 };

// ========== State ==========
let TIME_PER_QUESTION = 15;
let currentQuestionIndex = 0;
let score = 0;
let hasSelected = false;
let timerId = null;
let timeLeft = TIME_PER_QUESTION;

// This holds the fetched+normalized set for a single run
let sessionData = [];

// ========== DOM ==========
const startBox    = document.getElementById("start-container");
const quizBox     = document.getElementById("quiz-container");
const resultBox   = document.getElementById("result-container");

const difficultyEl= document.getElementById("difficulty");
const countEl     = document.getElementById("question-count");
const startBtn    = document.getElementById("start-btn");

const questionEl  = document.getElementById("question");
const optionsEl   = document.getElementById("options");
const nextBtn     = document.getElementById("next-btn");
const scoreEl     = document.getElementById("score");
const restartBtn  = document.getElementById("restart-btn");

const timerEl     = document.getElementById("timer");
const progressBar = document.getElementById("progress-bar");
const progressTxt = document.getElementById("progress-text");
const highscoreEl = document.getElementById("highscore");

// ========== Utils ==========
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// OpenTDB returns HTML entities. Decode them.
function decodeHTML(str) {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

// Normalize OpenTDB items to our shape
function buildSessionFromOTDB(items) {
  return items.map(item => {
    const question = decodeHTML(item.question);
    const correct = decodeHTML(item.correct_answer);
    const options = item.incorrect_answers.map(decodeHTML).concat(correct);
    shuffleInPlace(options);
    const answer = options.findIndex(o => o === correct);
    return { question, options, answer };
  });
}

// Progress/timer helpers
function updateProgress() {
  const total = sessionData.length;
  const pct = Math.round((currentQuestionIndex / total) * 100);
  progressBar.style.width = pct + "%";
  progressTxt.textContent = `${currentQuestionIndex + 1} / ${total}`;
}

function clearTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
  timerEl.classList.remove("timer-low");
}
function startTimer() {
  clearTimer();
  timeLeft = TIME_PER_QUESTION;
  timerEl.textContent = timeLeft;
  timerEl.classList.remove("timer-low");

  timerId = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 5) timerEl.classList.add("timer-low");
    if (timeLeft <= 0) {
      clearTimer();
      handleTimeout();
    }
  }, 1000);
}

function lockOptions()  { [...optionsEl.children].forEach(li => li.style.pointerEvents = "none"); }
function unlockOptions(){ [...optionsEl.children].forEach(li => li.style.pointerEvents = "auto"); }

// ========== Render ==========
function loadQuestion(index) {
  hasSelected = false;
  nextBtn.disabled = true;
  nextBtn.classList.add("btn-disabled");

  updateProgress();

  const q = sessionData[index];
  questionEl.textContent = q.question;
  optionsEl.innerHTML = "";

  q.options.forEach((optText, i) => {
    const li = document.createElement("li");
    li.textContent = optText;
    li.tabIndex = 0;
    li.addEventListener("click", () => handleSelect(li, i));
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelect(li, i); }
    });
    optionsEl.appendChild(li);
  });

  unlockOptions();
  startTimer();
}

function handleSelect(li, index) {
  if (hasSelected) return;
  hasSelected = true;
  clearTimer();
  lockOptions();

  const correctIdx = sessionData[currentQuestionIndex].answer;
  if (index === correctIdx) {
    li.classList.add("correct");
    score++;
  } else {
    li.classList.add("wrong");
    optionsEl.children[correctIdx].classList.add("correct");
  }

  nextBtn.disabled = false;
  nextBtn.classList.remove("btn-disabled");
}

function handleTimeout() {
  if (hasSelected) return;
  hasSelected = true;
  lockOptions();
  const correctIdx = sessionData[currentQuestionIndex].answer;
  optionsEl.children[correctIdx].classList.add("correct");
  nextBtn.disabled = false;
  nextBtn.classList.remove("btn-disabled");
}

nextBtn.addEventListener("click", () => {
  currentQuestionIndex++;
  if (currentQuestionIndex < sessionData.length) {
    loadQuestion(currentQuestionIndex);
  } else {
    showResults();
  }
});

function showResults() {
  clearTimer();
  quizBox.style.display = "none";
  resultBox.style.display = "flex";
  const total = sessionData.length;
  scoreEl.textContent = `Your Score: ${score} / ${total}`;

  const prevHigh = parseInt(localStorage.getItem(HIGHSCORE_KEY) || "0", 10);
  if (score > prevHigh) {
    localStorage.setItem(HIGHSCORE_KEY, String(score));
    highscoreEl.textContent = `High Score: ${score} 🎉 New High Score!`;
  } else {
    highscoreEl.textContent = `High Score: ${prevHigh}`;
  }
}

restartBtn.addEventListener("click", () => {
  clearTimer();
  // back to start to pick difficulty/count again
  startBox.style.display = "flex";
  quizBox.style.display  = "none";
  resultBox.style.display= "none";
  currentQuestionIndex = 0;
  score = 0;
});

// ========== API ==========
async function fetchOpenTDB({ amount, difficulty, category = CATEGORY_ID }) {
  const url = `https://opentdb.com/api.php?amount=${amount}&category=${category}&difficulty=${difficulty}&type=multiple`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Network error: ${res.status}`);
  const data = await res.json();

  // response_code: 0 = success, 1 = not enough questions for your query
  if (data.response_code === 1) {
    // Not enough questions at that difficulty/amount
    // Return whatever we got (maybe 0) and let caller handle
    return buildSessionFromOTDB(data.results || []);
  } else if (data.response_code !== 0) {
    throw new Error(`API error: code ${data.response_code}`);
  }

  return buildSessionFromOTDB(data.results);
}

// ========== Start Screen ==========
startBtn.addEventListener("click", async () => {
  // 1) Difficulty → per-question time
  const diff = difficultyEl.value; // easy/medium/hard
  TIME_PER_QUESTION = DIFF_TO_TIME[diff] ?? 15;

  // 2) Count (cap by a safe upper bound; the Computers category usually supports ~50 per diff)
  let requested = parseInt(countEl.value || "5", 10);
  if (isNaN(requested) || requested < 1) requested = 1;
  if (requested > 20) requested = 20; // OpenTDB max per call
  countEl.value = requested;

  // UI: disable button + text to indicate loading
  startBtn.disabled = true;
  const originalText = startBtn.textContent;
  startBtn.textContent = "Loading…";

  try {
    const items = await fetchOpenTDB({ amount: requested, difficulty: diff });
    if (!items.length) {
      alert(`Not enough ${diff} questions available in "Computers". Try lowering the count or changing difficulty.`);
      return;
    }
    // If API returned fewer than requested, just use what we got
    sessionData = items.slice(0, requested);

    // 3) Switch screens and start quiz
    startBox.style.display = "none";
    quizBox.style.display  = "flex";
    resultBox.style.display= "none";

    currentQuestionIndex = 0;
    score = 0;
    loadQuestion(0);
  } catch (err) {
    console.error(err);
    alert("Failed to fetch questions. Check your internet and try again.");
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = originalText;
  }
});

// Show start screen by default
startBox.style.display = "flex";
quizBox.style.display  = "none";
resultBox.style.display= "none";
