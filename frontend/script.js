/* =========================================================
   J.A.R.V.I.S MOBILE EDITION
   Full script.js
   ========================================================= */

/* =========================
   1. GEMINI API KEY
   ========================= */

const API_STORAGE_KEY = "jarvis_key_v2";

let API_KEY = localStorage.getItem(API_STORAGE_KEY);

if (!API_KEY) {
    API_KEY = prompt("Enter your Gemini API Key:");

    if (API_KEY) {
        API_KEY = API_KEY.trim();
        localStorage.setItem(API_STORAGE_KEY, API_KEY);
    }
}


/* =========================
   2. GEMINI MODELS
   ========================= */

const MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest"
];


/* =========================
   3. DOM ELEMENTS
   ========================= */

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");
const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");


/* =========================
   4. MEMORY
   ========================= */

let MEMORY = [];

try {
    MEMORY = JSON.parse(
        localStorage.getItem("jarvis_memory") || "[]"
    );
} catch (error) {
    MEMORY = [];
}


function saveMemory() {
    try {
        MEMORY = MEMORY.slice(-50);

        localStorage.setItem(
            "jarvis_memory",
            JSON.stringify(MEMORY)
        );
    } catch (error) {
        console.error("Memory save error:", error);
    }
}


/* =========================
   5. CHAT DISPLAY
   ========================= */

function addMessage(text, type = "ai") {

    if (!chat) return;

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
   6. RESTORE MEMORY
   ========================= */

function restoreMemory() {

    if (!MEMORY.length) return;

    MEMORY.forEach(message => {

        if (!message || !message.text) return;

        addMessage(
            message.role === "user"
                ? "YOU: " + message.text
                : "J.A.R.V.I.S: " + message.text,
            message.role === "user"
                ? "user"
                : "ai"
        );

    });
}


/* =========================
   7. SYSTEM PROMPT
   ========================= */

const SYSTEM_PROMPT = `
You are J.A.R.V.I.S., a personal AI assistant.

Your personality:
- Intelligent
- Helpful
- Calm
- Professional
- Concise
- Friendly

Address the user as "Boss" when appropriate.

You are running inside a mobile web application.

Help with:
- Questions
- Coding
- Explanations
- Planning
- Learning
- Writing
- General assistance

Do not claim to perform actions that you cannot actually perform.
`;


/* =========================
   8. GEMINI API
   ========================= */

async function callGemini(userText) {

    if (!API_KEY) {
        throw new Error(
            "Gemini API key is missing."
        );
    }

    const history = [
        {
            role: "user",
            parts: [
                {
                    text: SYSTEM_PROMPT
                }
            ]
        }
    ];

    const recentMemory = MEMORY.slice(-20);

    recentMemory.forEach(item => {

        if (!item || !item.text) return;

        history.push({
            role:
                item.role === "model"
                    ? "model"
                    : "user",

            parts: [
                {
                    text: item.text
                }
            ]
        });

    });

    history.push({
        role: "user",
        parts: [
            {
                text: userText
            }
        ]
    });


    let lastError = null;


    for (const model of MODELS) {

        try {

            const endpoint =
                "https://generativelanguage.googleapis.com/v1beta/models/" +
                encodeURIComponent(model) +
                ":generateContent";


            const response = await fetch(endpoint, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": API_KEY
                },

                body: JSON.stringify({
                    contents: history
                })

            });


            const data = await response.json();


            if (!response.ok) {

                lastError = new Error(
                    data?.error?.message ||
                    `HTTP ${response.status}`
                );

                console.warn(
                    "Gemini model failed:",
                    model,
                    lastError.message
                );

                continue;
            }


            const text =
                data?.candidates?.[0]?.content?.parts
                    ?.map(part => part.text || "")
                    .join("")
                    .trim();


            if (text) {

                return text;

            }


            lastError = new Error(
                "Gemini returned an empty response."
            );

        } catch (error) {

            lastError = error;

            console.error(
                "Gemini request error:",
                model,
                error
            );

        }

    }


    throw lastError ||
        new Error("All Gemini models failed.");

}


/* =========================
   9. WEB TOOLS
   ========================= */

function handleTools(text) {

    const command = text.toLowerCase().trim();


    /* YouTube */

    if (
        command === "open youtube" ||
        command === "youtube"
    ) {

        window.open(
            "https://www.youtube.com/",
            "_blank"
        );

        return "Opening YouTube, Boss.";

    }


    /* Google */

    if (
        command === "open google" ||
        command === "google"
    ) {

        window.open(
            "https://www.google.com/",
            "_blank"
        );

        return "Opening Google, Boss.";

    }


    /* Wikipedia */

    if (
        command.startsWith("wikipedia ")
    ) {

        const query =
            text.substring(10).trim();

        if (!query) return null;

        const url =
            "https://en.wikipedia.org/wiki/Special:Search?search=" +
            encodeURIComponent(query);

        window.open(url, "_blank");

        return `Searching Wikipedia for ${query}.`;

    }


    /* Google Search */

    if (
        command.startsWith("search google ")
    ) {

        const query =
            text.substring(14).trim();

        if (!query) return null;

        const url =
            "https://www.google.com/search?q=" +
            encodeURIComponent(query);

        window.open(url, "_blank");

        return `Searching Google for ${query}.`;

    }


    /* YouTube Search */

    if (
        command.startsWith("search youtube ")
    ) {

        const query =
            text.substring(15).trim();

        if (!query) return null;

        const url =
            "https://www.youtube.com/results?search_query=" +
            encodeURIComponent(query);

        window.open(url, "_blank");

        return `Searching YouTube for ${query}.`;

    }


    /* Direct URL */

    if (
        command.startsWith("https://") ||
        command.startsWith("http://")
    ) {

        window.open(text.trim(), "_blank");

        return "Opening the requested website.";

    }


    return null;
}


/* =========================
   10. SPECIAL COMMANDS
   ========================= */

function handleSpecialCommands(text) {

    const command =
        text.toLowerCase().trim();


    /* Time */

    if (
        command === "what time is it" ||
        command === "time"
    ) {

        return `The current time is ${new Date().toLocaleTimeString()}.`;

    }


    /* Date */

    if (
        command === "what is today's date" ||
        command === "date"
    ) {

        return `Today's date is ${new Date().toLocaleDateString()}.`;

    }


    /* Clear memory */

    if (
        command === "clear memory" ||
        command === "forget everything"
    ) {

        MEMORY = [];

        localStorage.removeItem(
            "jarvis_memory"
        );

        return "Memory cleared, Boss.";

    }


    return null;
}


/* =========================
   11. SEND MESSAGE
   ========================= */

async function sendMessage() {

    if (!input) return;

    const text = input.value.trim();

    if (!text) return;


    /* Display user */

    addMessage(
        "YOU: " + text,
        "user"
    );


    input.value = "";


    /* Save user memory */

    MEMORY.push({
        role: "user",
        text: text,
        time: Date.now()
    });

    saveMemory();


    /* Special command */

    const special =
        handleSpecialCommands(text);


    if (special) {

        addMessage(
            "J.A.R.V.I.S: " + special,
            "ai"
        );

        MEMORY.push({
            role: "model",
            text: special,
            time: Date.now()
        });

        saveMemory();

        speak(special);

        return;
    }


    /* Web tool */

    const toolResult =
        handleTools(text);


    if (toolResult) {

        addMessage(
            "J.A.R.V.I.S: " + toolResult,
            "ai"
        );

        MEMORY.push({
            role: "model",
            text: toolResult,
            time: Date.now()
        });

        saveMemory();

        speak(toolResult);

        return;
    }


    /* Processing message */

    const processing =
        addMessage(
            "J.A.R.V.I.S: Processing...",
            "ai"
        );


    try {

        const
