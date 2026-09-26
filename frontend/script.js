/* =========================================
J.A.R.V.I.S MOBILE EDITION
Gemini API Test Version
========================================= */

/* =========================
ELEMENTS
========================= */

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const micBtn = document.getElementById("mic-btn");
const sendBtn = document.getElementById("send");

/* =========================
API KEY
========================= */

let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
API_KEY = prompt("Enter your Gemini API Key:");

if (API_KEY) {
API_KEY = API_KEY.trim();
localStorage.setItem("jarvis_key", API_KEY);
}
}

/* =========================
MODELS
========================= */

const MODELS = [
"gemini-3.6-flash",
"gemini-flash-latest"
];

/* =========================
GEMINI API
========================= */

async function callGemini(promptText) {

if (!API_KEY) {
throw new Error("No Gemini API key entered.");
}

let lastError = "Unknown Gemini error.";

for (const model of MODELS) {

try {

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    model +
    ":generateContent?key=" +
    encodeURIComponent(API_KEY);

  const response = await fetch(url, {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text:
                "You are J.A.R.V.I.S., a helpful mobile AI assistant. " +
                "Answer clearly and naturally.\n\nUser: " +
                promptText
            }
          ]
        }
      ]
    })
  });

  const data = await response.json();

  /* HTTP ERROR */

  if (!response.ok) {

    const message =
      data?.error?.message ||
      `HTTP ${response.status}`;

    lastError = message;

    /* Invalid key = stop immediately */

    if (
      /api key|api_key|invalid.*key|key.*invalid|authentication|unauthorized/i
        .test(message)
    ) {
      throw new Error(
        "Gemini API key is invalid. Check your key and try again."
      );
    }

    /* Other errors = try next model */

    continue;
  }

  /* Gemini API ERROR */

  if (data.error) {

    lastError = data.error.message || "Gemini API error.";

    continue;
  }

  /* RESPONSE CHECK */

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error(
      "Gemini returned an empty response."
    );
  }

  return text;

} catch (error) {

  lastError = error.message || String(error);

  /*
   * Do not retry an invalid API key
   */

  if (
    /API key is invalid/i.test(lastError)
  ) {
    throw error;
  }
}

}

throw new Error(lastError);
}

/* =========================
ASK JARVIS
========================= */

async function askGemini(promptText) {

add(
"J.A.R.V.I.S: Thinking...",
"ai"
);

try {

const reply =
  await callGemini(promptText);

if (chat && chat.lastChild) {

  chat.lastChild.innerText =
    "J.A.R.V.I.S: " + reply;
}

speak(reply);

} catch (error) {

console.error("Gemini error:", error);

if (chat && chat.lastChild) {

  chat.lastChild.innerText =
    "J.A.R.V.I.S: ERROR - " +
    error.message;
}

}
}

/* =========================
ADD MESSAGE
========================= */

function add(text, type) {

if (!chat) return;

const div =
document.createElement("div");

div.className =
"msg " + type;

div.innerText = text;

chat.appendChild(div);

chat.scrollTop =
chat.scrollHeight;
}

/* =========================
SEND MESSAGE
========================= */

function sendMessage() {

if (!input) return;

const text =
input.value.trim();

if (!text) return;

add(
"YOU: " + text,
"user"
);

input.value = "";

askGemini(text);
}

/* =========================
SEND BUTTON
========================= */

if (sendBtn) {

sendBtn.addEventListener(
"click",
sendMessage
);
}

/* =========================
ENTER KEY
========================= */

if (input) {

input.addEventListener(
"keydown",
function (event) {

  if (event.key === "Enter") {

    event.preventDefault();

    sendMessage();
  }
}

);
}

/* =========================
MICROPHONE
========================= */

const SpeechRecognition =
window.SpeechRecognition ||
window.webkitSpeechRecognition;

if (SpeechRecognition && micBtn) {

const recognition =
new SpeechRecognition();

recognition.lang = "en-US";

recognition.continuous = false;

recognition.interimResults = false;

recognition.onstart = function () {

micBtn.innerText =
  "🔴";

micBtn.classList.add(
  "listening"
);

};

recognition.onresult =
function (event) {

  const text =
    event.results[0][0].transcript;

  input.value = text;

  sendMessage();
};

recognition.onerror =
function (event) {

  console.error(
    "Speech error:",
    event.error
  );

  micBtn.innerText =
    "🎙️";
};

recognition.onend =
function () {

  micBtn.innerText =
    "🎙️";

  micBtn.classList.remove(
    "listening"
  );
};

micBtn.addEventListener(
"click",
function () {

  try {
    recognition.start();
  } catch (error) {
    console.log(
      "Recognition already running."
    );
  }
}

);
}

/* =========================
TEXT TO SPEECH
========================= */

let voices = [];

function loadVoices() {

if (
!("speechSynthesis" in window)
) {
return;
}

voices =
window.speechSynthesis.getVoices();
}

function speak(text) {

if (
!("speechSynthesis" in window) ||
!text
) {
return;
}

window.speechSynthesis.cancel();

const utterance =
new SpeechSynthesisUtterance(text);

utterance.lang =
"en-US";

utterance.rate =
1.0;

utterance.pitch =
0.85;

utterance.volume =
1.0;

const voice =
voices.find(
v =>
v.lang &&
v.lang.toLowerCase()
.startsWith("en")
);

if (voice) {
utterance.voice = voice;
}

window.speechSynthesis.speak(
utterance
);
}

if ("speechSynthesis" in window) {

loadVoices();

window.speechSynthesis
.addEventListener(
"voiceschanged",
loadVoices
);
}

/* =========================
STARTUP
========================= */

window.addEventListener(
"load",
function () {

setTimeout(
  function () {

    add(
      "J.A.R.V.I.S: Systems online. Gemini interface ready, Boss.",
      "ai"
    );

  },
  500
);

}
);
