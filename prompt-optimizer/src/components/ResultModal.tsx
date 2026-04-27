import { useState } from "react";

interface ResultModalProps {
  isOpen: boolean;
  originalText: string;
  optimizedText: string;
  onClose: () => void;
  onCopy: () => void;
}

export function ResultModal({
  isOpen,
  originalText,
  optimizedText,
  onClose,
  onCopy,
}: ResultModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Optimization Result</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="text-comparison">
            <div className="text-section">
              <h3>Original</h3>
              <pre className="text-box">{originalText}</pre>
            </div>
            <div className="text-section">
              <h3>Optimized</h3>
              <pre className="text-box optimized">{optimizedText}</pre>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy Optimized"}
          </button>
        </div>
      </div>
    </div>
  );
}
