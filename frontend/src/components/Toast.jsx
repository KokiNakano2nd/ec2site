import { C } from "../lib/constants";

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#1a1e35",
        border: "1px solid rgba(91,139,245,0.25)",
        borderRadius: 12,
        padding: "14px 24px",
        color: C.text,
        fontSize: 14,
        fontWeight: 600,
        boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
        animation: "toastIn 0.3s ease",
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: 10,
        zIndex: 999,
      }}
    >
      <span style={{ color: C.green, fontSize: 16 }}>✓</span> {message}
    </div>
  );
}
