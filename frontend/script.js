// ============================================================
// J.A.R.V.I.S MOBILE EDITION
// Full script.js
// Gemini API + Memory + Microphone + Voice + Camera/Vision
// ============================================================


// ============================================================
// 1. GEMINI API CONFIGURATION
// ============================================================

let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
    API_KEY = prompt("Enter your Gemini API Key:");

    if (API_KEY) {
        API_KEY = API_KEY.trim();
        localStorage.setItem("jarvis_key", API_KEY);
    }
}

// Current Gemini model
const MODEL = "gemini-3.8-flash";

const API_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;


// ============================================================
// 2. DOM ELEMENTS
// ============================================================

const chat = document.getElementById("chat");
const input = document.getElementById("msg");

const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");

const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");


// ============================================================
// 3. LOCAL MEMORY
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
    MEMORY = [];
}


// Save memory
function saveMemory() {
    try {
        localStorage.setItem(
            "jarvis_memory",
            JSON.stringify(MEMORY)
        );
    } catch (error) {
        console.error("Memory save error:", error);
    }
}


// Load memory into chat
MEMORY.forEach(message => {

    if (!message || !message.text) {
        return;
    }

    const label =
        message.role === "user"
            ? "YOU: "
            : "J.A.R.V.I.S: ";

    addMessage(
        label + message.text,
        message.role === "user" ? "user" : "ai"
    );
});


// ============================================================
// 4. CHAT UI
// ============================================================

function addMessage(text, type = "ai") {

    if (!chat) {
        return null;
    }

    const div = document.createElement("div");

    div.className = "msg " + type;

    div.innerText = text;

    chat.appendChild(div);

    chat.scrollTop = chat.scrollHeight;

    return div;
}


// ============================================================
// 5. GEMINI API
// ============================================================

async function callGemini(prompt) {

    if (!API_KEY) {
        throw new Error(
            "Gemini API key is missing."
        );
    }

    // Keep the request reasonably small
    const history = MEMORY
        .slice(-12)
        .map(message => ({
            role: message.role,
            parts: [
                {
                    text: message.text
                }
            ]
        }));


    // Add current user message
    history.push({
        role: "user",
        parts: [
            {
                text: prompt
            }
        ]
    });


    const response = await fetch(
        API_URL,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": API_KEY
            },

            body: JSON.stringify({
                contents: history,

                systemInstruction: {
                    parts: [
                        {
                            text:
                                "You are J.A.R.V.I.S., a helpful personal AI assistant. " +
                                "Be concise, intelligent, friendly and practical. " +
                                "Answer in English unless the user requests another language."
                        }
                    ]
                },

                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            })
        }
    );


    // Parse response
    let data;

    try {
        data = await response.json();
    } catch (error) {
        throw new Error(
            "Invalid response received from Gemini."
        );
    }


    // API error
    if (!response.ok) {

        const message =
            data?.error?.message ||
            `Gemini API error (${response.status})`;

        throw new Error(message);
    }


    // Extract response text
    const reply =
        data?.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();


    if (!reply) {

        if (
            data?.promptFeedback?.blockReason
        ) {
            throw new Error(
                "Gemini blocked the request: " +
                data.promptFeedback.blockReason
            );
        }

        throw new Error(
            "Gemini returned an empty response."
        );
    }


    return reply;
}


// ============================================================
// 6. ASK J.A.R.V.I.S.
// ============================================================

async function askGemini(prompt) {

    const thinkingMessage =
        addMessage(
            "J.A.R.V.I.S: Thinking...",
            "ai"
        );


    try {

        const reply =
            await callGemini(prompt);


        // Save user message
        MEMORY.push({
            role: "user",
            text: prompt
        });


        // Save AI response
        MEMORY.push({
            role: "model",
            text: reply
        });


        saveMemory();


        // Update thinking message
        if (thinkingMessage) {

            thinkingMessage.innerText =
                "J.A.R.V.I.S: " + reply;
        }


        // Speak response
        speak(reply);


        return reply;


    } catch (error) {

        console.error(
            "Gemini error:",
            error
        );


        if (thinkingMessage) {

            thinkingMessage.innerText =
                "J.A.R.V.I.S: ERROR - " +
                error.message;
        }


        return null;
    }
}


// ============================================================
// 7. SEND BUTTON
// ============================================================

if (sendBtn) {

    sendBtn.onclick = () => {

        const text =
            input?.value.trim();

        if (!text) {
            return;
        }


        addMessage(
            "YOU: " + text,
            "user"
        );


        input.value = "";


        askGemini(text);
    };
}


// ============================================================
// 8. ENTER KEY
// ============================================================

if (input) {

    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                if (sendBtn) {
                    sendBtn.click();
                }
            }
        }
    );
}


// ============================================================
// 9. MICROPHONE / SPEECH RECOGNITION
// ============================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


let recognition = null;


if (SpeechRecognition) {

    recognition =
        new SpeechRecognition();

    recognition.lang = "en-US";

    recognition.continuous = false;

    recognition.interimResults = false;


    recognition.onstart = () => {

        if (micBtn) {
            micBtn.innerText =
                "LISTENING...";
        }
    };


    recognition.onresult = event => {

        const text =
            event.results[0][0]
                .transcript
                .trim();


        if (!text) {
            return;
        }


        if (input) {
            input.value = text;
        }


        addMessage(
            "YOU: " + text,
            "user"
        );


        if (input) {
            input.value = "";
        }


        askGemini(text);
    };


    recognition.onerror = event => {

        console.error(
            "Speech recognition error:",
            event.error
        );


        if (micBtn) {
            micBtn.innerText = "🎙️";
        }
    };


    recognition.onend = () => {

        if (micBtn) {
            micBtn.innerText = "🎙️";
        }
    };


    if (micBtn) {

        micBtn.onclick = () => {

            try {

                recognition.start();

            } catch (error) {

                console.log(
                    "Recognition already running."
                );
            }
        };
    }


} else {

    if (micBtn) {

        micBtn.onclick = () => {

            addMessage(
                "J.A.R.V.I.S: Speech recognition is not supported by this browser.",
                "ai"
            );
        };
    }
}


// ============================================================
// 10. TEXT-TO-SPEECH
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


loadVoices();


if (
    "speechSynthesis" in window &&
    "onvoiceschanged" in speechSynthesis
) {

    speechSynthesis.onvoiceschanged =
        loadVoices;
}


function speak(text) {

    if (
        !text ||
        !("speechSynthesis" in window)
    ) {
        return;
    }


    // Stop previous speech
    speechSynthesis.cancel();


    const utterance =
        new SpeechSynthesisUtterance(
            text
        );


    utterance.rate = 1.05;

    utterance.pitch = 0.85;

    utterance.volume = 1.0;


    // Prefer English voice
    const englishVoice =
        voices.find(
            voice =>
                voice.lang &&
                voice.lang
                    .toLowerCase()
                    .startsWith("en")
        );


    if (englishVoice) {
        utterance.voice =
            englishVoice;
    }


    speechSynthesis.speak(
        utterance
    );
}


// ============================================================
// 11. CAMERA / IMAGE INPUT
// ============================================================

if (camBtn && imgInput) {

    camBtn.onclick = () => {

        imgInput.click();
    };


    imgInput.onchange = () => {

        const file =
            imgInput.files?.[0];


        if (!file) {
            return;
        }


        if (!file.type.startsWith("image/")) {

            addMessage(
                "J.A.R.V.I.S: Please select an image file.",
                "ai"
            );

            return;
        }


        const reader =
            new FileReader();


        reader.onload = () => {

            const result =
                reader.result;


            if (
                typeof result !==
                "string"
            ) {
                return;
            }


            const base64 =
                result.split(",")[1];


            const question =
                input?.value.trim() ||
                "What do you see in this image? Describe it briefly.";


            addMessage(
                "YOU: [IMAGE] " +
                question,
                "user"
            );


            if (input) {
                input.value = "";
            }


            askVision(
                base64,
                file.type,
                question
            );
        };


        reader.onerror = () => {

            addMessage(
                "J.A.R.V.I.S: Could not read the image.",
                "ai"
            );
        };


        reader.readAsDataURL(file);
    };
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
        addMessage(
            "J.A.R.V.I.S: Analyzing image...",
            "ai"
        );


    try {

        if (!API_KEY) {
            throw new Error(
                "Gemini API key is missing."
            );
        }


        const response =
            await fetch(
                API_URL,
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
                                        text:
                                            question
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

                        systemInstruction: {
                            parts: [
                                {
                                    text:
                                        "You are J.A.R.V.I.S. Analyze the supplied image accurately. " +
                                        "Do not invent details that cannot be seen."
                                }
                            ]
                        },

                        generationConfig: {
                            temperature: 0.4,
                            maxOutputTokens: 2048
                        }
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data?.error?.message ||
                `Vision API error (${response.status})`
            );
        }


        const reply =
            data?.candidates?.[0]?.content?.parts
                ?.map(part => part.text || "")
                .join("")
                .trim();


        if (!reply) {

            throw new Error(
                "Gemini returned no image analysis."
            );
        }


        if (visionMessage) {

            visionMessage.innerText =
                "J.A.R.V.I.S: " +
                reply;
        }


        speak(reply);


    } catch (error) {

        console.error(
            "Vision error:",
            error
        );


        if (visionMessage) {

            visionMessage.innerText =
                "J.A.R.V.I.S: ERROR - " +
                error.message;
        }
    }


    // Reset file input so the same image
    // can be selected again
    if (imgInput) {
        imgInput.value = "";
    }
}


// ============================================================
// 13. CLEAR MEMORY
// ============================================================

if (clearBtn) {

    clearBtn.onclick = () => {

        const confirmed =
            confirm(
                "Clear J.A.R.V.I.S memory?"
            );


        if (!confirmed) {
            return;
        }


        MEMORY = [];


        saveMemory();


        if (chat) {
            chat.innerHTML = "";
        }


        addMessage(
            "SYSTEM: Memory cleared.",
            "ai"
        );
    };
}


// ============================================================
// 14. CHANGE API KEY
// ============================================================

window.changeJarvisKey = function () {

    const newKey =
        prompt(
            "Enter your new Gemini API Key:"
        );


    if (!newKey) {
        return;
    }


    API_KEY =
        newKey.trim();


    localStorage.setItem(
        "jarvis_key",
        API_KEY
    );


    addMessage(
        "SYSTEM: Gemini API key updated.",
        "ai"
    );
};


// ============================================================
// 15. DELETE API KEY
// ============================================================

window.removeJarvisKey = function () {

    localStorage.removeItem(
        "jarvis_key"
    );


    API_KEY = "";


    addMessage(
        "SYSTEM: Gemini API key removed.",
        "ai"
    );
};


// ============================================================
// 16. STARTUP MESSAGE
// ============================================================

if (chat && MEMORY.length === 0) {

    addMessage(
        "J.A.R.V.I.S: Systems online. How may I assist you, Boss?",
        "ai"
    );
}


console.log(
    "J.A.R.V.I.S Mobile Edition initialized."
);

One important correction

I changed the API authentication to the documented "x-goog-api-key" header and kept "generateContent" for both text and inline image requests. Google's current API documentation shows this authentication method and the "inline_data" image structure.

Your HTML needs these IDs for the script to connect correctly:

chat
msg
send
mic-btn
clear-btn
cam-btn
img-input

And your camera input should look roughly like:

<input
    type="file"
    id="img-input"
    accept="image/*"
    capture="environment"
    hidden
>

Security note: because this is a GitHub Pages/browser application, an API key stored in "localStorage" is accessible to the browser. Google recommends protecting API keys; for a public JARVIS deployment, moving the Gemini request to a backend is safer.
