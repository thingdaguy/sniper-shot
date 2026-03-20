(() => {
  // Content script now only toggles and displays stored response text.
  let alive = true;
  let visible = false;

  let containerEl = null;
  let shadowRoot = null;
  let outputEl = null;
  const MAX_WORDS_PER_REQUEST = 10000;

  function randomContainerId() {
    return (
      "gemini_overlay_" + Math.random().toString(36).slice(2) + "_" + Date.now().toString(36)
    );
  }

  function destroyUI({ permanent } = {}) {
    if (containerEl && containerEl.parentNode) {
      containerEl.parentNode.removeChild(containerEl);
    }

    containerEl = null;
    shadowRoot = null;
    outputEl = null;
    visible = false;

    if (permanent) alive = false;
  }

  function extractPageContext() {
    let content = "";
    try {
      const bodyText = document.body?.innerText || "";
      const rawText = String(bodyText);
      const startMarker = "Câu hỏi";
      const endMarker = "Clear my choice";

      let extracted = rawText;
      const startIdx = rawText.indexOf(startMarker);
      if (startIdx !== -1) {
        const endIdx = rawText.indexOf(endMarker, startIdx);
        if (endIdx !== -1) {
          extracted = rawText.slice(startIdx, endIdx + endMarker.length);
        }
      }

      content = extracted.slice(0, MAX_WORDS_PER_REQUEST);
    } catch {
      content = "";
    }
    console.log("CONTENT: extracted content", content);
    return { content };
  }

  function ensureUI() {
    if (!alive) return;
    if (visible) return;

    containerEl = document.createElement("div");
    containerEl.id = randomContainerId();
    containerEl.style.position = "fixed";
    containerEl.style.bottom = "2px";
    containerEl.style.right = "6px";
    containerEl.style.zIndex = "999999999";
    containerEl.style.pointerEvents = "none"; 

    const parent = document.body || document.documentElement;
    parent.appendChild(containerEl);

    shadowRoot = containerEl.attachShadow({ mode: "closed" });

    shadowRoot.innerHTML = `
      <style>
        :host { all: initial; }

        .bar {
          font-family: system-ui, Arial;
          font-size: 10px;
          color: rgba(255,255,255,0.75);
          background: rgba(0,0,0,0.55);
          padding: 2px 6px;
          border-radius: 6px;
          max-width: 700px;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;

          backdrop-filter: blur(4px);
        }
      </style>

      <div class="bar" id="out"></div>
    `;

    outputEl = shadowRoot.getElementById("out");

    visible = true;
    console.log("CONTENT: open UI")
  }

  function setOutput(text) {
    if (!outputEl) return;
    outputEl.textContent = String(text ?? "");
    console.log("CONTENT: change output text "+text)
  }

  function toggleResult(resultText) {
    if (!alive) return;
    if (visible) {
      destroyUI({ permanent: false });
      return;
    }

    try {
      ensureUI();
      setOutput(resultText || "No saved result yet. Press Ctrl+Shift+K first.");
    } catch {
      return;
    }
  }

  function kill() {
    destroyUI({ permanent: true });
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || typeof msg.type !== "string") return;

    if (!alive && msg.type !== "kill" && msg.type !== "extractPageContext") return;

    try {
      if (msg.type === "extractPageContext") {
        const context = extractPageContext();
        sendResponse({ ok: true, context });
        return;
      }

      if (msg.type === "kill") {
        kill();
        sendResponse({ ok: true });
        return;
      }

      if (msg.type === "toggle") {
        toggleResult(msg.result);
        sendResponse({ ok: true });
        return;
      }

      if (msg.type === "analyze") {
        sendResponse({ ok: true });
        return;
      }
    } catch (err) {
      sendResponse({ ok: false, error: String(err?.message || err) });
    }
  });
})();

