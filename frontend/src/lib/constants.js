export const C = {
  bg: "#09090f",
  surface: "#111422",
  dark: "#0d0f1f",
  text: "#e8eaf6",
  sec: "#7c85a8",
  muted: "#4a5270",
  border: "rgba(255,255,255,0.06)",
  accent: "#5b8bf5",
  green: "#22c55e",
  red: "#ff6b6b",
};

export const ORDER_STATUSES = [
  { value: "pending", label: "受付中", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
  {
    value: "processing",
    label: "処理中",
    color: "#5b8bf5",
    bg: "rgba(91,139,245,0.1)",
    border: "rgba(91,139,245,0.2)",
  },
  { value: "shipped", label: "発送済み", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)" },
  { value: "completed", label: "完了", color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.2)" },
  {
    value: "cancelled",
    label: "キャンセル済み",
    color: "#7c85a8",
    bg: "rgba(124,133,168,0.1)",
    border: "rgba(124,133,168,0.2)",
  },
  {
    value: "return_requested",
    label: "返品申請中",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
  },
  {
    value: "returned",
    label: "返品完了",
    color: "#ff6b6b",
    bg: "rgba(255,107,107,0.1)",
    border: "rgba(255,107,107,0.2)",
  },
];

export const PAGE_SIZE = 6;

export const CHART_COLORS = ["#5b8bf5", "#8b5cf6", "#22c55e", "#f59e0b", "#ff6b6b"];
