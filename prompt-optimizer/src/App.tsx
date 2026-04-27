import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ResultModal } from "./components/ResultModal";
import { Settings } from "./components/Settings";
import "./App.css";

interface AppConfig {
  ai: {
    provider: string;
    api_key: string;
    endpoint: string;
    model: string;
  };
  hotkey: string;
  theme: string;
}

function App() {
  const [view, setView] = useState<"main" | "settings">("main");
  const [isLoading, setIsLoading] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [optimizedText, setOptimizedText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unlisten = listen("hotkey-triggered", async () => {
      console.log("Hotkey triggered!");
      await handleOptimize();
    });

    registerHotkey();

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const registerHotkey = async () => {
    try {
      const config = await invoke<AppConfig>("read_config");
      await invoke("register_hotkey", { hotkey: config.hotkey });
    } catch (e) {
      console.error("Failed to register hotkey:", e);
    }
  };

  const handleOptimize = async () => {
    setIsLoading(true);
    setError("");

    try {
      const clipboardText = await invoke<string>("get_clipboard_text");
      if (!clipboardText || clipboardText.trim() === "") {
        setError("Clipboard is empty");
        setIsLoading(false);
        return;
      }

      setOriginalText(clipboardText);

      const config = await invoke<AppConfig>("read_config");
      const { provider, api_key, endpoint, model } = config.ai;

      const prompt = `Optimize the following prompt to make it more effective for AI interaction. Only return the optimized prompt, no explanations.\n\nOriginal prompt:\n${clipboardText}`;

      let response: Response;
      let optimized: string = "";

      if (provider === "deepseek") {
        // DeepSeek uses OpenAI-compatible API
        response = await fetch(`${endpoint}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${api_key}`,
          },
          body: JSON.stringify({
            model: model || "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        optimized = data.choices[0]?.message?.content || "";
      } else if (provider === "minimax") {
        // MiniMax API format
        response = await fetch(`${endpoint}/text/chatcompletion_v2`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${api_key}`,
          },
          body: JSON.stringify({
            model: model || "MiniMax-Text-01",
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        // MiniMax returns: data.choices[0].messages[0].text
        optimized = data.choices?.[0]?.messages?.[0]?.text || "";
      } else {
        // OpenAI and compatible APIs (Claude via OpenAI-compatible endpoint, Ollama)
        response = await fetch(`${endpoint}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${api_key}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        optimized = data.choices[0]?.message?.content || "";
      }

      setOptimizedText(optimized);
      setShowModal(true);
    } catch (e) {
      setError(`Optimization failed: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    await invoke("set_clipboard_text", { text: optimizedText });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setOriginalText("");
    setOptimizedText("");
  };

  const handleMinimize = async () => {
    const window = getCurrentWindow();
    await window.hide();
  };

  return (
    <div className="app">
      {view === "settings" ? (
        <Settings onBack={() => setView("main")} />
      ) : (
        <div className="main-view">
          <header className="app-header">
            <h1>Prompt Optimizer</h1>
            <div className="header-actions">
              <button className="settings-btn" onClick={() => setView("settings")}>
                Settings
              </button>
              <button className="minimize-btn" onClick={handleMinimize}>
                Minimize to Tray
              </button>
            </div>
          </header>

          <main className="app-main">
            <div className="hero">
              <p>Press <kbd>Cmd/Ctrl+Shift+P</kbd> to optimize your clipboard content</p>
              <button
                className="optimize-btn"
                onClick={handleOptimize}
                disabled={isLoading}
              >
                {isLoading ? "Optimizing..." : "Optimize Now"}
              </button>
              {error && <div className="error-message">{error}</div>}
            </div>
          </main>
        </div>
      )}

      <ResultModal
        isOpen={showModal}
        originalText={originalText}
        optimizedText={optimizedText}
        onClose={handleCloseModal}
        onCopy={handleCopy}
      />
    </div>
  );
}

export default App;
