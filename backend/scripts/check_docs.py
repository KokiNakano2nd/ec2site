"""設計文書のローカルリンク、件数、トレーサビリティを検査する。"""

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DOCS_ROOT = REPO_ROOT / "docs"
DELIVERABLES = DOCS_ROOT / "deliverables"

MARKDOWN_LINK_RE = re.compile(r"(?<!!)\[[^\]]*\]\(([^)]+)\)")
WIKI_LINK_RE = re.compile(r"\[\[([^\]]+)\]\]")
HTTP_METHODS = {"get", "post", "put", "patch", "delete", "options", "head", "trace"}


def local_markdown_target(source: Path, raw_target: str) -> Path | None:
    target = raw_target.strip().strip("<>")
    if not target or target.startswith(("http://", "https://", "mailto:", "#")):
        return None
    return (source.parent / target.split("#", 1)[0]).resolve()


def local_wiki_candidates(source: Path, raw_target: str) -> list[Path]:
    target = raw_target.replace(r"\|", "|").split("|", 1)[0].split("#", 1)[0].strip()
    if not target:
        return []
    path = (source.parent / target).resolve()
    return [path] if Path(target).suffix else [path, path.with_suffix(".md")]


def index_ids(path: Path, prefix: str) -> list[str]:
    return re.findall(rf"\| ({prefix}-\d{{3}}) \|", path.read_text())


def main() -> int:
    errors: list[str] = []

    for source in DOCS_ROOT.rglob("*.md"):
        text = source.read_text()
        if source.is_relative_to(DELIVERABLES) and not text.startswith("# "):
            errors.append(f"H1がない成果物: {source.relative_to(REPO_ROOT)}")

        for raw_target in MARKDOWN_LINK_RE.findall(text):
            target = local_markdown_target(source, raw_target)
            if target is not None and not target.exists():
                errors.append(f"リンク切れ: {source.relative_to(REPO_ROOT)} -> {raw_target}")

        for raw_target in WIKI_LINK_RE.findall(text):
            candidates = local_wiki_candidates(source, raw_target)
            if candidates and not any(candidate.exists() for candidate in candidates):
                errors.append(f"Wikiリンク切れ: {source.relative_to(REPO_ROOT)} -> [[{raw_target}]]")

    indexed_files = [
        (
            DELIVERABLES / "demand_definition/02_user_stories.md",
            DELIVERABLES / "demand_definition/user_stories",
            "US",
        ),
        (
            DELIVERABLES / "requirements/03_function_list.md",
            DELIVERABLES / "requirements/function_list",
            "F",
        ),
        (
            DELIVERABLES / "requirements/01_use_cases.md",
            DELIVERABLES / "requirements/use_cases",
            "UC",
        ),
    ]
    for index, detail_dir, prefix in indexed_files:
        listed = index_ids(index, prefix)
        files = sorted(path.stem for path in detail_dir.glob(f"{prefix}-*.md"))
        if len(listed) != len(set(listed)):
            errors.append(f"{prefix}一覧に重複IDがある: {index.relative_to(REPO_ROOT)}")
        if sorted(listed) != files:
            errors.append(f"{prefix}一覧と詳細ファイルが不一致: listed={sorted(listed)}, files={files}")

    api_dir = DELIVERABLES / "external_design/api_spec"
    api_files = sorted(api_dir.glob("*.md"))
    api_index = (DELIVERABLES / "external_design/02_api_spec.md").read_text()
    api_index_rows = re.findall(r"\| [^\n]+ \| (?:GET|POST|PUT|PATCH|DELETE) \| `[^`]+` \|", api_index)
    openapi = json.loads((DELIVERABLES / "external_design/openapi.json").read_text())
    operation_count = sum(1 for item in openapi["paths"].values() for method in item if method in HTTP_METHODS)
    counts = {"index": len(api_index_rows), "details": len(api_files), "openapi": operation_count}
    if len(set(counts.values())) != 1:
        errors.append(f"API件数が不一致: {counts}")

    for api_file in api_files:
        text = api_file.read_text()
        match = re.search(r"^\*\*元になった機能\*\*:\s*(.+)$", text, re.MULTILINE)
        if match is None:
            errors.append(f"上流機能IDがないAPI補足: {api_file.relative_to(REPO_ROOT)}")
        elif match.group(1).startswith(("なし", "未定義")):
            errors.append(f"上流要求が未定義のAPI補足: {api_file.relative_to(REPO_ROOT)}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print(
        "文書整合チェック成功: "
        f"US={len(index_ids(indexed_files[0][0], 'US'))}, "
        f"UC={len(index_ids(indexed_files[2][0], 'UC'))}, "
        f"F={len(index_ids(indexed_files[1][0], 'F'))}, API={operation_count}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
