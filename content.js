(() => {
  // Content script now only toggles and displays stored response text.
  let alive = true;
  let visible = false;

  let containerEl = null;
  let shadowRoot = null;
  let outputEl = null;

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
    const title = document.title || "";
    const url = location.href || "";

    let selection = "";
    try {
      selection = String(getSelection?.().toString?.() || "").trim();
    } catch {
      selection = "";
    }

    let content = "";
    try {
      const bodyText = document.body?.innerText || "";
      content = String(bodyText).slice(0, 3000);
    } catch {
      content = "";
    }

    return { title, url, selection, content };
  }

  function ensureUI() {
    if (!alive) return;
    if (visible) return;

    containerEl = document.createElement("div");
    containerEl.id = randomContainerId();
    containerEl.style.position = "fixed";
    containerEl.style.bottom = "10px";
    containerEl.style.right = "10px";
    containerEl.style.zIndex = "999999999";
    containerEl.style.width = "220px";
    containerEl.style.pointerEvents = "auto";

    const parent = document.body || document.documentElement;
    parent.appendChild(containerEl);
    shadowRoot = containerEl.attachShadow({ mode: "closed" });

    shadowRoot.innerHTML = `
      <style>
        :host { all: initial; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }
        .wrap{
          background: rgba(16,16,16,0.96);
          color: #eaeaea;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 12px;
          box-shadow: 0 18px 45px rgba(0,0,0,0.45);
          padding: 10px;
          backdrop-filter: blur(6px);
        }
        textarea{
          width: 100%;
          height: 120px;
          box-sizing: border-box;
          background: rgba(0,0,0,0.55);
          color: #d7d7d7;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 10px;
          padding: 8px 9px;
          outline: none;
          font-size: 12px;
          resize: none;
          white-space: pre-wrap;
          overflow: auto;
        }
        .meta{
          margin-top: 7px;
          font-size: 11px;
          color: rgba(255,255,255,0.62);
          line-height: 1.2;
          user-select: none;
        }
      </style>
      <div class="wrap">
        <textarea id="out" readonly></textarea>
        <div class="meta">Ctrl+Shift+L to close</div>
      </div>
    `;

    outputEl = shadowRoot.getElementById("out");

    visible = true;
  }

  function setOutput(text) {
    if (!outputEl) return;
    outputEl.value = String(text ?? "");
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

