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

# raw_data/multi_endpoint_run/occ_log.txt より（実際にworkerを占有していた区間の生データ）
T0 = 1783006444.444855945  # 全リクエスト発火の起点

COLOR_BLOCK = "#E4572E"   # bad-async-block: MainThreadを直接ブロック
COLOR_THREAD = "#3A7CA5"  # sync-block: 専用AnyIOワーカースレッド
COLOR_ASYNC = "#2E933C"   # good-async-sleep: 一瞬触れるだけ

# MainThread（イベントループ）を実際に占有していた区間 = bad-async-blockのstart/end
main_thread_spans = [
    ("bad-async-block #2", 1783006444.455362, 1783006446.456452),
    ("bad-async-block #1", 1783006446.457806, 1783006448.458175),
    ("bad-async-block #3", 1783006448.469579, 1783006450.469860),
]

# good-async-sleepがMainThreadに触れた瞬間（dispatch/resumeの一点。実際は待っている間は無占有）
good_async_touches = [
    ("dispatch #1", 1783006444.454046), ("resume #1", 1783006446.457228),
    ("dispatch #2", 1783006448.467759), ("resume #2", 1783006450.471988),
    ("dispatch #3", 1783006450.471852), ("resume #3", 1783006452.472447),
]

# 専用スレッドで実行されたsync-block（MainThreadとは別リソースなので並行できる）
worker_thread_spans = {
    "AnyIOワーカー\nスレッドA": [("sync-block #2", 1783006448.468632, 1783006450.469217)],
    "AnyIOワーカー\nスレッドB": [("sync-block #3", 1783006448.469795, 1783006450.470205)],
    "AnyIOワーカー\nスレッドC": [("sync-block #1", 1783006450.473186, 1783006452.473383)],
}

rows = ["MainThread\n(イベントループ)"] + list(worker_thread_spans.keys())
y_of = {r: len(rows) - 1 - i for i, r in enumerate(rows)}
bar_h = 0.5

fig, ax = plt.subplots(figsize=(11, 4.6))


def rounded_bar(x0, width, ycenter, color, radius=0.045, z=2):
    ax.add_patch(FancyBboxPatch(
        (x0, ycenter - bar_h / 2), max(width, 0.01), bar_h,
        boxstyle=f"round,pad=0,rounding_size={radius}",
        linewidth=0, facecolor=color, mutation_aspect=1, zorder=z,
    ))


y_main = y_of["MainThread\n(イベントループ)"]

# MainThreadの真の占有区間（bad-async-block）
for label, s, e in main_thread_spans:
    rel_s, rel_e = s - T0, e - T0
    rounded_bar(rel_s, rel_e - rel_s, y_main, COLOR_BLOCK)
    ax.text((rel_s + rel_e) / 2, y_main, label, ha="center", va="center",
            color="white", fontsize=8.5)

# good-async-sleepの一瞬の接触点(ほぼ幅ゼロ)
for label, t in good_async_touches:
    rel_t = t - T0
    ax.plot(rel_t, y_main + bar_h / 2 + 0.12, marker="v", color=COLOR_ASYNC,
            markersize=6, zorder=3)

# 専用スレッドのsync-block区間
for row, spans in worker_thread_spans.items():
    y = y_of[row]
    for label, s, e in spans:
        rel_s, rel_e = s - T0, e - T0
        rounded_bar(rel_s, rel_e - rel_s, y, COLOR_THREAD)
        ax.text((rel_s + rel_e) / 2, y, label, ha="center", va="center",
                color="white", fontsize=8.5)

ax.set_yticks([y_of[r] for r in rows])
ax.set_yticklabels(rows, fontsize=10)
ax.set_xlabel("経過時間（秒）", fontsize=11)
ax.set_xlim(-0.15, 8.4)
ax.set_ylim(-0.7, len(rows) - 0.3 + 0.9)
ax.set_title("各処理が実際にworker（スレッド）を占有していた時間",
             fontsize=13, fontweight="bold", pad=14)

ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
ax.spines["left"].set_visible(False)
ax.tick_params(axis="y", length=0)
ax.grid(axis="x", color="#dddddd", linewidth=0.8, zorder=0)
ax.set_axisbelow(True)

legend_handles = [
    plt.Rectangle((0, 0), 1, 1, color=COLOR_BLOCK, label="①async def + time.sleep(2)：MainThreadを直接ブロック"),
    plt.Rectangle((0, 0), 1, 1, color=COLOR_THREAD, label="②def + time.sleep(2)：専用スレッドを占有（MainThreadとは別資源）"),
    plt.Line2D([0], [0], marker="v", color="w", markerfacecolor=COLOR_ASYNC, markersize=8,
               label="③async def + await asyncio.sleep(2)：MainThreadへの接触は一瞬のみ（実質占有なし）"),
]
ax.legend(handles=legend_handles, loc="upper center", bbox_to_anchor=(0.5, -0.16),
          ncol=1, fontsize=9, frameon=False)

fig.text(0.99, 0.005,
          "出典: docs/study/raw_data/multi_endpoint_run/occ_log.txt, requests_timing.log",
          ha="right", va="bottom", fontsize=7.5, color="#888888")

fig.subplots_adjust(bottom=0.32, top=0.9, left=0.13, right=0.97)
fig.savefig("/home/test/EC_SITE/docs/study/raw_data/multi_endpoint_run/worker_occupancy_timeline.png",
            dpi=200)
print("saved")
