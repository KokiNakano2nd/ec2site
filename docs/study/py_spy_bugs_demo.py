"""「スレッドを増やせばCPU処理も速くなるはず」という誤解に基づいたバグを仕込んだデモ。

CPythonにはGIL(Global Interpreter Lock)があり、CPUバウンドな処理は
複数スレッドに分けても並列には実行されない（同時に1スレッドしかPythonバイトコードを
実行できない）。この「体感的には分かりにくい性能バグ」をpy-spyでどう見抜けるかを確認する。

使い方:
  python py_spy_bugs_demo.py 1   # スレッド1つで実行
  python py_spy_bugs_demo.py 4   # スレッド4つで実行（並列化を期待したコード）
"""
import sys
import threading
import time


def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)


def worker():
    fib(31)


def run_with_threads(n_threads):
    threads = [threading.Thread(target=worker) for _ in range(n_threads)]
    start = time.perf_counter()
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    elapsed = time.perf_counter() - start
    print(f"threads={n_threads} elapsed={elapsed:.2f}s")


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    run_with_threads(n)
