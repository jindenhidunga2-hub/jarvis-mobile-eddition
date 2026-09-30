/* =========================================================
   J.A.R.V.I.S. — FULL MOBILE SCRIPT
   Gemini + Memory + Voice + Microphone + Camera
   Google + YouTube + Wikipedia + Agent Mode
   ========================================================= */


/* =========================================================
   1. GEMINI API KEY
   ========================================================= */

let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
    API_KEY = prompt("Enter your Gemini API Key:");

    if (API_KEY) {
        API_KEY = API_KEY.trim();
        localStorage.setItem("jarvis_key", API_KEY);
    }
}


/* =========================================================
   2. GEMINI MODELS
   ========================================================= */

const MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest"
];


/* =========================================================
   3. DOM ELEMENTS
   ========================================================= */

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");
const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");


/* =========================================================
   4. MEMORY
   ========================================================= */

let MEMORY = [];

try {

    const storedMemory =
        JSON.parse(
            localStorage.getItem("jarvis_memory") || "[]"
        );

    if (Array.isArray(storedMemory)) {

        MEMORY = storedMemory.filter(item =>
            item &&
            (item.role === "user" || item.role === "model") &&
            typeof item.text === "string"
        );

    }

} catch (error) {

    console.warn("Memory load failed:", error);
    MEMORY = [];

}


function saveMemory() {

    try {

        localStorage.setItem(
            "jarvis_memory",
            JSON.stringify(MEMORY.slice(-50))
        );

    } catch (error) {

        console.warn("Memory save failed:", error);

    }

}


function remember(role, text) {

    MEMORY.push({
        role: role,
        text: String(text)
    });

    if (MEMORY.length > 50) {
        MEMORY = MEMORY.slice(-50);
    }

    saveMemory();

}


/* =========================================================
   5. CHAT DISPLAY
   ========================================================= */

function add(text, type = "ai") {

    if (!chat) return null;

    const message =
        document.createElement("div");

    message.className =
        type === "user"
            ? "message user"
            : "message ai";

    message.textContent = text;

    chat.appendChild(message);

    chat.scrollTop = chat.scrollHeight;

    return message;

}


/* =========================================================
   6. RESTORE MEMORY
   ========================================================= */

MEMORY.forEach(item => {

    const prefix =
        item.role === "user"
            ? "YOU: "
            : "J.A.R.V.I.S: ";

    add(
        prefix + item.text,
        item.role === "user"
            ? "user"
            : "ai"
    );

});


/* =========================================================
   7. FETCH JSON WITH TIMEOUT
   ========================================================= */

async function fetchToolJson(
    url,
    options = {},
    timeoutMs = 10000
) {

    const controller =
        typeof AbortController !== "undefined"
            ? new AbortController()
            : null;

    let timeoutId = null;

    if (controller) {

        timeoutId =
            setTimeout(
                () => controller.abort(),
                timeoutMs
            );

    }

    try {

        const response =
            await fetch(
                url,
                {
                    ...options,
                    ...(controller
                        ? { signal: controller.signal }
                        : {})
                }
            );

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


/* =========================================================
   8. OPEN WEBSITE
   ========================================================= */

function openWebsite(url) {

    try {

        const destination =
            new URL(url);

        if (
            destination.protocol !== "https:" &&
            destination.protocol !== "http:"
        ) {
            return false;
        }

        window.open(
            destination.href,
            "_blank",
            "noopener,noreferrer"
        );

        return true;

    } catch (error) {

        console.warn("URL error:", error);
        return false;

    }

}


/* =========================================================
   9. BASIC TOOLS
   ========================================================= */

async function handleTools(text) {

    const value =
        String(text || "").trim();


    /* OPEN YOUTUBE */

    if (
        /^(?:please\s+)?(?:open\s+)?youtube(?:\s+please)?[.!?]*$/i
            .test(value)
    ) {

        openWebsite(
            "https://www.youtube.com"
        );

        return "Opening YouTube, Boss.";

    }


    /* OPEN GOOGLE */

    if (
        /^(?:please\s+)?(?:open\s+)?google(?:\s+please)?[.!?]*$/i
            .test(value)
    ) {

        openWebsite(
            "https://www.google.com"
        );

        return "Opening Google, Boss.";

    }


    /* DIRECT URL */

    const urlCommand =
        value.match(
            /^(?:open|visit|go to)\s+(https?:\/\/\S+)$/i
        );

    if (urlCommand) {

        const success =
            openWebsite(urlCommand[1]);

        return success
            ? "Opening the requested website, Boss."
            : "That link is not valid.";

    }


    /* GOOGLE SEARCH */

    const googleSearch =
        value.match(
            /^(?:google\s+search|search\s+(?:on\s+)?google)(?:\s+for)?\s+(.+)$/i
        );

    if (googleSearch) {

        const query =
            googleSearch[1].trim();

        openWebsite(
            "https://www.google.com/search?q=" +
            encodeURIComponent(query)
        );

        return (
            "Searching Google for " +
            query +
            ", Boss."
        );

    }


    /* YOUTUBE SEARCH */

    const youtubeSearch =
        value.match(
            /^(?:play|youtube(?:\s+search)?|search\s+(?:on\s+)?youtube)(?:\s+for)?\s+(.+)$/i
        );

    if (youtubeSearch) {

        const query =
            youtubeSearch[1].trim();

        openWebsite(
            "https://www.youtube.com/results?search_query=" +
            encodeURIComponent(query)
        );

        return (
            "Searching YouTube for " +
            query +
            ", Boss."
        );

    }


    /* WIKIPEDIA SEARCH */

    const searchMatch =
        value.match(
            /^(?:search|look up)(?:\s+for)?\s+(.+)$/i
        );

    if (searchMatch) {

        const query =
            searchMatch[1].trim();

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
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
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

            return "Wikipedia search failed, Boss.";

        }

    }


    return null;

}


/* =========================================================
   10. AGENT MODE
   ========================================================= */

const AGENT_TOOLS = Object.freeze({

    time: async () => {

        return (
            "Current time: " +
            new Date().toLocaleString("en-IN")
        );

    },

    weather: async () => {

        return "Weather requires a weather API.";

    },

    news: async () => {

        return "News requires a news API.";

    },

    crypto: async () => {

        try {

            const data =
                await fetchToolJson(
                    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
                );

            const price =
                data?.bitcoin?.usd;

            if (!price) {
                return "Bitcoin price unavailable.";
            }

            return (
                "Bitcoin is approximately $" +
                price +
                " USD."
            );

        } catch (error) {

            return "Bitcoin price unavailable.";

        }

    }

});


function isAgentModeRequest(text = "") {

    const value =
        String(text).toLowerCase();

    if (
        /\b(agent|agent mode|run the agent|use the agent)\b/
            .test(value)
    ) {
        return true;
    }

    if (
        /\b(briefing|research|analyze|analysis)\b/
            .test(value)
    ) {
        return true;
    }

    return (
        /\bplan\b/.test(value) &&
        /\b(time|weather|news|crypto|bitcoin|btc)\b/
            .test(value)
    );

}


function fallbackAgentToolPlan(goal) {

    const text =
        String(goal).toLowerCase();

    const tools = [];

    if (/\btime\b|\bclock\b/.test(text)) {
        tools.push("time");
    }

    if (
        /\bweather\b|\btemperature\b/.test(text)
    ) {
        tools.push("weather");
    }

    if (
        /\bnews\b|\bheadlines\b/.test(text)
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


async function runAgent(goal) {

    add(
        "J.A.R.V.I.S: Agent mode active.",
        "ai"
    );

    const tools =
        fallbackAgentToolPlan(goal);

    if (!tools.length) {
        return await callGemini(goal);
    }

    const results = {};

    for (
        let i = 0;
        i < tools.length;
        i++
    ) {

        const tool = tools[i];

        add(
            `J.A.R.V.I.S: Running ${tool} tool...`,
            "ai"
        );

        try {

            results[tool] =
                await AGENT_TOOLS[tool]();

        } catch (error) {

            results[tool] =
                "Tool error.";

        }

    }

    const summaryPrompt =
        "Goal: " +
        JSON.stringify(goal) +
        "\n\nTool results:\n" +
        JSON.stringify(results) +
        "\n\nGive a concise Telugu/English summary.";

    return await callGemini(
        summaryPrompt
    );

}


/* =========================================================
   11. GEMINI BRAIN
   FALLBACK + RETRY
   ========================================================= */

async function callGemini(prompt) {

    if (!API_KEY) {

        throw new Error(
            "Gemini API key is missing."
        );

    }

    const history =
        MEMORY
            .slice(-12)
            .map(item => ({

                role:
                    item.role === "model"
                        ? "model"
                        : "user",

                parts: [
                    {
                        text: item.text
                    }
                ]

            }));

    history.push({

        role: "user",

        parts: [
            {
                text: String(prompt)
            }
        ]

    });

    let lastError =
        "Gemini request failed.";

    for (
        const model of MODELS
    ) {

        for (
            let attempt = 1;
            attempt <= 2;
            attempt++
        ) {

            try {

                const endpoint =
                    "https://generativelanguage.googleapis.com/v1beta/models/" +
                    encodeURIComponent(model) +
                    ":generateContent?key=" +
                    encodeURIComponent(API_KEY);

                const response =
                    await fetch(
                        endpoint,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    contents:
                                        history
                                })
                        }
                    );

                const data =
                    await response.json();

                if (response.ok) {

                    const answer =
                        data?.candidates?.[0]
                            ?.content
                            ?.parts
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

                    break;

                }

                const errorMessage =
                    data?.error?.message ||
                    `HTTP ${response.status}`;

                lastError =
                    `${model}: ${errorMessage}`;


                /* Authentication errors */

                if (
                    response.status === 400 ||
                    response.status === 401 ||
                    response.status === 403
                ) {

                    throw new Error(
                        errorMessage
                    );

                }


                /* Temporary errors */

                if (
                    response.status === 429 ||
                    response.status === 500 ||
                    response.status === 502 ||
                    response.status === 503 ||
                    response.status === 504
                ) {

                    if (attempt < 2) {

                        await new Promise(
                            resolve =>
                                setTimeout(
                                    resolve,
                                    attempt * 2000
                                )
                        );

                        continue;

                    }

                }

                break;

            } catch (error) {

                lastError =
                    error?.message ||
                    "Network error.";

                if (
                    /API key|authentication|credential|permission/i
                        .test(lastError)
                ) {

                    throw error;

                }

                if (attempt < 2) {

                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                attempt * 2000
                            )
                    );

                    continue;

                }

            }

        }

    }

    throw new Error(
        lastError
    );

}


/* =========================================================
   12. SEND MESSAGE
   ========================================================= */

async function sendMessage() {

    if (!input) return;

    const text =
        input.value.trim();

    if (!text) return;

    input.value = "";

    add(
        "YOU: " + text,
        "user"
    );

    remember(
        "user",
        text
    );


    /* AGENT MODE */

    if (
        isAgentModeRequest(text)
    ) {

        try {

            const result =
                await runAgent(text);

            add(
                "J.A.R.V.I.S: " + result,
                "ai"
            );

            remember(
                "model",
                result
            );

            speak(result);

        } catch (error) {

            add(
                "J.A.R.V.I.S: Agent error: " +
                error.message,
                "ai"
            );

        }

        return;

    }


    /* BUILT-IN TOOLS */

    try {

        const toolResult =
            await handleTools(text);

        if (toolResult) {

            add(
                "J.A.R.V.I.S: " +
                toolResult,
                "ai"
            );

            remember(
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


    /* GEMINI */

    const loading =
        add(
            "J.A.R.V.I.S: Thinking...",
            "ai"
        );

    try {

        const answer =
            await callGemini(text);

        if (loading) {

            loading.textContent =
                "J.A.R.V.I.S: " +
                answer;

        }

        remember(
            "model",
            answer
        );

        speak(answer);

    } catch (error) {

        console.error(
            "Gemini:",
            error
        );

        if (loading) {

            loading.textContent =
                "J.A.R.V.I.S: ERROR: " +
                error.message;

        }

    }

}


/* =========================================================
   13. SEND BUTTON
   ========================================================= */

if (sendBtn) {

    sendBtn.addEventListener(
        "click",
        sendMessage
    );

}


/* =========================================================
   14. ENTER KEY
   ========================================================= */

if (input) {

    input.addEventListener(
        "keydown",
        event => {

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


/* =========================================================
   15. TEXT TO SPEECH
   ========================================================= */

function speak(text) {

    if (
        !("speechSynthesis" in window)
    ) {
        return;
    }

    const cleanText =
        String(text)
            .replace(
                /^J\.A\.R\.V\.I\.S:\s*/i,
                ""
            );

    window.speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(
            cleanText
        );

    utterance.lang = "en-IN";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(
        utterance
    );

}


/* =========================================================
   16. MICROPHONE
   ========================================================= */

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = null;


if (SpeechRecognition) {

    recognition =
        new SpeechRecognition();

    recognition.lang =
        "en-IN";

    recognition.continuous =
        false;

    recognition.interimResults =
        false;


    recognition.onstart =
        () => {

            if (micBtn) {

                micBtn.classList.add(
                    "listening"
                );

                micBtn.textContent =
                    "🔴";

            }

        };


    recognition.onresult =
        event => {

            const transcript =
                event.results[0][0]
                    .transcript
                    .trim();

            if (input) {

                input.value =
                    transcript;

                sendMessage();

            }

        };


    recognition.onerror =
        event => {

            console.warn(
                "Microphone:",
                event.error
            );

        };


    recognition.onend =
        () => {

            if (micBtn) {

                micBtn.classList.remove(
                    "listening"
                );

                micBtn.textContent =
                    "🎤";

            }

        };


    if (micBtn) {

        micBtn.addEventListener(
            "click",
            () => {

                try {

                    recognition.start();

                } catch (error) {

                    console.warn(
                        "Recognition:",
                        error
                    );

                }

            }
        );

    }

} else {

    if (micBtn) {

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

}


/* =========================================================
   17. CLEAR MEMORY
   ========================================================= */

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

            localStorage.removeItem(
                "jarvis_memory"
            );

            if (chat) {
                chat.innerHTML = "";
            }

            add(
                "J.A.R.V.I.S: Memory cleared, Boss.",
                "ai"
            );

        }
    );

}


/* =========================================================
   18. CAMERA / IMAGE INPUT
   ========================================================= */

if (
    camBtn &&
    imgInput
) {

    camBtn.addEventListener(
        "click",
        () => {

            imgInput.click();

        }
    );


    imgInput.addEventListener(
        "change",
        event => {

            const file =
                event.target.files?.[0];

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


            reader.onload =
                () => {

                    const imageData =
                        reader.result;


                    add(
                        "YOU: Image selected.",
                        "user"
                    );


                    const preview =
                        document.createElement(
                            "img"
                        );

                    preview.src =
                        imageData;

                    preview.style.maxWidth =
                        "85%";

                    preview.style.borderRadius =
                        "12px";

                    preview.style.margin =
                        "8px 0";


                    if (chat) {

                        chat.appendChild(
                            preview
                        );

                        chat.scrollTop =
                            chat.scrollHeight;

                    }


                    add(
                        "J.A.R.V.I.S: Image received.",
                        "ai"
                    );

                };


            reader.readAsDataURL(
                file
            );

            imgInput.value = "";

        }
    );

}


/* =========================================================
   19. WELCOME
   ========================================================= */

if (
    chat &&
    chat.children.length === 0
) {

    add(
        "J.A.R.V.I.S: Systems online. How may I assist you, Boss?",
        "ai"
    );

}


/* =========================================================
   20. STARTUP
   ========================================================= */

console.log(
    "J.A.R.V.I.S initialized."
);

console.log(
    "Gemini models:",
    MODELS
);
