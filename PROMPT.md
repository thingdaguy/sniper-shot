Build a Chrome Extension (Manifest V3) that acts as a lightweight AI assistant overlay using the Gemini API.

---

# 🧠 Core Goal

Create a low-profile floating AI widget that:

* Lets user type a custom prompt
* Can also analyze the current page via hotkey
* Injects minimal UI into the page
* Uses Gemini API for responses

---

# 🧩 Architecture Overview

Files:

* manifest.json
* background.js
* content.js

Separation of concerns:

* content.js → UI + prompt system + API call
* page layer → ONLY extract page data
* UI layer → handles prompt templates and building

---

# 🎯 UI Behavior (Floating Widget)

* Fixed position bottom-right
* Size: ~220px width
* Dark minimal UI
* Must NOT affect page layout (`position: fixed`)
* Inject ONLY when needed (lazy mount)
* Remove completely when destroyed

UI contains:

* Input field (manual prompt)
* Output text area (plain text)

---

# 🕵️ Stealth / Low Profile Requirements

* Inject ONLY one root container
* Use Shadow DOM (closed mode):
  element.attachShadow({ mode: "closed" })
* Use randomized container ID
* Do NOT:

  * Modify existing DOM elements
  * Use global variables (window.*)
  * Inject scripts into page context
* UI must only exist when active
* Destroy removes everything cleanly

---

# ⌨️ Hotkeys (chrome.commands)

* Ctrl + Shift + L → Toggle UI
* Ctrl + Shift + K → Quick Analyze Page
* Ctrl + Shift + X → Kill extension (destroy completely)
* Esc → Hide UI

---

# 🧠 Prompt System (UI Layer ONLY)

IMPORTANT:

* Prompt logic must live inside UI layer
* Content/page logic must NOT contain prompt templates

---

## Prompt Templates (inside UI)

Define:

* summarize → "Summarize this page and extract key insights:"
* explain → "Explain this content in simple terms:"

---

## Manual Mode

Flow:

1. User opens UI
2. Types custom prompt
3. UI calls extractPageContext()
4. UI builds final prompt
5. Send to Gemini

---

## Quick Analyze Mode (Hotkey)

Flow:

1. User presses Ctrl + Shift + K
2. UI uses predefined template (summarize)
3. UI calls extractPageContext()
4. UI builds final prompt
5. Send to Gemini
6. Auto-show UI with result

---

## Prompt Builder Function

Implement:

buildPrompt(templateOrInput, context)

This combines:

* Template OR user input
* Page context:

  * title
  * URL
  * content
  * selection

---

# 🌐 Page Context Extraction (Content Layer ONLY)

Implement:

extractPageContext()

Return:

* document.title
* location.href
* window.getSelection().toString()
* document.body.innerText.slice(0, 3000)

IMPORTANT:

* Keep lightweight
* No heavy DOM traversal

---

# 🤖 Gemini API Integration

Endpoint:

https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY

Request:

{
contents: [
{
parts: [
{ text: fullPrompt }
]
}
]
}

Response:

data.candidates[0].content.parts[0].text

---

# ⚙️ Behavior Flow

## Manual Mode

1. Ctrl + Shift + L
2. UI opens
3. User types prompt
4. Press Enter
5. Show response

---

## Quick Analyze Mode

1. Ctrl + Shift + K
2. Extract page context
3. Use summarize template
4. Send request
5. Show UI with result

---

## Hide

* Esc → hide UI

---

## Kill

* Ctrl + Shift + X
* Remove UI
* Stop all logic permanently

---

# ❌ Error Handling

If ANY error occurs:

* Immediately destroy UI
* Stop execution completely
* No retry
* No UI error display

---

# 🧱 background.js

* Listen to:

  * "toggle"
  * "kill"
  * "analyze"
* Send message to active tab

---

# 🧱 content.js

State:

* alive (boolean)
* visible (boolean)

Functions:

* createUI()
* toggleUI()
* hideUI()
* destroy()
* extractPageContext()
* buildPrompt()
* askGemini()
* runQuickAnalyze()

---

# 🎨 UI Implementation Details

Container:

* position: fixed
* bottom: 10px
* right: 10px
* z-index: 999999999

Inside Shadow DOM:

* input box
* output text

Style:

* small font
* subtle colors
* minimal padding

---

# ⚡ Performance Constraints

* No polling
* No intervals
* No unnecessary DOM updates
* Only run when triggered

---

# 🔐 Security Constraints

* No storage
* No localStorage
* No chrome.storage
* API key used directly (development only)

---

# ✅ Expected Output

Generate full working code for:

* manifest.json
* background.js
* content.js

Code must be:

* clean
* minimal
* well-structured
* production-like
