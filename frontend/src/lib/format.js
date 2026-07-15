import { ORDER_STATUSES } from "./constants";

export function statusConfig(value) {
  return (
    ORDER_STATUSES.find((s) => s.value === value) ?? {
      label: value,
      color: "#7c85a8",
      bg: "rgba(124,133,168,0.1)",
      border: "rgba(124,133,168,0.2)",
    }
  );
}

export function fmt(n) {
  return Math.round(n).toLocaleString("ja-JP");
}

export function fmtDate(s) {
  return new Date(s).toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
