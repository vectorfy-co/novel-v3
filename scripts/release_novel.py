#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
PACKAGE_DIR = Path(os.getenv("PACKAGE_DIR", "packages/headless"))
PACKAGE_JSON = ROOT / PACKAGE_DIR / "package.json"

DEFAULT_RELEASE_PATHS = [
    PACKAGE_DIR / "src",
    PACKAGE_DIR / "package.json",
    PACKAGE_DIR / "tsup.config.ts",
    PACKAGE_DIR / "tsconfig.json",
    PACKAGE_DIR / "biome.json",
]


def run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        cmd,
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    if check and result.returncode != 0:
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        raise SystemExit(result.returncode)
    return result


def git(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return run(["git", *args], check=check)


def parse_semver(version: str) -> tuple[int, int, int]:
    main = version.split("-", 1)[0]
    parts = main.split(".")
    if len(parts) != 3:
        raise ValueError(f"Unsupported version format: {version}")
    return tuple(int(part) for part in parts)  # type: ignore[return-value]


def compare_versions(a: str, b: str) -> int:
    a_parts = parse_semver(a)
    b_parts = parse_semver(b)
    if a_parts == b_parts:
        return 0
    return 1 if a_parts > b_parts else -1


def bump_patch(version: str) -> str:
    major, minor, patch = parse_semver(version)
    return f"{major}.{minor}.{patch + 1}"


def get_latest_tag(prefix: str) -> str | None:
    result = git("tag", "--list", f"{prefix}*", "--sort=-version:refname")
    tags = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    return tags[0] if tags else None


def changed_files_since(tag: str) -> list[str]:
    result = git("diff", "--name-only", f"{tag}..HEAD")
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def normalize_paths(paths: Iterable[Path]) -> list[str]:
    return [path.as_posix().rstrip("/") for path in paths]


def has_relevant_changes(files: Iterable[str], release_paths: Iterable[str]) -> bool:
    prefixes = [path.rstrip("/") for path in release_paths]
    for file in files:
        for prefix in prefixes:
            if file == prefix or file.startswith(f"{prefix}/"):
                return True
    return False


def npm_view_version(package_name: str) -> str | None:
    registry = os.getenv("NPM_REGISTRY", "https://registry.npmjs.org/")
    result = run(
        ["npm", "view", package_name, "version", "--registry", registry],
        check=False,
    )
    if result.returncode != 0:
        return None
    version = result.stdout.strip()
    return version or None


def set_output(name: str, value: str) -> None:
    output_path = os.getenv("GITHUB_OUTPUT")
    if not output_path:
        return
    with open(output_path, "a", encoding="utf-8") as handle:
        handle.write(f"{name}={value}\n")


def tag_exists(tag: str) -> bool:
    result = git("tag", "--list", tag, check=False)
    return tag in result.stdout.splitlines()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Bump, tag, and push the Novel package when relevant changes exist."
    )
    parser.add_argument("--commit", action="store_true")
    parser.add_argument("--tag", action="store_true")
    parser.add_argument("--push", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not PACKAGE_JSON.exists():
        raise SystemExit(f"Missing package.json at {PACKAGE_JSON}")

    package_data = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))
    package_name = package_data["name"]
    current_version = package_data["version"]

    tag_prefix = os.getenv("RELEASE_TAG_PREFIX", "v")
    last_tag = get_latest_tag(tag_prefix)

    release_paths_env = os.getenv("RELEASE_PATHS")
    if release_paths_env:
        release_paths = [
            Path(path.strip())
            for path in release_paths_env.split(",")
            if path.strip()
        ]
    else:
        release_paths = DEFAULT_RELEASE_PATHS

    release_paths_normalized = normalize_paths(release_paths)

    if last_tag:
        changed_files = changed_files_since(last_tag)
        should_release = has_relevant_changes(changed_files, release_paths_normalized)
        reason = f"changes since {last_tag}" if should_release else "no relevant changes"
    else:
        changed_files = []
        should_release = True
        reason = "no prior tag"

    if not should_release:
        print(f"No release needed: {reason}")
        set_output("release", "false")
        return

    published_version = npm_view_version(package_name)
    if published_version:
        print(f"Latest published version: {published_version}")
    else:
        print("No published version found in registry.")

    bump_needed = False
    new_version = current_version

    if published_version:
        comparison = compare_versions(current_version, published_version)
        if comparison == 0:
            bump_needed = True
        elif comparison < 0:
            print(
                f"Local version {current_version} is behind published {published_version}."
            )
            set_output("release", "false")
            raise SystemExit(1)
    else:
        if current_version == "0.0.0":
            bump_needed = True

    if bump_needed:
        new_version = bump_patch(current_version)
        while tag_exists(f"{tag_prefix}{new_version}"):
            print(
                f"Tag {tag_prefix}{new_version} already exists, trying next patch version."
            )
            new_version = bump_patch(new_version)
        print(f"Bumping version {current_version} -> {new_version}")
        if not args.dry_run:
            package_data["version"] = new_version
            PACKAGE_JSON.write_text(
                json.dumps(package_data, indent=2) + "\n",
                encoding="utf-8",
            )
        set_output("bumped", "true")
    else:
        set_output("bumped", "false")

    set_output("release", "true")
    set_output("version", new_version)

    if args.dry_run:
        return

    if args.commit and bump_needed:
        git("add", str(PACKAGE_JSON.relative_to(ROOT)))
        git(
            "commit",
            "-m",
            f"chore(release): bump {package_name} to {new_version} [skip ci]",
        )

    tag_name: str | None = None
    if args.tag:
        tag_name = f"{tag_prefix}{new_version}"
        if tag_exists(tag_name):
            print(f"Tag {tag_name} already exists, skipping tag creation.")
        else:
            git("tag", tag_name)

    if args.push:
        push_cmd = ["push", "--atomic", "origin", "HEAD:main"]
        if tag_name:
            push_cmd.append(f"refs/tags/{tag_name}")
        git(*push_cmd)


if __name__ == "__main__":
    main()
