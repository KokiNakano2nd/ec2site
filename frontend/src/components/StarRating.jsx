import { useState } from "react";

export function StarRating({ value, onChange, readonly = false, size = 18 }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => !readonly && onChange && onChange(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          style={{
            fontSize: size,
            cursor: readonly ? "default" : "pointer",
            color: star <= active ? "#f59e0b" : "rgba(255,255,255,0.15)",
            transition: "color 0.1s",
            lineHeight: 1,
          }}
        >★</span>
      ))}
    </div>
  );
}
