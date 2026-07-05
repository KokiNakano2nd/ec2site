"""asyncio デバッグモードの3通りの有効化方法を確認するデモ。

使い方:
  1) 環境変数で有効化:
     PYTHONASYNCIODEBUG=1 python debug_mode_enable_demo.py env

  2) asyncio.run(debug=True) で有効化:
     python debug_mode_enable_demo.py run_debug_arg

  3) loop.set_debug(True) で有効化:
     python debug_mode_enable_demo.py set_debug
"""
import asyncio
import logging
import sys

logging.basicConfig(level=logging.DEBUG)
logging.getLogger("asyncio").setLevel(logging.DEBUG)


async def check_debug_status():
    loop = asyncio.get_running_loop()
    print(f"asyncio debug mode is: {loop.get_debug()}")


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "env"

    if mode == "env":
        # PYTHONASYNCIODEBUG=1 が設定されていれば asyncio.run() だけで有効になる
        asyncio.run(check_debug_status())

    elif mode == "run_debug_arg":
        asyncio.run(check_debug_status(), debug=True)

    elif mode == "set_debug":
        loop = asyncio.new_event_loop()
        loop.set_debug(True)
        try:
            loop.run_until_complete(check_debug_status())
        finally:
            loop.close()

    else:
        print(f"unknown mode: {mode}")
        sys.exit(1)


if __name__ == "__main__":
    main()
