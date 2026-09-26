// ============================================================
// J.A.R.V.I.S. MOBILE EDITION
// Gemini AI + Memory + Voice + Vision
// ============================================================


// ============================================================
// 1. GEMINI API KEY
// ============================================================

let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
  API_KEY = prompt("Enter your Gemini API Key:");

  if (API_KEY) {
    API_KEY = API_KEY.trim();
    localStorage.setItem("jarvis_key", API_KEY);
  }
}


// ============================================================
// 2. GEMINI MODELS
// ============================================================

const MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash"
];


// ============================================================
// 3. DOM ELEMENTS
// ============================================================

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");

const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");

const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");


// ============================================================
// 4. MEMORY
// ============================================================

let MEMORY = [];

try {
  MEMORY = JSON.parse(
    localStorage.getItem("jarvis_memory") || "[]"
  );

  if (!Array.isArray(MEMORY)) {
    MEMORY = [];
  }
} catch (error) {
  console.error("Memory load error:", error);
  MEMORY = [];
}


function saveMemory() {
  localStorage.setItem(
    "jarvis_memory",
    JSON.stringify(MEMORY)
  );
}


// ============================================================
// 5. CHAT UI
// ============================================================

function add(text, type) {
  const message = document.createElement("div");

  message.className = "msg " + type;
  message.innerText = text;

  chat.appendChild(message);

  chat.scrollTop = chat.scrollHeight;

  return message;
}


// ============================================================
// 6. RESTORE MEMORY
// ============================================================

MEMORY.forEach((message) => {

  if (
    !message ||
    !message.role ||
    !message.text
  ) {
    return;
  }

  const prefix =
    message.role === "user"
      ? "YOU: "
      : "J.A.R.V.I.S: ";

  const type =
    message.role === "user"
      ? "user"
      : "ai";

  add(
    prefix + message.text,
    type
  );
});


// ============================================================
// 7. GEMINI REQUEST
// ============================================================

async function callGemini(prompt) {

  if (!API_KEY) {
    throw new Error(
      "Gemini API key is missing."
    );
  }


  // Use recent conversation.
  const contents = MEMORY
    .slice(-12)
    .map((message) => ({
      role:
        message.role === "model"
          ? "model"
          : "user",

      parts: [
        {
          text: String(message.text)
        }
      ]
    }));


  // Current user request.
  contents.push({
    role: "user",

    parts: [
      {
        text: prompt
      }
    ]
  });


  let lastError = null;


  for (const model of MODELS) {

    try {

      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        model +
        ":generateContent";


      const response = await fetch(
        url,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-goog-api-key":
              API_KEY
          },

          body: JSON.stringify({
            contents: contents,

            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024
            }
          })
        }
      );


      const data =
        await response.json();


      if (!response.ok || data.error) {

        const errorMessage =
          data?.error?.message ||
          `HTTP ${response.status}`;

        lastError =
          new Error(errorMessage);


        // Try fallback model.
        if (
          /high demand|temporar|quota|rate|unavailable|not found|deprecated/i
            .test(errorMessage)
        ) {
          continue;
        }

        throw lastError;
      }


      const reply =
        data?.candidates?.[0]
          ?.content?.parts
          ?.map(
            part => part.text || ""
          )
          .join("")
          .trim();


      if (!reply) {
        throw new Error(
          "Gemini returned an empty response."
        );
      }


      return reply;

    } catch (error) {

      console.error(
        "Gemini request:",
        error
      );

      lastError = error;
    }
  }


  throw (
    lastError ||
    new Error(
      "Gemini request failed."
    )
  );
}


// ============================================================
// 8. ASK GEMINI
// ============================================================

async function askGemini(prompt) {

  const thinkingMessage =
    add(
      "J.A.R.V.I.S: Thinking...",
      "ai"
    );


  try {

    const reply =
      await callGemini(prompt);


    // Save user message.
    MEMORY.push({
      role: "user",
      text: prompt
    });


    // Save AI message.
    MEMORY.push({
      role: "model",
      text: reply
    });


    // Limit memory size.
    if (MEMORY.length > 40) {
      MEMORY =
        MEMORY.slice(-40);
    }


    saveMemory();


    thinkingMessage.innerText =
      "J.A.R.V.I.S: " + reply;


    speak(reply);

  } catch (error) {

    console.error(
      "J.A.R.V.I.S error:",
      error
    );


    thinkingMessage.innerText =
      "J.A.R.V.I.S: ERROR - " +
      (
        error.message ||
        "Unknown error"
      );
  }
}


// ============================================================
// 9. SEND MESSAGE
// ============================================================

async function sendMessage() {

  const text =
    input.value.trim();


  if (!text) {
    return;
  }


  add(
    "YOU: " + text,
    "user"
  );


  input.value = "";


  await askGemini(text);
}


if (sendBtn) {

  sendBtn.addEventListener(
    "click",
    sendMessage
  );
}


// ============================================================
// 10. ENTER KEY
// ============================================================

if (input) {

  input.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        sendMessage();
      }
    }
  );
}


// ============================================================
// 11. CAMERA BUTTON
// ============================================================

if (camBtn && imgInput) {

  camBtn.addEventListener(
    "click",
    () => {
      imgInput.click();
    }
  );


  imgInput.addEventListener(
    "change",
    () => {

      const file =
        imgInput.files?.[0];


      if (!file) {
        return;
      }


      if (
        !file.type.startsWith("image/")
      ) {

        add(
          "J.A.R.V.I.S: Please select an image.",
          "ai"
        );

        return;
      }


      const reader =
        new FileReader();


      reader.onload = () => {

        if (
          typeof reader.result !==
          "string"
        ) {
          return;
        }


        const base64 =
          reader.result.split(",")[1];


        const question =
          input.value.trim() ||
          "What do you see in this image? Describe it briefly.";


        add(
          "YOU: [IMAGE] " +
          question,
          "user"
        );


        input.value = "";


        askVision(
          base64,
          file.type,
          question
        );
      };


      reader.onerror = () => {

        add(
          "J.A.R.V.I.S: Could not read the image.",
          "ai"
        );
      };


      reader.readAsDataURL(file);


      // Allow the same image to be selected again.
      imgInput.value = "";
    }
  );
}


// ============================================================
// 12. GEMINI VISION
// ============================================================

async function askVision(
  base64,
  mimeType,
  question
) {

  const visionMessage =
    add(
      "J.A.R.V.I.S: Analyzing image...",
      "ai"
    );


  if (!API_KEY) {

    visionMessage.innerText =
      "J.A.R.V.I.S: ERROR - API key missing.";

    return;
  }


  let lastError = null;


  for (const model of MODELS) {

    try {

      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        model +
        ":generateContent";


      const response =
        await fetch(
          url,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-goog-api-key":
                API_KEY
            },

            body: JSON.stringify({

              contents: [

                {
                  role: "user",

                  parts: [

                    {
                      text: question
                    },

                    {
                      inline_data: {
                        mime_type:
                          mimeType,

                        data:
                          base64
                      }
                    }

                  ]
                }

              ],

              generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 1024
              }

            })
          }
        );


      const data =
        await response.json();


      if (
        !response.ok ||
        data.error
      ) {

        const errorMessage =
          data?.error?.message ||
          `HTTP ${response.status}`;


        lastError =
          new Error(errorMessage);


        if (
          /high demand|temporar|quota|rate|unavailable|not found|deprecated/i
            .test(errorMessage)
        ) {
          continue;
        }


        throw lastError;
      }


      const reply =
        data?.candidates?.[0]
          ?.content?.parts
          ?.map(
            part => part.text || ""
          )
          .join("")
          .trim();


      if (!reply) {

        throw new Error(
          "Gemini returned no vision response."
        );
      }


      visionMessage.innerText =
        "J.A.R.V.I.S: " + reply;


      // Save image conversation as text.
      MEMORY.push({
        role: "user",
        text:
          "[IMAGE] " +
          question
      });


      MEMORY.push({
        role: "model",
        text: reply
      });


      if (MEMORY.length > 40) {
        MEMORY =
          MEMORY.slice(-40);
      }


      saveMemory();


      speak(reply);

      return;

    } catch (error) {

      console.error(
        "Vision error:",
        error
      );

      lastError = error;
    }
  }


  visionMessage.innerText =
    "J.A.R.V.I.S: ERROR - " +
    (
      lastError?.message ||
      "Vision request failed."
    );
}


// ============================================================
// 13. SPEECH RECOGNITION
// ============================================================

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


let recognition = null;


if (SpeechRecognition) {

  recognition =
    new SpeechRecognition();


  recognition.lang =
    "en-US";


  recognition.continuous =
    false;


  recognition.interimResults =
    false;


  recognition.maxAlternatives =
    1;


  recognition.onstart =
    () => {

      micBtn.innerText =
        "LISTENING...";

      micBtn.classList.add(
        "listening"
      );
    };


  recognition.onresult =
    (event) => {

      const transcript =
        event.results?.[0]?.[0]
          ?.transcript
          ?.trim();


      if (!transcript) {
        return;
      }


      input.value =
        transcript;


      sendMessage();
    };


  recognition.onerror =
    (event) => {

      console.error(
        "Speech error:",
        event.error
      );


      if (
        event.error ===
        "not-allowed"
      ) {

        add(
          "J.A.R.V.I.S: Microphone permission denied.",
          "ai"
        );

      } else if (
        event.error !==
        "aborted"
      ) {

        add(
          "J.A.R.V.I.S: Voice recognition error.",
          "ai"
        );
      }
    };


  recognition.onend =
    () => {

      micBtn.innerText =
        "🎙️";

      micBtn.classList.remove(
        "listening"
      );
    };


  micBtn.addEventListener(
    "click",
    () => {

      try {

        recognition.start();

      } catch (error) {

        console.log(
          "Recognition already running."
        );
      }
    }
  );

} else {

  micBtn.addEventListener(
    "click",
    () => {

      add(
        "J.A.R.V.I.S: Voice recognition is not supported by this browser.",
        "ai"
      );
    }
  );
}


// ============================================================
// 14. TEXT TO SPEECH
// ============================================================

let voices = [];


function loadVoices() {

  if (
    "speechSynthesis" in window
  ) {

    voices =
      speechSynthesis.getVoices();
  }
}


if (
  "speechSynthesis" in window
) {

  loadVoices();

  speechSynthesis.onvoiceschanged =
    loadVoices;
}


function speak(text) {

  if (
    !("speechSynthesis" in window)
  ) {
    return;
  }


  if (!text) {
    return;
  }


  speechSynthesis.cancel();


  const utterance =
    new SpeechSynthesisUtterance(
      text
    );


  utterance.rate =
    1.05;


  utterance.pitch =
    0.85;


  utterance.volume =
    1;


  const voice =
    voices.find(
      v => v.lang === "en-US"
    ) ||
    voices.find(
      v => v.lang.startsWith("en")
    );


  if (voice) {
    utterance.voice =
      voice;
  }


  speechSynthesis.speak(
    utterance
  );
}


// ============================================================
// 15. CLEAR MEMORY
// ============================================================

if (clearBtn) {

  clearBtn.addEventListener(
    "click",
    () => {

      const confirmed =
        confirm(
          "Clear J.A.R.V.I.S memory?"
        );


      if (!confirmed) {
        return;
      }


      MEMORY = [];


      saveMemory();


      chat.innerHTML = "";


      add(
        "SYSTEM: Memory cleared.",
        "ai"
      );
    }
  );
}


// ============================================================
// 16. API KEY RESET
// ============================================================

// You can reset the saved key from
// browser console with:
//
// localStorage.removeItem("jarvis_key");
// location.reload();


// ============================================================
// 17. STARTUP
// ============================================================

console.log(
  "================================"
);

console.log(
  "J.A.R.V.I.S Mobile Edition"
);

console.log(
  "AI CORE: ONLINE"
);

console.log(
  "Gemini Models:",
  MODELS
);

console.log(
  "Voice Recognition:",
  SpeechRecognition
    ? "SUPPORTED"
    : "NOT SUPPORTED"
);

console.log(
  "Vision:",
  camBtn && imgInput
    ? "READY"
    : "NOT AVAILABLE"
);

console.log(
  "================================"
);
