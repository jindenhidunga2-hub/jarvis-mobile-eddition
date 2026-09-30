// ============================================================
// J.A.R.V.I.S — COMPLETE MOBILE AI ASSISTANT
// Gemini + Memory + Voice + Microphone + Camera + Tools
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
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-flash-latest"
];


// ============================================================
// 3. MEMORY
// ============================================================

let MEMORY = [];

try {
  const storedMemory = JSON.parse(
    localStorage.getItem("jarvis_memory") || "[]"
  );

  if (Array.isArray(storedMemory)) {

    MEMORY = storedMemory.filter(
      m =>
        m &&
        (m.role === "user" || m.role === "model") &&
        typeof m.text === "string" &&
        !(
          m.role === "model" &&
          /^(?:Your strong password:|ఇదిగో strong password:)/i.test(m.text)
        )
    );

    if (MEMORY.length !== storedMemory.length) {
      localStorage.setItem(
        "jarvis_memory",
        JSON.stringify(MEMORY)
      );
    }

  } else {

    localStorage.removeItem("jarvis_memory");

  }

} catch (error) {

  console.warn("Memory reset:", error);
  localStorage.removeItem("jarvis_memory");

}


function saveMemory() {

  try {
    localStorage.setItem(
      "jarvis_memory",
      JSON.stringify(MEMORY)
    );
  } catch (error) {
    console.warn("Unable to save memory:", error);
  }

}


function addMemory(role, text) {

  if (!text) return;

  MEMORY.push({
    role: role,
    text: String(text)
  });

  // Keep memory from becoming too large
  if (MEMORY.length > 100) {
    MEMORY = MEMORY.slice(-100);
  }

  saveMemory();
}


// ============================================================
// 4. DOM ELEMENTS
// ============================================================

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");
const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");
const sendBtn = document.getElementById("send");


// ============================================================
// 5. CHAT DISPLAY
// ============================================================

function add(message, type = "ai") {

  if (!chat) return;

  const div = document.createElement("div");

  div.className =
    type === "user"
      ? "message user"
      : "message ai";

  div.textContent = message;

  chat.appendChild(div);

  chat.scrollTop = chat.scrollHeight;

  return div;
}


// ============================================================
// 6. RESTORE MEMORY TO CHAT
// ============================================================

if (chat) {

  MEMORY.forEach(m => {

    const prefix =
      m.role === "user"
        ? "YOU: "
        : "J.A.R.V.I.S: ";

    add(
      prefix + m.text,
      m.role === "user" ? "user" : "ai"
    );

  });

}


// ============================================================
// 7. FETCH HELPER
// ============================================================

async function fetchToolJson(
  url,
  options = {},
  timeoutMs = 10000
) {

  const controller =
    typeof AbortController === "function"
      ? new AbortController()
      : null;

  const timeoutId =
    controller
      ? setTimeout(
          () => controller.abort(),
          timeoutMs
        )
      : null;

  try {

    const response = await fetch(url, {
      ...options,
      ...(controller
        ? { signal: controller.signal }
        : {})
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    return await response.json();

  } finally {

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

  }

}


// ============================================================
// 8. J.A.R.V.I.S TOOLS
// ============================================================

async function handleTools(text) {

  const original = String(text || "");
  const t = original.trim();

  // ----------------------------------------------------------
  // YouTube
  // ----------------------------------------------------------

  if (
    /^(?:please\s+)?(?:open\s+youtube|youtube\s+open|youtube)\s*[.!?]*$/i
      .test(t)
  ) {

    window.open(
      "https://www.youtube.com/",
      "_blank",
      "noopener,noreferrer"
    );

    return "Opening YouTube, Boss.";

  }


  // ----------------------------------------------------------
  // Google
  // ----------------------------------------------------------

  if (
    /^(?:please\s+)?(?:open\s+google|google\s+open|google)\s*[.!?]*$/i
      .test(t)
  ) {

    window.open(
      "https://www.google.com/",
      "_blank",
      "noopener,noreferrer"
    );

    return "Opening Google, Boss.";

  }


  // ----------------------------------------------------------
  // Open URL
  // ----------------------------------------------------------

  const urlCommand = t.match(
    /^(?:open|visit|go to)\s+(https?:\/\/\S+)\s*$/i
  );

  if (urlCommand) {

    try {

      const destination =
        new URL(urlCommand[1]);

      if (
        destination.protocol !== "https:" &&
        destination.protocol !== "http:"
      ) {

        return "Only HTTP and HTTPS links can be opened.";

      }

      window.open(
        destination.href,
        "_blank",
        "noopener,noreferrer"
      );

      return (
        "Opening " +
        destination.hostname +
        ", Boss."
      );

    } catch (error) {

      return "That link does not look valid.";

    }

  }


  // ----------------------------------------------------------
  // Google Search
  // ----------------------------------------------------------

  if (
    /^(?:google\s+search|search\s+(?:on\s+)?google)(?:\s+for)?\s*$/i
      .test(t)
  ) {

    return "Tell me what to search for on Google.";

  }


  const googleSearch = t.match(
    /^(?:google\s+search|search\s+(?:on\s+)?google)(?:\s+for)?\s+(.+?)\s*$/i
  );

  if (googleSearch) {

    const query =
      googleSearch[1].trim();

    if (!query) {
      return "Tell me what to search for on Google.";
    }

    window.open(
      "https://www.google.com/search?q=" +
      encodeURIComponent(query),
      "_blank",
      "noopener,noreferrer"
    );

    return (
      "Searching Google for " +
      query +
      ", Boss."
    );

  }


  // ----------------------------------------------------------
  // YouTube Search / Play
  // ----------------------------------------------------------

  const playMatch = t.match(
    /^play\s+(.+?)\s*$/i
  );

  const youtubeMatch = t.match(
    /^youtube(?:\s+search)?(?:\s+for)?\s+(.+?)\s*$/i
  );

  const searchYoutubeMatch = t.match(
    /^search\s+(?:on\s+)?youtube(?:\s+for)?\s+(.+?)\s*$/i
  );

  const videoQuery =
    (
      playMatch ||
      youtubeMatch ||
      searchYoutubeMatch
    )?.[1]?.trim();

  if (videoQuery) {

    window.open(
      "https://www.youtube.com/results?search_query=" +
      encodeURIComponent(videoQuery),
      "_blank",
      "noopener,noreferrer"
    );

    return (
      "Searching YouTube for " +
      videoQuery +
      ", Boss."
    );

  }


  // ----------------------------------------------------------
  // Wikipedia Search
  // ----------------------------------------------------------

  const searchMatch = t.match(
    /^(?:search|look up)\s+(?:for\s+)?(.+?)\s*$/i
  );

  if (searchMatch) {

    const query =
      searchMatch[1].trim();

    if (!query) {
      return "Tell me what to search for.";
    }

    try {

      const url =
        "https://en.wikipedia.org/w/api.php" +
        "?action=query" +
        "&list=search" +
        "&srlimit=1" +
        "&srsearch=" +
        encodeURIComponent(query) +
        "&format=json" +
        "&origin=*";

      const data =
        await fetchToolJson(url);

      const result =
        data?.query?.search?.[0];

      if (!result) {
        return "I could not find that, Boss.";
      }

      const snippet =
        String(result.snippet || "")
          .replace(/<[^>]*>/g, "")
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">");

      return (
        "Wikipedia: " +
        result.title +
        (snippet
          ? ". " + snippet
          : "")
      );

    } catch (error) {

      console.error(error);

      return "Search error, Boss.";

    }

  }


  // ----------------------------------------------------------
  // Current time
  // ----------------------------------------------------------

  if (
    /^(?:what(?:'s| is)?\s+)?(?:the\s+)?time(?:\s+is\s+it)?[?.!]*$/i
      .test(t)
  ) {

    return (
      "The current time is " +
      new Date().toLocaleTimeString()
    );

  }


  return null;
}


// ============================================================
// 9. AGENT MODE
// ============================================================

const AGENT_TOOLS = Object.freeze({

  time: async () =>
    handleTools("current time"),

  weather: async () =>
    handleTools("weather"),

  news: async () =>
    handleTools("news"),

  crypto: async () =>
    handleTools("bitcoin")

});


const AGENT_TOOL_NAMES = Object.freeze({

  time: "time",

  weather: "weather",

  news: "news",

  crypto: "crypto"

});


function isAgentModeRequest(text = "") {

  const value =
    String(text || "");

  if (
    /\b(?:agent(?:\s+mode)?|run\s+(?:the\s+)?agent|use\s+(?:the\s+)?agent)\b/i
      .test(value)
  ) {

    return true;

  }

  if (
    /\b(?:briefing|research|analy[sz]e|analysis)\b/i
      .test(value)
  ) {

    return true;

  }

  return (
    /\bplan\b/i.test(value) &&
    /\b(?:time|weather|news|crypto|bitcoin|btc)\b/i
      .test(value)
  );

}


function fallbackAgentToolPlan(goal) {

  const text =
    String(goal || "").toLowerCase();

  const tools = [];

  if (
    /\btime\b|\bcurrent time\b/.test(text)
  ) {
    tools.push("time");
  }

  if (
    /\bweather\b|\btemperature\b/.test(text)
  ) {
    tools.push("weather");
  }

  if (
    /\bnews\b|\bheadline\b|\bheadlines\b/.test(text)
  ) {
    tools.push("news");
  }

  if (
    /\bcrypto\b|\bbitcoin\b|\bbtc\b/.test(text)
  ) {
    tools.push("crypto");
  }

  return tools;
}


function parseAgentToolPlan(responseText) {

  const text =
    String(responseText || "")
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

  const start =
    text.indexOf("[");

  const end =
    text.lastIndexOf("]");

  if (
    start < 0 ||
    end < start
  ) {

    throw new Error(
      "Agent plan format incorrect."
    );

  }

  const parsed =
    JSON.parse(
      text.slice(
        start,
        end + 1
      )
    );

  const allowed =
    new Set(
      Object.keys(AGENT_TOOLS)
    );

  return [
    ...new Set(
      parsed
        .filter(
          item =>
            typeof item === "string"
        )
        .map(
          item =>
            item.trim().toLowerCase()
        )
        .filter(
          item =>
            allowed.has(item)
        )
    )
  ];

}


async function runAgent(goal) {

  add(
    "J.A.R.V.I.S: Agent mode active.",
    "ai"
  );

  add(
    "J.A.R.V.I.S: Goal analyze chesthunna...",
    "ai"
  );

  const planPrompt =
    `Select tools from ["time","weather","news","crypto"].
Goal: ${JSON.stringify(String(goal))}
Return ONLY a JSON array.`;

  let toolsToRun;

  try {

    toolsToRun =
      parseAgentToolPlan(
        await callGeminiRaw(planPrompt)
      );

  } catch (error) {

    console.warn(
      "Agent planner fallback:",
      error
    );

    toolsToRun =
      fallbackAgentToolPlan(goal);

  }


  const results = {};

  for (
    let i = 0;
    i < toolsToRun.length;
    i++
  ) {

    const tool =
      toolsToRun[i];

    add(
      `J.A.R.V.I.S: [${i + 1}/${toolsToRun.length}] ${AGENT_TOOL_NAMES[tool]} tool run chesthunna...`,
      "ai"
    );

    try {

      results[tool] =
        await AGENT_TOOLS[tool]();

    } catch (error) {

      console.error(error);

      results[tool] =
        "Tool error";

    }

  }


  if (
    toolsToRun.length === 0
  ) {

    return await callGemini(
      `Answer this request normally: ${goal}`
    );

  }


  add(
    "J.A.R.V.I.S: Results combine chesthunna...",
    "ai"
  );


  const summaryPrompt =
    `Goal: ${JSON.stringify(String(goal))}

Tool results:
${JSON.stringify(results)}

Give a concise Telugu/English summary.`;

  return await callGemini(
    summaryPrompt
  );

}


// ============================================================
// 10. GEMINI RAW REQUEST
// ============================================================

async function callGeminiRaw(prompt) {

  if (!API_KEY) {

    throw new Error(
      "Gemini API key is missing."
    );

  }


  let lastError =
    "Gemini request failed.";


  for (const model of MODELS) {

    try {

      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        model +
        ":generateContent?key=" +
        encodeURIComponent(API_KEY);


      const response =
        await fetch(url, {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            contents: [

              {
                role: "user",

                parts: [
                  {
                    text: String(prompt)
                  }
                ]

              }

            ]

          })

        });


      const data =
        await response.json();


      if (!response.ok) {

        lastError =
          data?.error?.message ||
          `HTTP ${response.status}`;

        console.warn(
          `${model}: ${lastError}`
        );

        continue;

      }


      const text =
        data
          ?.candidates?.[0]
          ?.content?.parts
          ?.map(
            part =>
              part.text || ""
          )
          .join("")
          .trim();


      if (text) {

        return text;

      }


      lastError =
        `${model}: Empty response.`;

    } catch (error) {

      lastError =
        `${model}: ${error.message}`;

      console.warn(lastError);

    }

  }


  throw new Error(
    lastError
  );

}


// ============================================================
// 11. GEMINI BRAIN + MEMORY
// ============================================================

async function callGemini(prompt) {

  if (!API_KEY) {

    throw new Error(
      "Gemini API key is missing."
    );

  }


  const contents =
    MEMORY
      .slice(-12)
      .map(m => ({

        role: m.role,

        parts: [
          {
            text: m.text
          }
        ]

      }));


  contents.push({

    role: "user",

    parts: [
      {
        text: String(prompt)
      }
    ]

  });


  let lastError =
    "Gemini request failed.";


  for (const model of MODELS) {

    try {

      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        model +
        ":generateContent?key=" +
        encodeURIComponent(API_KEY);


      const response =
        await fetch(url, {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            systemInstruction: {

              parts: [
                {
                  text:
                    "You are J.A.R.V.I.S, a helpful personal AI assistant. " +
                    "Be concise, useful and natural. " +
                    "You may respond in English or Telugu when appropriate."
                }
              ]

            },

            contents: contents

          })

        });


      const data =
        await response.json();


      if (!response.ok) {

        lastError =
          data?.error?.message ||
          `HTTP ${response.status}`;

        console.warn(
          `${model}: ${lastError}`
        );

        continue;

      }


      const answer =
        data
          ?.candidates?.[0]
          ?.content?.parts
          ?.map(
            part =>
              part.text || ""
          )
          .join("")
          .trim();


      if (answer) {

        return answer;

      }


      lastError =
        `${model}: Empty response.`;

    } catch (error) {

      lastError =
        `${model}: ${error.message}`;

      console.warn(lastError);

    }

  }


  throw new Error(
    lastError
  );

}


// ============================================================
// 12. MAIN MESSAGE PROCESSOR
// ============================================================

async function processMessage(text) {

  const message =
    String(text || "").trim();

  if (!message) return;


  // Show user message
  add(
    "YOU: " + message,
    "user"
  );


  addMemory(
    "user",
    message
  );


  // ----------------------------------------------------------
  // Agent mode
  // ----------------------------------------------------------

  if (
    isAgentModeRequest(message)
  ) {

    try {

      const response =
        await runAgent(message);

      if (response) {

        add(
          "J.A.R.V.I.S: " +
          response,
          "ai"
        );

        addMemory(
          "model",
          response
        );

        speak(response);

      }

    } catch (error) {

      console.error(error);

      const errorMessage =
        "ERROR: " +
        error.message;

      add(
        "J.A.R.V.I.S: " +
        errorMessage,
        "ai"
      );

    }

    return;

  }


  // ----------------------------------------------------------
  // Local tools
  // ----------------------------------------------------------

  try {

    const toolResult =
      await handleTools(message);

    if (toolResult) {

      add(
        "J.A.R.V.I.S: " +
        toolResult,
        "ai"
      );

      addMemory(
        "model",
        toolResult
      );

      speak(toolResult);

      return;

    }

  } catch (error) {

    console.warn(
      "Tool error:",
      error
    );

  }


  // ----------------------------------------------------------
  // Gemini
  // ----------------------------------------------------------

  const loading =
    add(
      "J.A.R.V.I.S: Processing...",
      "ai"
    );


  try {

    const response =
      await callGemini(message);


    if (loading) {

      loading.textContent =
        "J.A.R.V.I.S: " +
        response;

    }


    addMemory(
      "model",
      response
    );


    speak(response);

  } catch (error) {

    console.error(
      "Gemini error:",
      error
    );


    if (loading) {

      loading.textContent =
        "J.A.R.V.I.S: ERROR - " +
        error.message;

    }

  }

}


// ============================================================
// 13. SEND BUTTON
// ============================================================

if (sendBtn) {

  sendBtn.addEventListener(
    "click",
    async () => {

      const text =
        input?.value?.trim();

      if (!text) return;

      if (input) {
        input.value = "";
      }

      await processMessage(text);

    }
  );

}


// ============================================================
// 14. ENTER KEY
// =================================
