import { C } from "../lib/constants";

export function SkeletonCard() {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div className="skeleton" style={{ aspectRatio: "4/3" }} />
      <div style={{ padding: 18 }}>
        <div className="skeleton" style={{ height: 16, width: "70%", marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: "90%", marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 24, width: "40%" }} />
      </div>
    </div>
  );
}
