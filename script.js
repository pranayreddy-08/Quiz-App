// ---------- Data ----------
const quizData = [
  {
    question: "What is the full form of HTML?",
    options: ["Hello to my land","Hey text markup language","Hypertext markup language","Hypertext makeup language"],
    answer: 2
  },
  {
    question: "What is the full form of CSS?",
    options: ["Cascading style sheets","Cascading style sheep","Cartoon style sheets","Cascading super sheets"],
    answer: 0
  },
  {
    question: "What is the full form of JS?",
    options: ["JavaScript","JavaSuper","JustScript","JordenShoes"],
    answer: 0
  },
  {
    question: "What is the full form of HTTP?",
    options: ["Hypertext transfer product","Hypertext test protocol","Hey transfer protocol","Hypertext transfer protocol"],
    answer: 3
  },
  {
    question: "What is the full form of URL?",
    options: ["Uniform resource locator","Uniform resource link","United resource locator","United resource link"],
    answer: 0
  }
];

// ---------- Config ----------
const TIME_PER_QUESTION = 15; // seconds
const HIGHSCORE_KEY = "quiz_highscore";

// ---------- State ----------
let currentQuestionIndex = 0;
let score = 0;
let hasSelected = false;
let timerId = null;
let timeLeft = TIME_PER_QUESTION;

// ---------- DOM ----------
const questionEl = document.getElementById("question");
const optionsEl  = document.getElementById("options");
const nextBtn    = document.getElementById("next-btn");
const resultBox  = document.getElementById("result-container");
const scoreEl    = document.getElementById("score");
const restartBtn = document.getElementById("restart-btn");
const quizBox    = document.getElementById("quiz-container");
const timerEl    = document.getElementById("timer");
const progressBar= document.getElementById("progress-bar");
const progressTxt= document.getElementById("progress-text");
const highscoreEl= document.getElementById("highscore");

// ---------- Helpers ----------
function updateProgress() {
  const total = quizData.length;
  const current = currentQuestionIndex + 1;
  const pct = Math.round((currentQuestionIndex / total) * 100);
  progressBar.style.width = pct + "%";
  progressTxt.textContent = `${current} / ${total}`;
}

function startTimer() {
  clearTimer();
  timeLeft = TIME_PER_QUESTION;
  timerEl.textContent = timeLeft;
  timerEl.classList.remove("timer-low");

  timerId = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;

    // visual urgency
    if (timeLeft <= 5) timerEl.classList.add("timer-low");

    if (timeLeft <= 0) {
      clearTimer();
      handleTimeout();
    }
  }, 1000);
}

function clearTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  timerEl.classList.remove("timer-low");
}

function lockOptions() {
  [...optionsEl.children].forEach(opt => (opt.style.pointerEvents = "none"));
}

function unlockOptions() {
  [...optionsEl.children].forEach(opt => (opt.style.pointerEvents = "auto"));
}

// ---------- Render ----------
function loadQuestion(index) {
  hasSelected = false;
  nextBtn.disabled = true;
  nextBtn.classList.add("btn-disabled");

  updateProgress();

  const q = quizData[index];
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

// ---------- Interactions ----------
function handleSelect(li, index) {
  if (hasSelected) return;
  hasSelected = true;
  clearTimer();
  lockOptions();

  const correctIdx = quizData[currentQuestionIndex].answer;
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
  if (hasSelected) return; // already answered
  hasSelected = true;
  lockOptions();

  const correctIdx = quizData[currentQuestionIndex].answer;
  // Show only the correct one if time is up
  optionsEl.children[correctIdx].classList.add("correct");

  nextBtn.disabled = false;
  nextBtn.classList.remove("btn-disabled");
}

nextBtn.addEventListener("click", () => {
  currentQuestionIndex++;
  if (currentQuestionIndex < quizData.length) {
    loadQuestion(currentQuestionIndex);
  } else {
    showResults();
  }
});

function showResults() {
  clearTimer();
  quizBox.style.display = "none";
  resultBox.style.display = "flex";

  const total = quizData.length;
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
  currentQuestionIndex = 0;
  score = 0;
  quizBox.style.display = "flex";
  resultBox.style.display = "none";
  loadQuestion(0);
});

// ---------- boot ----------
loadQuestion(0);
