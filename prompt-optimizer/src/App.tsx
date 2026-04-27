import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ResultModal } from "./components/ResultModal";
import { Settings } from "./components/Settings";
import { History } from "./components/History";
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

interface HistoryEntry {
  id: number;
  timestamp: string;
  original: string;
  optimized: string;
}

type View = "main" | "settings" | "history";

function App() {
  const [view, setView] = useState<View>("main");
  const [isLoading, setIsLoading] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [optimizedText, setOptimizedText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [inputText, setInputText] = useState("");

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
      const textToOptimize = inputText.trim() || await invoke<string>("get_clipboard_text");

      if (!textToOptimize || textToOptimize.trim() === "") {
        setError("Please enter text or copy something to clipboard");
        setIsLoading(false);
        return;
      }

      setOriginalText(textToOptimize);

      const config = await invoke<AppConfig>("read_config");
      const { provider, api_key, endpoint, model } = config.ai;

      const prompt = `Optimize the following prompt to make it more effective for AI interaction. Only return the optimized prompt, no explanations.\n\nOriginal prompt:\n${textToOptimize}`;

      let response: Response;
      let optimized: string = "";

      if (provider === "deepseek") {
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
        optimized = data.choices?.[0]?.messages?.[0]?.text || "";
      } else {
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

      // Save to history
      await invoke("add_history_entry", { original: textToOptimize, optimized });

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

  const handleSelectHistory = (entry: HistoryEntry) => {
    setInputText(entry.original);
    setOptimizedText(entry.optimized);
    setOriginalText(entry.original);
    setShowModal(true);
    setView("main");
  };

  return (
    <div className="app">
      {view === "settings" ? (
        <Settings onBack={() => setView("main")} />
      ) : view === "history" ? (
        <History onBack={() => setView("main")} onSelect={handleSelectHistory} />
      ) : (
        <div className="main-view">
          <header className="app-header">
            <h1>Prompt Optimizer</h1>
            <div className="header-actions">
              <button className="history-btn" onClick={() => setView("history")}>
                History
              </button>
              <button className="settings-btn" onClick={() => setView("settings")}>
                Settings
              </button>
              <button className="minimize-btn" onClick={handleMinimize}>
                Minimize to Tray
              </button>
            </div>
          </header>

          <main className="app-main">
            <div className="optimizer-container">
              <h2>Enter your prompt</h2>
              <textarea
                className="prompt-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your prompt here..."
                rows={6}
              />
              <button
                className="optimize-btn"
                onClick={handleOptimize}
                disabled={isLoading}
              >
                {isLoading ? "Optimizing..." : "Optimize"}
              </button>
              {error && <div className="error-message">{error}</div>}
              <p className="hint">
                Or press <kbd>Cmd/Ctrl+Shift+P</kbd> to use clipboard content
              </p>
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