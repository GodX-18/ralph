import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface AIConfig {
  provider: string;
  api_key: string;
  endpoint: string;
  model: string;
}

interface AppConfig {
  ai: AIConfig;
  hotkey: string;
  theme: string;
}

interface SettingsProps {
  onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await invoke<AppConfig>("read_config");
      setConfig(cfg);
    } catch (e) {
      console.error("Failed to load config:", e);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    setMessage("");
    try {
      await invoke("write_config", { config });
      setMessage("Settings saved!");
      setTimeout(() => setMessage(""), 2000);
    } catch (e) {
      setMessage(`Failed: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const updateAI = (field: keyof AIConfig, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      ai: { ...config.ai, [field]: value },
    });
  };

  if (loading) {
    return <div className="loading">Loading settings...</div>;
  }

  if (!config) {
    return <div className="error">Failed to load configuration</div>;
  }

  return (
    <div className="settings">
      <div className="settings-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Settings</h1>
      </div>

      <section className="settings-section">
        <h2>AI Configuration</h2>

        <div className="form-group">
          <label htmlFor="provider">Provider</label>
          <select
            id="provider"
            value={config.ai.provider}
            onChange={(e) => updateAI("provider", e.target.value)}
          >
            <option value="openai">OpenAI</option>
            <option value="claude">Claude</option>
            <option value="deepseek">DeepSeek</option>
            <option value="minimax">MiniMax</option>
            <option value="ollama">Ollama (Local)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="api_key">API Key</label>
          <input
            id="api_key"
            type="password"
            value={config.ai.api_key}
            onChange={(e) => updateAI("api_key", e.target.value)}
            placeholder="Enter your API key"
          />
        </div>

        <div className="form-group">
          <label htmlFor="endpoint">Endpoint</label>
          <input
            id="endpoint"
            type="text"
            value={config.ai.endpoint}
            onChange={(e) => updateAI("endpoint", e.target.value)}
            placeholder="https://api.openai.com/v1"
          />
        </div>

        <div className="form-group">
          <label htmlFor="model">Model</label>
          <input
            id="model"
            type="text"
            value={config.ai.model}
            onChange={(e) => updateAI("model", e.target.value)}
            placeholder="gpt-4"
          />
        </div>
      </section>

      <section className="settings-section">
        <h2>Hotkey</h2>
        <div className="form-group">
          <label htmlFor="hotkey">Global Shortcut</label>
          <input
            id="hotkey"
            type="text"
            value={config.hotkey}
            onChange={(e) =>
              setConfig({ ...config, hotkey: e.target.value })
            }
            placeholder="CmdOrCtrl+Shift+P"
          />
          <small>Press the hotkey to trigger optimization</small>
        </div>
      </section>

      <div className="settings-actions">
        <button
          className="save-btn"
          onClick={saveConfig}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {message && <span className="message">{message}</span>}
      </div>
    </div>
  );
}
