import matplotlib
matplotlib.use("Agg")
import matplotlib.font_manager as fm
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

FONT_PATH = "/home/test/EC_SITE/docs/study/.venv-pyspy/lib/python3.12/site-packages/japanize_matplotlib/fonts/ipaexg.ttf"
fm.fontManager.addfont(FONT_PATH)
jp_font = fm.FontProperties(fname=FONT_PATH)
plt.rcParams["font.family"] = jp_font.get_name()
plt.rcParams["font.size"] = 10.5
plt.rcParams["axes.edgecolor"] = "#444444"

T0 = 1783005890.862432010

# raw_data/multi_endpoint_run/requests_timing.log より
records = [
    ("bad-async-block#1", 1783005890.862432010, 1783005892.903972480),
    ("bad-async-block#2", 1783005890.863860395, 1783005896.943503212),
    ("bad-async-block#3", 1783005890.864182919, 1783005894.916236006),
    ("sync-block#1",      1783005890.862754247, 1783005896.950031962),
    ("sync-block#2",      1783005890.864285799, 1783005894.931308364),
    ("sync-block#3",      1783005890.865170007, 1783005894.931212704),
    ("good-async-sleep#1", 1783005890.862660380, 1783005894.924406395),
    ("good-async-sleep#2", 1783005890.864308428, 1783005896.947205395),
    ("good-async-sleep#3", 1783005890.879481445, 1783005896.947849753),
]

LABELS_JP = {
    "bad-async-block": "①async def + time.sleep(2)\n（悪い例：イベントループごと占有）",
    "sync-block": "②def + time.sleep(2)\n（同期：スレッドプールへ隔離）",
    "good-async-sleep": "③async def + await asyncio.sleep(2)\n（良い例：ノンブロッキング）",
}
COLORS = {
    "bad-async-block": "#E4572E",
    "sync-block": "#3A7CA5",
    "good-async-sleep": "#2E933C",
}

# 表示順（グループごとにまとめる。上から③②①の順で、悪い例を一番下に強調配置）
order = [
    "good-async-sleep#3", "good-async-sleep#2", "good-async-sleep#1",
    "sync-block#3", "sync-block#2", "sync-block#1",
    "bad-async-block#3", "bad-async-block#2", "bad-async-block#1",
]
rec_by_name = {r[0]: r for r in records}

fig, ax = plt.subplots(figsize=(11.5, 6.2))

bar_h = 0.6

def rounded_bar(x0, width, ycenter, color, radius=0.045):
    ax.add_patch(FancyBboxPatch(
        (x0, ycenter - bar_h / 2), max(width, 0.01), bar_h,
        boxstyle=f"round,pad=0,rounding_size={radius}",
        linewidth=0, facecolor=color, mutation_aspect=1,
    ))

yticklabels = []
for i, name in enumerate(order):
    _, start, end = rec_by_name[name]
    kind = name.split("#")[0]
    rel_start = start - T0
    rel_end = end - T0
    width = rel_end - rel_start
    rounded_bar(rel_start, width, i, COLORS[kind])
    ax.text(rel_end + 0.08, i, f"{width:.2f}秒", va="center", ha="left",
            fontsize=9, color=COLORS[kind], fontweight="bold")
    yticklabels.append(name.replace("#", " #"))

ax.set_yticks(range(len(order)))
ax.set_yticklabels(yticklabels, fontsize=9.5)
ax.set_xlabel("経過時間（秒）", fontsize=11)
ax.set_xlim(-0.15, 8.2)
ax.set_ylim(-0.7, len(order) + 1.7)
ax.set_title("3エンドポイント×3回・同時リクエストのイベントループ占有タイムライン",
             fontsize=13, fontweight="bold", pad=14)

ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
ax.spines["left"].set_visible(False)
ax.tick_params(axis="y", length=0)
ax.grid(axis="x", color="#dddddd", linewidth=0.8, zorder=0)
ax.set_axisbelow(True)

# py-spy dump マーカー（t=1,3,5,7）
dump_notes = {
    1: "①#1実行中",
    3: "①#3完了直後 / ②実行中",
    5: "①#2実行中 / ②#1完了直後",
    7: "全リクエスト完了(idle)",
}
for t, note in dump_notes.items():
    ax.axvline(t, color="#333333", linestyle=(0, (4, 3)), linewidth=1.1, ymax=0.95, zorder=1)
    ax.annotate(f"py-spy dump\nt={t}s\n{note}", xy=(t, len(order) + 0.3),
                ha="center", va="bottom", fontsize=7.8, color="#333333")

legend_handles = [
    plt.Rectangle((0, 0), 1, 1, color=COLORS[k], label=LABELS_JP[k])
    for k in ["bad-async-block", "sync-block", "good-async-sleep"]
]
ax.legend(handles=legend_handles, loc="upper center", bbox_to_anchor=(0.5, -0.13),
          ncol=1, fontsize=9.5, frameon=False)

fig.text(0.99, 0.005,
          "出典: docs/study/raw_data/multi_endpoint_run/requests_timing.log, dump_1/3/5/7.txt",
          ha="right", va="bottom", fontsize=7.5, color="#888888")

fig.tight_layout(rect=[0, 0.05, 1, 1])
fig.savefig("/home/test/EC_SITE/docs/study/raw_data/multi_endpoint_run/multi_endpoint_timeline.png",
            dpi=200, bbox_inches="tight")
print("saved")
