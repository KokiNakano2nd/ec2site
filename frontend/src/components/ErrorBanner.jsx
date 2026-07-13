import { C } from "../lib/constants";

export function ErrorBanner({ children, size = "md", style }) {
  const sizes = {
    md: { padding: "16px 20px", fontSize: 14, marginBottom: 20 },
    sm: { padding: "12px 16px", fontSize: 13 },
  };
  return (
    <div
      style={{
        color: C.red,
        background: "rgba(255,107,107,0.08)",
        border: "1px solid rgba(255,107,107,0.2)",
        borderRadius: 12,
        ...sizes[size],
        ...style,
      }}
    >
      {children}
    </div>
  );
}
