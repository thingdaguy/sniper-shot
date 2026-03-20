(() => {
  const els = {
    prompt: document.getElementById("prompt"),
    apiKey: document.getElementById("apiKey"),
    model: document.getElementById("model"),
    save: document.getElementById("save"),
    status: document.getElementById("status"),
  };

  function setStatus(text) {
    if (els.status) els.status.textContent = text;
  }

  function sendMessage(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (resp) => {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(resp);
      });
    });
  }

  async function loadConfig() {
    const resp = await sendMessage({ type: "getConfig" });
    const prompt = resp?.ok ? String(resp.prompt || "") : "";
    const apiKey = resp?.ok ? String(resp.apiKey || "") : "";
    const model = resp?.ok ? String(resp.model || "") : "";
    els.prompt.value = prompt;
    els.apiKey.value = apiKey;
    if (els.model) els.model.value = model || els.model.value;
    setStatus("Ready. Save prompt + API key.");
    try {
      els.prompt.focus();
    } catch {
      // ignore
    }
  }

  els.save.addEventListener("click", async () => {
    const prompt = String(els.prompt.value ?? "").trim();
    const apiKey = String(els.apiKey.value ?? "").trim();
    const model = String(els.model?.value ?? "").trim();
    if (!prompt || !apiKey || !model) {
      setStatus("Prompt, API key, and model are required.");
      return;
    }

    els.save.disabled = true;
    setStatus("Saving...");

    const resp = await sendMessage({ type: "saveConfig", prompt, apiKey, model });
    els.save.disabled = false;

    if (resp?.ok) setStatus("Saved. Ctrl+Shift+K runs, Ctrl+Shift+L toggles result.");
    else setStatus("Save failed. Reload extension.");
  });

  els.prompt.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    els.save.click();
  });

  void loadConfig();
})();

