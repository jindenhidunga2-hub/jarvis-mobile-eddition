/* =========================================================
   FRIDAY AI — COMPLETE MOBILE SCRIPT
   Gemini + Memory + Voice + Microphone + Camera + Tools
   ========================================================= */

/* =========================
   1. GEMINI API
   ========================= */

let API_KEY = localStorage.getItem("friday_key");

if (!API_KEY) {
    API_KEY = prompt("Enter your Gemini API Key:");

    if (API_KEY) {
        API_KEY = API_KEY.trim();
        localStorage.setItem("friday_key", API_KEY);
    }
}

/*
 * Keep this list limited to models that actually exist
 * in the API project you are using.
 */
const MODELS = [
    "gemini-flash-latest"
];


/* =========================
   2. DOM ELEMENTS
   ========================= */

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");
const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");


/* =========================
   3. MEMORY
   ========================= */

let MEMORY = [];

try {
    const stored = JSON.parse(
        localStorage.getItem("friday_memory") || "[]"
    );

    if (Array.isArray(stored)) {
        MEMORY = stored.filter(item =>
            item &&
            (item.role === "user" || item.role === "model") &&
            typeof item.text === "string"
        );
    }
} catch (error) {
    MEMORY = [];
}

function saveMemory() {
    try {
        localStorage.setItem(
            "friday_memory",
            JSON.stringify(MEMORY.slice(-50))
        );
    } catch (error) {
        console.warn("Memory save failed:", error);
    }
}

function remember(role, text) {
    MEMORY.push({
        role,
        text: String(text)
    });

    if (MEMORY.length > 50) {
        MEMORY = MEMORY.slice(-50);
    }

    saveMemory();
}


/* =========================
   4. CHAT UI
   ========================= */

function add(text, type = "ai") {
    if (!chat) return null;

    const message = document.createElement("div");

    message.className =
        type === "user"
            ? "message user"
            : "message ai";

    message.textContent = text;

    chat.appendChild(message);

    chat.scrollTop = chat.scrollHeight;

    return message;
}


/* =========================
   5. LOAD MEMORY INTO CHAT
   ========================= */

MEMORY.forEach(item => {

    const prefix =
        item.role === "user"
            ? "YOU: "
            : "FRIDAY: ";

    add(
        prefix + item.text,
        item.role === "user" ? "user" : "ai"
    );

});


/* =========================
   6. FETCH WITH TIMEOUT
   ========================= */

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
        timeoutId = setTimeout(
            () => controller.abort(),
            timeoutMs
        );
    }

    try {

        const response = await fetch(
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


/* =========================
   7. OPEN WEBSITE
   ========================= */

function openWebsite(url) {

    try {

        const destination = new URL(url);

        if (
            destination.protocol !== "http:" &&
            destination.protocol !== "https:"
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

        return false;

    }
}


/* =========================
   8. BASIC TOOLS
   ========================= */

async function handleTools(text) {

    const value = String(text || "").trim();


    /* YouTube */

    if (
        /^(please\s+)?(open\s+)?youtube( please)?[.!?]*$/i
            .test(value)
    ) {

        openWebsite("https://www.youtube.com");

        return "Opening YouTube, Boss.";

    }


    /* Google */

    if (
        /^(please\s+)?(open\s+)?google( please)?[.!?]*$/i
            .test(value)
    ) {

        openWebsite("https://www.google.com");

        return "Opening Google, Boss.";

    }


    /* Direct URL */

    const urlMatch = value.match(
        /^(?:open|visit|go to)\s+(https?:\/\/\S+)$/i
    );

    if (urlMatch) {

        const success = openWebsite(
            urlMatch[1]
        );

        return success
            ? "Opening the requested website, Boss."
            : "That link is not valid.";

    }


    /* Google search */

    const googleMatch = value.match(
        /^(?:google\s+search|search\s+(?:on\s+)?google)(?:\s+for)?\s+(.+)$/i
    );

    if (googleMatch) {

        const query =
            googleMatch[1].trim();

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


    /* YouTube search */

    const youtubeMatch = value.match(
        /^(?:play|youtube(?:\s+search)?|search\s+(?:on\s+)?youtube)(?:\s+for)?\s+(.+)$/i
    );

    if (youtubeMatch) {

        const query =
            youtubeMatch[1].trim();

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


    /* Wikipedia */

    const wikiMatch = value.match(
        /^(?:search|look up)\s+(?:for\s+)?(.+)$/i
    );

    if (wikiMatch) {

        const query =
            wikiMatch[1].trim();

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
                return (
                    "I could not find that, Boss."
                );
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

            return (
                "Wikipedia search failed, Boss."
            );

        }

    }


    return null;
}


/* =========================
   9. AGENT MODE
   ========================= */

const AGENT_TOOLS = Object.freeze({

    time: async () => {

        return new Date().toLocaleString();

    },

    weather: async () => {

        return "Weather tool requires a weather service/API.";

    },

    news: async () => {

        return "News tool requires a news service/API.";

    },

    crypto: async () => {

        try {

            const data =
                await fetchToolJson(
                    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
                );

            const price =
                data?.bitcoin?.usd;

            return price
                ? `Bitcoin is approximately $${price} USD.`
                : "Bitcoin price unavailable.";

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

    if (
        /\btime\b|\bclock\b/.test(text)
    ) {
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
        "FRIDAY: Agent mode active.",
        "ai"
    );

    const tools =
        fallbackAgentToolPlan(goal);

    if (!tools.length) {

        return await callGemini(
            "Analyze this request and provide a concise useful answer: " +
            goal
        );

    }

    const results = {};

    for (
        let i = 0;
        i < tools.length;
        i++
    ) {

        const tool =
            tools[i];

        add(
            `FRIDAY: Running ${tool} tool...`,
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

    const prompt =
        "Goal: " +
        JSON.stringify(goal) +
        "\n\nTool results:\n" +
        JSON.stringify(results) +
        "\n\nGive a concise Telugu/English response.";

    return await callGemini(prompt);

}


/* =========================
   10. GEMINI BRAIN
   ========================= */

async function callGemini(prompt) {

    return await callGeminiRaw(prompt);

}


async function callGeminiRaw(prompt) {

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


    for (const model of MODELS) {

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

                        body: JSON.stringify({
                            contents: history
                        })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                const message =
                    data?.error?.message ||
                    `HTTP ${response.status}`;

                lastError =
                    `${model}: ${message}`;

                continue;

            }


            const answer =
                data?.candidates?.[0]
                    ?.content
                    ?.parts
                    ?.map(part => part.text || "")
                    .join("")
                    .trim();


            if (answer) {

                return answer;

            }


            lastError =
                `${model}: Empty response.`;

        } catch (error) {

            lastError =
                error?.message ||
                "Network error.";

        }

    }


    throw new Error(lastError);

}


/* =========================
   11. SEND MESSAGE
   ========================= */

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


    /* Agent */

    if (isAgentModeRequest(text)) {

        try {

            const result =
                await runAgent(text);

            add(
                "FRIDAY: " + result,
                "ai"
            );

            remember(
                "model",
                result
            );

            speak(result);

        } catch (error) {

            const message =
                "Agent error: " +
                error.message;

            add(
                "FRIDAY: " + message,
                "ai"
            );

        }

        return;
    }


    /* Built-in tools */

    try {

        const toolResult =
            await handleTools(text);

        if (toolResult) {

            add(
                "FRIDAY: " + toolResult,
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


    /* Gemini */

    const loading =
        add(
            "FRIDAY: Thinking...",
            "ai"
        );


    try {

        const answer =
            await callGemini(text);


        if (loading) {

            loading.textContent =
                "FRIDAY: " + answer;

        }


        remember(
            "model",
            answer
        );


        speak(answer);

    } catch (error) {

        const message =
            "ERROR: " +
            error.message;


        if (loading) {

            loading.textContent =
                "FRIDAY: " + message;

        }


        console.error(
            "Gemini error:",
            error
        );

    }

}


/* =========================
   12. SEND BUTTON
   ========================= */

if (sendBtn) {

    sendBtn.addEventListener(
        "click",
        sendMessage
    );

}


/* =========================
   13. ENTER KEY
   ========================= */

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


/* =========================
   14. TEXT TO SPEECH
   ========================= */

function speak(text) {

    if (
        !("speechSynthesis" in window)
    ) {
        return;
    }

    const cleanText =
        String(text)
            .replace(
                /^FRIDAY:\s*/i,
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


/* =========================
   15. MICROPHONE
   ========================= */

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


let recognition = null;


if (SpeechRecognition) {

    recognition =
        new SpeechRecognition();

    recognition.lang = "en-IN";

    recognition.continuous = false;

    recognition.interimResults = false;


    recognition.onstart = () => {

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


    recognition.onend = () => {

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
                    "FRIDAY: Voice recognition is not supported by this browser.",
                    "ai"
                );

            }
        );

    }

}


/* =========================
   16. CLEAR MEMORY
   ========================= */

if (clearBtn) {

    clearBtn.addEventListener(
        "click",
        () => {

            const confirmed =
                confirm(
                    "Clear FRIDAY memory?"
                );

            if (!confirmed) return;


            MEMORY = [];

            localStorage.removeItem(
                "friday_memory"
            );


            if (chat) {

                chat.innerHTML = "";

            }


            add(
                "FRIDAY: Memory cleared, Boss.",
                "ai"
            );

        }
    );

}


/* =========================
   17. CAMERA / IMAGE
   ========================= */

if (camBtn && imgInput) {

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

            if (!file) return;


            if (!file.type.startsWith("image/")) {

                add(
                    "FRIDAY: Please select an image.",
                    "ai"
                );

                return;

            }


            const reader =
                new FileReader();


            reader.onload = () => {

                const imageData =
                    reader.result;


                add(
                    "YOU: Image selected.",
                    "user"
                );


                /*
                 * The image is currently previewed.
                 * To send images to Gemini, the image
                 * must be included as inlineData in
                 * the generateContent request.
                 */

                const preview =
                    document.createElement("img");

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
                    "FRIDAY: Image received. Vision processing can be connected to Gemini next.",
                    "ai"
                );

            };


            reader.readAsDataURL(file);

            imgInput.value = "";

        }
    );

}


/* =========================
   18. WELCOME
   ========================= */

if (
    chat &&
    chat.children.length === 0
) {

    add(
        "FRIDAY: Systems online. How may I assist you, Boss?",
        "ai"
    );

}
