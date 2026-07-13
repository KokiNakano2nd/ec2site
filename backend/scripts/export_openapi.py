"""FastAPIから追跡対象のOpenAPI文書を生成・検証する。"""

import argparse
import importlib
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))
app = importlib.import_module("app.main").app

OUTPUT_PATH = BACKEND_ROOT.parent / "docs" / "deliverables" / "external_design" / "openapi.json"


def render_openapi() -> str:
    return json.dumps(app.openapi(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="追跡中のOpenAPI文書が最新か検証する")
    args = parser.parse_args()
    rendered = render_openapi()

    if args.check:
        if not OUTPUT_PATH.exists() or OUTPUT_PATH.read_text(encoding="utf-8") != rendered:
            print(
                "OpenAPI文書が実装と一致しません。backendで `uv run python scripts/export_openapi.py` を実行してください。"
            )
            return 1
        print("OpenAPI文書は実装と一致しています。")
        return 0

    OUTPUT_PATH.write_text(rendered, encoding="utf-8")
    print(f"OpenAPI文書を更新しました: {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
