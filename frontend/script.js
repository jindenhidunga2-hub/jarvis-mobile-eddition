// ============================================================
// J.A.R.V.I.S MOBILE EDITION
// Complete browser script
// SEND + GEMINI + MEMORY + MICROPHONE + VOICE + CAMERA
// ============================================================

"use strict";

// ============================================================
// 1. DOM ELEMENTS
// ============================================================

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");
const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");

// Safety check
if (!chat || !input || !sendBtn) {
    console.error("J.A.R.V.I.S: Required HTML elements are missing.");
}


// ============================================================
// 2. GEMINI API KEY
// ============================================================

// The key is stored only in this browser's localStorage.
// For a public website, a backend/server proxy is safer.

let API_KEY = localStorage.getItem("jarvis_api_key");

if (!API_KEY) {
    API_KEY = prompt("Enter your Gemini API Key:");

    if (API_KEY) {
        API_KEY = API_KEY.trim();
        localStorage.setItem("jarvis_api_key", API_KEY);
    }
}


// ============================================================
// 3. GEMINI MODELS
// ============================================================

// Use currently available model names.
// If one model fails, the next one is tried.

const MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite"
];


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
    MEMORY = [];
}


// ============================================================
// 5. SAVE MEMORY
// ============================================================

function saveMemory() {
    try {
        // Keep memory reasonably small
        MEMORY = MEMORY.slice(-30);

        localStorage.setItem(
            "jarvis_memory",
            JSON.stringify(MEMORY)
        );
    } catch (error) {
        console.error("Memory save error:", error);
    }
}


// ============================================================
// 6. ADD CHAT MESSAGE
// ============================================================

function addMessage(text, type = "ai") {

    if (!chat) return;

    const message = document.createElement("div");

    message.className = type;

    message.textContent = text;

    chat.appendChild(message);

    chat.scrollTop = chat.scrollHeight;

    return message;
}


// ============================================================
// 7. LOAD PREVIOUS CHAT
// ============================================================

function loadMemory() {

    if (!MEMORY.length) {
        addMessage(
            "J.A.R.V.I.S: Systems online. How may I assist you, Boss?",
            "ai"
        );

        return;
    }

    MEMORY.forEach((item) => {

        if (!item || !item.role || !item.text) {
            return;
        }

        if (item.role === "user") {
            addMessage("YOU: " + item.text, "user");
        } else {
            addMessage("J.A.R.V.I.S: " + item.text, "ai");
        }
    });
}


// ============================================================
// 8. CLEAR MEMORY
// ============================================================

if (clearBtn) {

    clearBtn.addEventListener("click", () => {

        const confirmed = confirm(
            "Clear J.A.R.V.I.S memory?"
        );

        if (!confirmed) return;

        MEMORY = [];

        localStorage.removeItem("jarvis_memory");

        if (chat) {
            chat.innerHTML = "";
        }

        addMessage(
            "J.A.R.V.I.S: Memory cleared. Systems remain operational.",
            "ai"
        );
    });
}


// ============================================================
// 9. GEMINI REQUEST
// ============================================================

async function callGemini(prompt, imageData = null) {

    if (!API_KEY) {
        throw new Error(
            "Gemini API key is missing."
        );
    }

    const contents = [];

    // Add recent conversation context
    const recentMemory = MEMORY.slice(-12);

    recentMemory.forEach((item) => {

        if (!item || !item.text) return;

        contents.push({
            role: item.role === "user"
                ? "user"
                : "model",

            parts: [
                {
                    text: item.text
                }
            ]
        });
    });

    // Current user message
    const parts = [
        {
            text:
                "You are J.A.R.V.I.S, a helpful personal AI assistant. " +
                "Be concise, clear, friendly and useful. " +
                "Address the user as Boss when appropriate.\n\n" +
                prompt
        }
    ];

    // Add image if supplied
    if (imageData) {

        parts.push({
            inline_data: {
                mime_type: imageData.mimeType,
                data: imageData.base64
            }
        });
    }

    contents.push({
        role: "user",
        parts: parts
    });


    let lastError = "Unknown Gemini error.";

    for (const model of MODELS) {

        try {

            const url =
                "https://generativelanguage.googleapis.com/" +
                "v1beta/models/" +
                encodeURIComponent(model) +
                ":generateContent?key=" +
                encodeURIComponent(API_KEY);

            const response = await fetch(url, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    contents: contents,

                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1000
                    }
                })
            });


            let data = null;

            try {
                data = await response.json();
            } catch (jsonError) {
                data = null;
            }


            // Successful response
            if (response.ok) {

                const text =
                    data?.candidates?.[0]?.content?.parts
                        ?.map(part => part.text || "")
                        .join("")
                        .trim();

                if (text) {
                    return text;
                }

                lastError =
                    "Gemini returned an empty response.";

                continue;
            }


            // Extract Gemini error
            const apiError =
                data?.error?.message ||
                `HTTP ${response.status}`;

            lastError =
                `${model}: ${apiError}`;

            // Invalid authentication/key
            if (
                response.status === 400 ||
                response.status === 401 ||
                response.status === 403
            ) {
                throw new Error(lastError);
            }

            // Otherwise try next model
        }

        catch (error) {

            lastError =
                error?.message ||
                String(error);

            // Authentication errors should not keep retrying
            if (
                /API key/i.test(lastError) ||
                /authentication/i.test(lastError) ||
                /credential/i.test(lastError) ||
                /permission/i.test(lastError)
            ) {
                throw new Error(lastError);
            }
        }
    }


    throw new Error(lastError);
}


// ============================================================
// 10. SEND MESSAGE
// ============================================================

async function sendMessage() {

    const text = input?.value?.trim();

    // Prevent empty messages
    if (!text) {
        return;
    }


    // Display user message
    addMessage(
        "YOU: " + text,
        "user"
    );


    // Clear input immediately
    input.value = "";


    // Save user message
    MEMORY.push({
        role: "user",
        text: text,
        time: Date.now()
    });

    saveMemory();


    // Processing message
    const processingMessage = addMessage(
        "J.A.R.V.I.S: Processing...",
        "ai"
    );


    // Disable button while processing
    sendBtn.disabled = true;


    try {

        const reply = await callGemini(text);


        // Replace processing message
        if (processingMessage) {
            processingMessage.textContent =
                "J.A.R.V.I.S: " + reply;
        }


        // Save AI response
        MEMORY.push({
            role: "assistant",
            text: reply,
            time: Date.now()
        });

        saveMemory();


        // Speak response
        speak(reply);

    }

    catch (error) {

        const errorText =
            error?.message ||
            "Unknown error.";

        if (processingMessage) {

            processingMessage.textContent =
                "J.A.R.V.I.S: ERROR - " +
                errorText;
        }

        console.error(
            "J.A.R.V.I.S ERROR:",
            error
        );
    }


    finally {

        sendBtn.disabled = false;

        input.focus();
    }
}


// ============================================================
// 11. SEND BUTTON
// ============================================================

if (sendBtn) {

    sendBtn.addEventListener(
        "click",
        sendMessage
    );
}


// ============================================================
// 12. ENTER KEY
// ============================================================

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


// ============================================================
// 13. TEXT TO SPEECH
// ============================================================

let speechEnabled = true;

function speak(text) {

    if (!speechEnabled) return;

    if (!("speechSynthesis" in window)) {
        return;
    }

    try {

        window.speechSynthesis.cancel();

        const utterance =
            new SpeechSynthesisUtterance(text);

        utterance.lang = "en-US";

        utterance.rate = 1.0;

        utterance.pitch = 1.0;

        utterance.volume = 1.0;

        window.speechSynthesis.speak(
            utterance
        );

    } catch (error) {

        console.error(
            "Voice error:",
            error
        );
    }
}


// ============================================================
// 14. MICROPHONE / SPEECH RECOGNITION
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


    recognition.onstart = function () {

        if (micBtn) {
            micBtn.textContent = "🔴";
        }
    };


    recognition.onresult = function (event) {

        const result =
            event.results?.[0]?.[0]?.transcript;

        if (!result) return;

        input.value = result;

        sendMessage();
    };


    recognition.onerror = function (event) {

        console.error(
            "Microphone error:",
            event.error
        );

        if (micBtn) {
            micBtn.textContent = "🎙️";
        }
    };


    recognition.onend = function () {

        if (micBtn) {
            micBtn.textContent = "🎙️";
        }
    };
}


// Microphone button
if (micBtn) {

    micBtn.addEventListener(
        "click",
        function () {

            if (!recognition) {

                addMessage(
                    "J.A.R.V.I.S: Speech recognition is not supported by this browser.",
                    "ai"
                );

                return;
            }

            try {

                recognition.start();

            } catch (error) {

                console.error(
                    "Recognition start error:",
                    error
                );
            }
        }
    );
}


// ============================================================
// 15. CAMERA / IMAGE
// ============================================================

if (camBtn && imgInput) {

    camBtn.addEventListener(
        "click",
        function () {

            imgInput.click();

        }
    );
}


// ============================================================
// 16. IMAGE PROCESSING
// ============================================================

if (imgInput) {

    imgInput.addEventListener(
        "change",
        async function () {

            const file =
                imgInput.files?.[0];

            if (!file) return;


            // Check image
            if (!file.type.startsWith("image/")) {

                addMessage(
                    "J.A.R.V.I.S: Please select an image file.",
                    "ai"
                );

                return;
            }


            addMessage(
                "YOU: 📷 Image uploaded",
                "user"
            );


            const processing =
                addMessage(
                    "J.A.R.V.I.S: Analyzing image...",
                    "ai"
                );


            try {

                const imageData =
                    await fileToBase64(file);


                const reply =
                    await callGemini(
                        "Analyze this image and describe what you see. " +
                        "Mention important objects, text, people, " +
                        "and useful visual details.",
                        imageData
                    );


                if (processing) {

                    processing.textContent =
                        "J.A.R.V.I.S: " +
                        reply;
                }


                MEMORY.push({
                    role: "assistant",
                    text: reply,
                    time: Date.now()
                });

                saveMemory();


                speak(reply);

            }

            catch (error) {

                if (processing) {

                    processing.textContent =
                        "J.A.R.V.I.S: IMAGE ERROR - " +
                        (error?.message || "Unknown error.");
                }

                console.error(
                    "Vision error:",
                    error
                );
            }


            // Reset input so same image can be selected again
            imgInput.value = "";
        }
    );
}


// ============================================================
// 17. FILE -> BASE64
// ============================================================

function fileToBase64(file) {

    return new Promise(
        (resolve, reject) => {

            const reader =
                new FileReader();


            reader.onload = function () {

                try {

                    const result =
                        reader.result;

                    const comma =
                        result.indexOf(",");

                    const base64 =
                        result.substring(
                            comma + 1
                        );

                    resolve({
                        mimeType: file.type,
                        base64: base64
                    });

                }

                catch (error) {

                    reject(error);
                }
            };


            reader.onerror = function () {

                reject(
                    new Error(
                        "Could not read image."
                    )
                );
            };


            reader.readAsDataURL(file);
        }
    );
}


// ============================================================
// 18. INITIAL SYSTEM MESSAGE
// ============================================================

loadMemory();


// ============================================================
// 19. CONSOLE STATUS
// ============================================================

console.log(
    "J.A.R.V.I.S Mobile Edition initialized."
);

console.log(
    "Send button:",
    !!sendBtn
);

console.log(
    "Microphone:",
    !!recognition
);

console.log(
    "Camera:",
    !!imgInput
);

console.log(
    "Memory entries:",
    MEMORY.length
);
