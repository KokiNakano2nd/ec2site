"""意図的にバグを仕込んだデモ。デバッグモードON/OFFでの警告の違いを確認する。

使い方:
  OFF: python debug_mode_bugs_demo.py
  ON : PYTHONASYNCIODEBUG=1 python debug_mode_bugs_demo.py
"""
import asyncio
import gc
import time


async def forgotten_coroutine():
    """await されずに放置されるコルーチン。"""
    await asyncio.sleep(0.1)


async def blocking_task():
    """async関数内で同期的に重い処理(time.sleep)を書いてしまうバグ。
    イベントループをブロックするため、他のタスクの実行が遅延する。
    """
    time.sleep(0.3)  # 本来は asyncio.sleep を使うべき


async def main():
    # バグ1: コルーチンオブジェクトを作るだけで await しない
    forgotten_coroutine()  # noqa: この行がバグそのもの

    # バグ2: イベントループをブロックする同期処理
    await blocking_task()

    # 未参照になったコルーチンオブジェクトをGCさせ、
    # "never awaited" 警告を発生させるトリガーにする
    gc.collect()


if __name__ == "__main__":
    asyncio.run(main())
