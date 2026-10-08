#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Release planning for @vectorfyco/novel-v3.

The version is authored in a pull request (``pnpm changeset version`` bumps
``packages/headless/package.json`` and writes the changelog). This script never
edits files, never commits and never pushes a branch. It only

* ``plan``     decides what the release workflow should do for the checked-out
               commit and, with ``--create-tag``, pushes the version tag (only
               the tag, never a branch),
* ``notes``    extracts one version section from the changelog,
* ``check-pr`` prints a warning when a pull request changes the library without
               a version bump or a changeset.

Decision logic lives in pure functions (``decide``, ``pr_check``) so it can be
tested without network or git side effects: see ``test_release_novel.py``.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Literal, Sequence

ROOT = Path(__file__).resolve().parents[1]
PACKAGE_DIR = Path(os.getenv("PACKAGE_DIR", "packages/headless"))
PACKAGE_JSON = ROOT / PACKAGE_DIR / "package.json"
CHANGELOG = ROOT / PACKAGE_DIR / "CHANGELOG.md"
TAG_PREFIX = os.getenv("RELEASE_TAG_PREFIX", "v")

# Single source of truth for "this change affects the published library".
DEFAULT_RELEASE_PATHS = [
    (PACKAGE_DIR / "src").as_posix(),
    (PACKAGE_DIR / "package.json").as_posix(),
    (PACKAGE_DIR / "tsup.config.ts").as_posix(),
    (PACKAGE_DIR / "tsconfig.json").as_posix(),
    (PACKAGE_DIR / "tsconfig.build.json").as_posix(),
    (PACKAGE_DIR / "scripts").as_posix(),
    ".oxlintrc.json",
    ".oxfmtrc.json",
    "pnpm-lock.yaml",
]

NO_BUMP_MESSAGE = "library changed without a version bump: run `pnpm changeset version` in a PR"

Level = Literal["notice", "warning", "error"]
Action = Literal["release", "noop", "error"]


# --------------------------------------------------------------------------- #
# Versions
# --------------------------------------------------------------------------- #

_SEMVER = re.compile(r"^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$")


def semver_key(version: str) -> tuple[int, int, int, tuple[int, tuple[tuple[int, int, str], ...]]]:
    """Sortable key following semver precedence (a release outranks its prereleases)."""
    match = _SEMVER.match(version)
    if not match:
        raise ValueError(f"Unsupported version format: {version}")
    major, minor, patch, pre = match.groups()
    if pre is None:
        return int(major), int(minor), int(patch), (1, ())
    idents = tuple((0, int(p), "") if p.isdigit() else (1, 0, p) for p in pre.split("."))
    return int(major), int(minor), int(patch), (0, idents)


def is_prerelease(version: str) -> bool:
    match = _SEMVER.match(version)
    if not match:
        raise ValueError(f"Unsupported version format: {version}")
    return match.group(4) is not None


def highest_version(versions: Iterable[str]) -> str | None:
    valid = [v for v in versions if _SEMVER.match(v)]
    return max(valid, key=semver_key) if valid else None


# --------------------------------------------------------------------------- #
# Pure decision logic
# --------------------------------------------------------------------------- #


def has_relevant_changes(files: Iterable[str], release_paths: Iterable[str]) -> bool:
    prefixes = [path.rstrip("/") for path in release_paths]
    for file in files:
        for prefix in prefixes:
            if file == prefix or file.startswith(f"{prefix}/"):
                return True
    return False


@dataclass(frozen=True)
class Facts:
    """Everything the decision needs, injected so tests need no network or git."""

    package_name: str
    version: str
    published_versions: frozenset[str]
    head: str
    # Commit the tag ``<prefix><version>`` points to on the remote, or None.
    tag_commit: str | None
    # Files changed between the last release tag and HEAD, or None when unknown.
    changed_files: Sequence[str] | None
    release_paths: Sequence[str]
    tag_prefix: str = "v"
    # Set for the manual recovery path: the tag the operator asked for.
    expect_tag: str | None = None


@dataclass(frozen=True)
class Decision:
    action: Action
    version: str
    tag: str
    create_tag: bool
    publish: bool
    github_release: bool
    npm_tag: str
    prerelease: bool
    level: Level
    message: str
    summary: str


def decide(facts: Facts) -> Decision:
    version = facts.version
    tag = f"{facts.tag_prefix}{version}"
    npm_tag = "next" if is_prerelease(version) else "latest"
    prerelease = is_prerelease(version)

    def make(
        action: Action,
        level: Level,
        message: str,
        *,
        create_tag: bool = False,
        publish: bool = False,
        github_release: bool = False,
        summary: str | None = None,
    ) -> Decision:
        return Decision(
            action=action,
            version=version,
            tag=tag,
            create_tag=create_tag,
            publish=publish,
            github_release=github_release,
            npm_tag=npm_tag,
            prerelease=prerelease,
            level=level,
            message=message,
            summary=summary or message,
        )

    if facts.expect_tag is not None and facts.expect_tag != tag:
        return make(
            "error",
            "error",
            f"Requested tag {facts.expect_tag} does not match package.json version {version} (expected {tag}).",
        )

    tagged_here = facts.tag_commit == facts.head

    if version in facts.published_versions:
        # Already on npm: never publish again. Only a re-run on the tagged commit
        # may still need to create the GitHub release (the release job is idempotent).
        if tagged_here:
            return make(
                "noop",
                "notice",
                f"{facts.package_name}@{version} is already on npm and {tag} points at this commit: nothing to publish.",
                github_release=True,
            )
        if facts.changed_files is not None and has_relevant_changes(facts.changed_files, facts.release_paths):
            count = len(facts.changed_files)
            return make(
                "noop",
                "warning",
                f"No release: {NO_BUMP_MESSAGE}. {facts.package_name}@{version} is already on npm "
                f"and {count} file(s) changed since {tag}.",
            )
        return make(
            "noop",
            "notice",
            f"{facts.package_name}@{version} is already on npm and no library files changed: nothing to release.",
        )

    newest = highest_version(facts.published_versions)
    if newest is not None and semver_key(version) < semver_key(newest):
        return make(
            "error",
            "error",
            f"package.json version {version} is not on npm but is behind the published {newest}. "
            "Refusing to publish an older version over a newer one: bump the version in a PR.",
        )

    if facts.tag_commit is not None and not tagged_here:
        return make(
            "error",
            "error",
            f"Tag {tag} already exists on {facts.tag_commit[:12]} but this commit is {facts.head[:12]}, "
            f"and {version} is not on npm. Not touching the existing tag. "
            f"Publish the tagged commit with the workflow_dispatch input tag={tag}, "
            "or bump the version in a new PR.",
        )

    if facts.tag_commit is None:
        message = f"Releasing {version}: create tag {tag} on {facts.head[:12]}, publish to npm, create the GitHub release."
    else:
        message = f"Releasing {version}: tag {tag} already points at this commit, publish to npm, create the GitHub release."
    return make(
        "release",
        "notice",
        message,
        create_tag=facts.tag_commit is None,
        publish=True,
        github_release=True,
    )


def pr_check(
    *,
    changed_files: Sequence[str],
    added_files: Sequence[str],
    base_version: str | None,
    head_version: str | None,
    release_paths: Sequence[str],
) -> str | None:
    """Warning text for a pull request, or None when it looks fine."""
    if not has_relevant_changes(changed_files, release_paths):
        return None
    if base_version != head_version:
        return None
    for file in added_files:
        path = Path(file)
        if path.parent.as_posix() == ".changeset" and path.suffix == ".md" and path.name != "README.md":
            return None
    return (
        "This PR changes files that ship in @vectorfyco/novel-v3 but neither bumps the version "
        "nor adds a changeset. Add a changeset (`pnpm changeset`) or run `pnpm changeset version` in this PR. "
        "Nothing is published until package.json carries a new version. "
        "Ignore this if the change does not affect the published package (docs or tests only)."
    )


def tag_push_command(tag: str) -> list[str]:
    """The only push this script ever performs: one tag ref, never a branch."""
    return ["git", "push", "origin", f"refs/tags/{tag}:refs/tags/{tag}"]


def changelog_section(text: str, version: str) -> str | None:
    """Body of the ``## <version>`` section of a changesets changelog, or None."""
    lines = text.splitlines()
    heading = re.compile(rf"^##\s+\[?{re.escape(version)}\]?(\s|$)")
    start = next((i for i, line in enumerate(lines) if heading.match(line)), None)
    if start is None:
        return None
    end = next((i for i in range(start + 1, len(lines)) if re.match(r"^##\s", lines[i])), len(lines))
    body = "\n".join(lines[start + 1 : end]).strip()
    return body or None


# --------------------------------------------------------------------------- #
# Side-effecting helpers (git, registry, GitHub Actions)
# --------------------------------------------------------------------------- #


def run(cmd: Sequence[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True)
    if check and result.returncode != 0:
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        raise SystemExit(result.returncode or 1)
    return result


def git(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return run(["git", *args], check=check)


def fetch_published_versions(package_name: str) -> frozenset[str]:
    """Every version on the registry. 404 means never published; other errors fail loudly."""
    registry = os.getenv("NPM_REGISTRY", "https://registry.npmjs.org").rstrip("/")
    url = f"{registry}/{urllib.parse.quote(package_name, safe='@')}"
    request = urllib.request.Request(url, headers={"Accept": "application/vnd.npm.install-v1+json"})
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                data = json.load(response)
            return frozenset(data.get("versions", {}).keys())
        except urllib.error.HTTPError as error:
            if error.code == 404:
                return frozenset()
            last_error = error
        except (urllib.error.URLError, TimeoutError) as error:
            last_error = error
        time.sleep(2 * (attempt + 1))
    raise SystemExit(f"Could not read {url}: {last_error}")


def remote_tag_commit(tag: str) -> str | None:
    """Commit a tag points to on origin (peeled for annotated tags), or None."""
    ref = f"refs/tags/{tag}"
    result = git("ls-remote", "--tags", "origin", ref, f"{ref}^{{}}")
    commits: dict[str, str] = {}
    for line in result.stdout.splitlines():
        sha, _, name = line.partition("\t")
        commits[name.strip()] = sha.strip()
    return commits.get(f"{ref}^{{}}") or commits.get(ref)


def latest_local_tag(prefix: str, exclude: str) -> str | None:
    result = git("tag", "--list", f"{prefix}*", "--sort=-version:refname")
    for line in result.stdout.splitlines():
        tag = line.strip()
        if tag and tag != exclude:
            return tag
    return None


def changed_files_since(base: str) -> list[str]:
    result = git("diff", "--name-only", f"{base}..HEAD")
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def release_paths_from_env() -> list[str]:
    raw = os.getenv("RELEASE_PATHS")
    if raw:
        return [path.strip() for path in raw.split(",") if path.strip()]
    return list(DEFAULT_RELEASE_PATHS)


def set_outputs(**values: str) -> None:
    path = os.getenv("GITHUB_OUTPUT")
    if not path:
        return
    with open(path, "a", encoding="utf-8") as handle:
        for name, value in values.items():
            handle.write(f"{name}={value}\n")


def annotate(level: Level, message: str) -> None:
    # Single line; GitHub Actions workflow command.
    print(f"::{level}::{message}")


def write_summary(markdown: str) -> None:
    path = os.getenv("GITHUB_STEP_SUMMARY")
    if not path:
        return
    with open(path, "a", encoding="utf-8") as handle:
        handle.write(markdown + "\n")


def read_package() -> tuple[str, str]:
    if not PACKAGE_JSON.exists():
        raise SystemExit(f"Missing package.json at {PACKAGE_JSON}")
    data = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))
    return data["name"], data["version"]


# --------------------------------------------------------------------------- #
# Commands
# --------------------------------------------------------------------------- #


def cmd_plan(args: argparse.Namespace) -> int:
    name, version = read_package()
    tag = f"{TAG_PREFIX}{version}"
    head = git("rev-parse", "HEAD").stdout.strip()
    published = fetch_published_versions(name)
    print(f"Package {name}@{version}; published versions: {', '.join(sorted(published, key=semver_key)) or 'none'}")

    tag_commit = remote_tag_commit(tag)
    base = tag if tag_commit else latest_local_tag(TAG_PREFIX, exclude=tag)
    changed = changed_files_since(base) if base else None

    decision = decide(
        Facts(
            package_name=name,
            version=version,
            published_versions=published,
            head=head,
            tag_commit=tag_commit,
            changed_files=changed,
            release_paths=release_paths_from_env(),
            tag_prefix=TAG_PREFIX,
            expect_tag=args.expect_tag or None,
        )
    )

    print(f"Decision: {decision.action} (tag={decision.tag}, create_tag={decision.create_tag}, "
          f"publish={decision.publish}, github_release={decision.github_release})")
    annotate(decision.level, decision.message)
    write_summary(f"### Release plan\n\n- **Package:** `{name}@{version}`\n- **Decision:** `{decision.action}`\n- {decision.summary}\n")
    set_outputs(
        action=decision.action,
        version=decision.version,
        tag=decision.tag,
        create_tag=str(decision.create_tag).lower(),
        publish=str(decision.publish).lower(),
        github_release=str(decision.github_release).lower(),
        npm_tag=decision.npm_tag,
        prerelease=str(decision.prerelease).lower(),
    )

    if decision.action == "error":
        return 1

    if decision.create_tag:
        if not args.create_tag:
            print(f"Dry run: would run `{' '.join(tag_push_command(decision.tag))}` after `git tag {decision.tag} {head}`.")
        else:
            # Fail loudly: no status is swallowed here.
            git("tag", decision.tag, head)
            git(*tag_push_command(decision.tag)[1:])
            print(f"Pushed tag {decision.tag} at {head}.")
    return 0


def cmd_notes(args: argparse.Namespace) -> int:
    text = CHANGELOG.read_text(encoding="utf-8") if CHANGELOG.exists() else ""
    section = changelog_section(text, args.version)
    out = Path(args.out)
    if section is None:
        out.write_text("", encoding="utf-8")
        annotate("warning", f"No {args.version} section in {CHANGELOG.relative_to(ROOT)}; GitHub will generate notes instead.")
        return 0
    out.write_text(section + "\n", encoding="utf-8")
    print(f"Wrote changelog section for {args.version} to {out}.")
    return 0


def _package_version_at(rev: str) -> str | None:
    result = git("show", f"{rev}:{PACKAGE_DIR.as_posix()}/package.json", check=False)
    if result.returncode != 0:
        return None
    return json.loads(result.stdout).get("version")


def cmd_check_pr(args: argparse.Namespace) -> int:
    changed = git("diff", "--name-only", f"{args.base}...{args.head}").stdout.splitlines()
    added = git("diff", "--name-only", "--diff-filter=A", f"{args.base}...{args.head}").stdout.splitlines()
    warning = pr_check(
        changed_files=[f.strip() for f in changed if f.strip()],
        added_files=[f.strip() for f in added if f.strip()],
        base_version=_package_version_at(args.base),
        head_version=_package_version_at(args.head),
        release_paths=release_paths_from_env(),
    )
    if warning:
        annotate("warning", warning)
        write_summary(f"### Changeset check\n\n{warning}\n")
    else:
        print("Changeset check: ok.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    plan = sub.add_parser("plan", help="decide what to release for the checked-out commit")
    plan.add_argument("--create-tag", action="store_true", help="push the version tag (tag ref only) when needed")
    plan.add_argument("--expect-tag", help="fail unless v<package.json version> equals this tag (manual recovery)")
    plan.set_defaults(func=cmd_plan)

    notes = sub.add_parser("notes", help="write the changelog section of a version to a file")
    notes.add_argument("version")
    notes.add_argument("--out", required=True)
    notes.set_defaults(func=cmd_notes)

    check = sub.add_parser("check-pr", help="warn when a PR changes the library without a version or changeset")
    check.add_argument("--base", required=True)
    check.add_argument("--head", required=True)
    check.set_defaults(func=cmd_check_pr)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
