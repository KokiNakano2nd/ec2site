"""py-spyの観測対象にするための、しばらく動き続けるスクリプト。

CPUを使う関数(cpu_heavy)とI/O待ちしている関数(io_wait)を交互に呼び、
py-spyのスタック上でどちらが「実行中」として見えるかを比較できるようにする。

使い方:
  python py_spy_target_demo.py
  (別ターミナルから `py-spy dump -p <pid>` などでアタッチする)
"""
import time


def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)


def cpu_heavy():
    """CPUを使い切る重い処理（再帰的フィボナッチ計算）。"""
    fib(30)


def io_wait():
    """I/O待ちを模した処理（time.sleepでブロック）。"""
    time.sleep(1)


def main_loop():
    while True:
        cpu_heavy()
        io_wait()


if __name__ == "__main__":
    main_loop()
