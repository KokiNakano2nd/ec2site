import { C } from "../lib/constants";

export function FieldLabel({ children }) {
  return (
    <label
      style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sec, marginBottom: 7, letterSpacing: "0.3px" }}
    >
      {children}
    </label>
  );
}
