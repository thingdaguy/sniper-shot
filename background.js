const COMMAND_TO_TYPE = {
  toggle: "toggle",
  analyze: "analyze",
  kill: "kill",
};

const STORAGE_KEYS = {
  prompt: "savedPrompt",
  apiKey: "savedApiKey",
  result: "lastResult",
};
  const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
async function getActiveTabId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs || tabs.length === 0) return null;
  return tabs[0].id ?? null;
}

async function sendToActiveTab(type, payload) {
  const tabId = await getActiveTabId();
  if (tabId == null) return;

  // Ignore errors when content script isn't ready on the current page.
  await chrome.tabs.sendMessage(tabId, { type, ...(payload || {}) }).catch(() => {});
}

function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (items) => resolve(items || {}));
  });
}

function storageSet(items) {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, () => resolve());
  });
}

async function askGemini(apiKey, fullPrompt) {
  const url = GEMINI_ENDPOINT + "?key=" + encodeURIComponent(apiKey);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: fullPrompt }],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("BACKGROUND: " + String(res));
    console.error("BACKGROUND: Error: Gemini request failed with status " + res.status + " and body " + (body ? body : "no body"));
    throw new Error("Gemini request failed with status " + res.status);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Gemini response missing text");
  }
  return text.trim();
}

function buildPrompt(userPrompt, context) {
  const prompt = String(userPrompt ?? "").trim();
  if (!prompt) throw new Error("Saved prompt is empty");

  return (
    prompt +
    "\n\n" +
    "Title: " +
    context.title +
    "\n" +
    "URL: " +
    context.url +
    "\n" +
    "Selection: " +
    context.selection +
    "\n\n" +
    "Content:\n" +
    context.content
  );
}

async function runAnalyzeAndStore() {
  const tabId = await getActiveTabId();
  if (tabId == null) {
    await storageSet({ [STORAGE_KEYS.result]: "Error: No active tab" });
    return;
  }

  const cfg = await storageGet([STORAGE_KEYS.prompt, STORAGE_KEYS.apiKey]);
  const prompt = String(cfg[STORAGE_KEYS.prompt] ?? "").trim();
  const apiKey = String(cfg[STORAGE_KEYS.apiKey] ?? "").trim();

  if (!prompt) {
    await storageSet({ [STORAGE_KEYS.result]: "Error: Missing saved prompt in popup." });
    return;
  }
  if (!apiKey) {
    await storageSet({ [STORAGE_KEYS.result]: "Error: Missing Gemini API key in popup." });
    return;
  }

  const contextResp = await chrome.tabs.sendMessage(tabId, { type: "extractPageContext" }).catch(() => null);
  if (!contextResp?.ok) {
    await storageSet({ [STORAGE_KEYS.result]: "Error: Content script not ready on this page." });
    console.error("BACKGROUND: Error: Content script not ready on this page.");
    return;
  }

  try {
    const fullPrompt = buildPrompt(prompt, contextResp.context);
    console.log("BACKGROUND: ",fullPrompt);
    const result = await askGemini(apiKey, fullPrompt);
    console.log(result);
    await storageSet({ [STORAGE_KEYS.result]: result });
  } catch (err) {
    console.log("BACKGROUND: ",err);
    const message = String(err?.message || err);
    await storageSet({ [STORAGE_KEYS.result]: "Error: " + message });
    console.log(err);
  }
}

chrome.commands.onCommand.addListener((command) => {
  const type = COMMAND_TO_TYPE[command];
  if (!type) return;

  if (type === "kill") {
    void sendToActiveTab(type);
    return;
  }

  if (type === "analyze") {
    // Ctrl+Shift+K: send silently and store result only.
    void runAnalyzeAndStore();
    return;
  }

  if (type === "toggle") {
    // Ctrl+Shift+L: toggle open/close; when opening, display last saved result.
    void storageGet([STORAGE_KEYS.result]).then((items) => {
      const result = String(items[STORAGE_KEYS.result] ?? "No saved result yet. Press Ctrl+Shift+K first.");
      return sendToActiveTab("toggle", { result });
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.type !== "string") return;

  if (msg.type === "saveConfig") {
    const prompt = String(msg.prompt ?? "").trim();
    const apiKey = String(msg.apiKey ?? "").trim();
    void storageSet({
      [STORAGE_KEYS.prompt]: prompt,
      [STORAGE_KEYS.apiKey]: apiKey,
    }).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "getConfig") {
    void storageGet([STORAGE_KEYS.prompt, STORAGE_KEYS.apiKey]).then((items) => {
      sendResponse({
        ok: true,
        prompt: String(items[STORAGE_KEYS.prompt] ?? ""),
        apiKey: String(items[STORAGE_KEYS.apiKey] ?? ""),
      });
    });
    return true;
  }
});

