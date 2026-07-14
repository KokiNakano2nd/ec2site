import argparse
import os
import subprocess
import sys
from pathlib import Path


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            raise ValueError(f"{path}:{line_number}: expected KEY=VALUE")
        name, value = line.split("=", 1)
        name = name.strip()
        if not name or not name.replace("_", "").isalnum() or name[0].isdigit():
            raise ValueError(f"{path}:{line_number}: invalid environment variable name")
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        values[name] = value
    return values


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", type=Path, required=True)
    parser.add_argument("--cwd", type=Path, required=True)
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()

    command = args.command[1:] if args.command[:1] == ["--"] else args.command
    if not command:
        parser.error("a command is required after --")

    env = load_env(args.env_file)
    env.update(os.environ)
    return subprocess.run(command, cwd=args.cwd, env=env, check=False).returncode


if __name__ == "__main__":
    sys.exit(main())
