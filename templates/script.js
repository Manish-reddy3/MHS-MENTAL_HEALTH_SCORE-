const API_URL = "http://127.0.0.1:2200/predict";

// ---- Adjust this to match your model's actual output scale ----
const SCORE_MIN = 0;
const SCORE_MAX = 10;
const CLASSES = [
  { max: 3.3, label: "Struggling",   color: "#D9534F", note: "Signals suggest a lot of strain right now. Consider reaching out to a counselor or someone you trust." },
  { max: 6.6, label: "Holding steady", color: "#E3B341", note: "A mixed picture — some habits are supporting you, others may be worth adjusting." },
  { max: 10.01, label: "Thriving",   color: "#1D4E68", note: "Your current rhythm looks well-balanced across sleep, activity and stress." },
];

const sliders = [
  ["usage", "usage-out", 1], ["unlocks", "unlocks-out", 0], ["study", "study-out", 1],
  ["activity", "activity-out", 1], ["sleep", "sleep-out", 1],
];
sliders.forEach(([inputId, outId, decimals]) => {
  const input = document.getElementById(inputId);
  const out = document.getElementById(outId);
  const sync = () => { out.textContent = Number(input.value).toFixed(decimals); };
  input.addEventListener("input", sync);
  sync();
});

const form = document.getElementById("mhs-form");
const submitBtn = document.getElementById("submit-btn");
const idleView = document.getElementById("result-idle");
const bodyView = document.getElementById("result-body");
const errorView = document.getElementById("result-error");
const loadingView = document.getElementById("result-loading");
const errorBody = document.getElementById("error-body");
const traceLine = document.getElementById("trace-line");
const scoreEl = document.getElementById("gauge-score");
const classificationEl = document.getElementById("result-classification");
const noteEl = document.getElementById("result-note");

function showView(view) {
  [idleView, bodyView, errorView, loadingView].forEach(v => v.hidden = (v !== view));
}

function classify(score) { return CLASSES.find(c => score <= c.max) || CLASSES[CLASSES.length - 1]; }

// build a jittery line that settles flat at the target height — an ECG-style trace
function buildTracePoints(fraction) {
  const targetY = 70 - fraction * 55; // higher score -> higher (smaller y)
  const points = [];
  const settlePoint = 380;
  for (let x = 0; x <= 600; x += 10) {
    let y;
    if (x < settlePoint) {
      const decay = 1 - x / settlePoint;
      y = 40 + Math.sin(x / 18) * 22 * decay + (Math.random() - 0.5) * 6 * decay;
    } else {
      y = targetY;
    }
    points.push(`${x},${y.toFixed(1)}`);
  }
  return points.join(" ");
}

function renderResult(score) {
  const clamped = Math.max(SCORE_MIN, Math.min(SCORE_MAX, score));
  const fraction = (clamped - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
  const bucket = classify(clamped);

  traceLine.setAttribute("points", buildTracePoints(fraction));
  traceLine.setAttribute("stroke", bucket.color);
  scoreEl.textContent = clamped.toFixed(1);
  scoreEl.style.color = bucket.color;
  classificationEl.textContent = bucket.label;
  classificationEl.style.color = bucket.color;
  noteEl.textContent = bucket.note;

  showView(bodyView);
}

function buildPayload() {
  const data = new FormData(form);
  return {
    Age: Number(data.get("Age")), Gender: data.get("Gender"), Country: data.get("Country"),
    Academic_Level: data.get("Academic_Level"), Most_Used_Platform: data.get("Most_Used_Platform"),
    Purpose_Of_Use: data.get("Purpose_Of_Use"), Avg_Daily_Usage_Hours: Number(data.get("Avg_Daily_Usage_Hours")),
    Daily_Unlocks: Number(data.get("Daily_Unlocks")), Study_Hours: Number(data.get("Study_Hours")),
    Physical_Activity_Hours: Number(data.get("Physical_Activity_Hours")),
    Sleep_Hours_Per_Night: Number(data.get("Sleep_Hours_Per_Night")), Stress_Level: data.get("Stress_Level"),
  };
}

async function submitAssessment(e) {
  e.preventDefault();
  submitBtn.disabled = true;
  showView(loadingView);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(API_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()), signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `Request failed with status ${response.status}`);
    }
    const result = await response.json();
    renderResult(Number(result.predicted_class));
  } catch (err) {
    errorBody.textContent = err.name === "AbortError"
      ? "The server didn't respond in time. Make sure it's running at 127.0.0.1:2200."
      : (err.message && err.message.length < 160 ? err.message : "Make sure the FastAPI server is running at 127.0.0.1:2200.");
    showView(errorView);
  } finally {
    clearTimeout(timeout);
    submitBtn.disabled = false;
  }
}

form.addEventListener("submit", submitAssessment);
document.getElementById("reset-btn").addEventListener("click", () => showView(idleView));
document.getElementById("error-retry").addEventListener("click", () => showView(idleView));
