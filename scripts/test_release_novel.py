"""Unit tests for the release decision logic. No network, no git.

Run: ``uv run --python 3.12 -m unittest scripts/test_release_novel.py``
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import release_novel as rn  # noqa: E402

HEAD = "a" * 40
OTHER = "b" * 40
PATHS = ["packages/headless/src", "packages/headless/package.json", "pnpm-lock.yaml"]


def facts(**overrides: object) -> rn.Facts:
    base: dict[str, object] = {
        "package_name": "@vectorfyco/novel-v3",
        "version": "3.0.0",
        "published_versions": frozenset({"1.0.0", "2.0.0", "2.0.1"}),
        "head": HEAD,
        "tag_commit": None,
        "changed_files": ["packages/headless/src/index.ts"],
        "release_paths": PATHS,
    }
    base.update(overrides)
    return rn.Facts(**base)  # type: ignore[arg-type]


class DecideTests(unittest.TestCase):
    def test_version_ahead_creates_tag_and_publishes(self) -> None:
        d = rn.decide(facts())
        self.assertEqual(d.action, "release")
        self.assertEqual(d.tag, "v3.0.0")
        self.assertTrue(d.create_tag)
        self.assertTrue(d.publish)
        self.assertTrue(d.github_release)
        self.assertEqual(d.npm_tag, "latest")
        self.assertEqual(d.level, "notice")

    def test_version_ahead_does_not_need_relevant_changes(self) -> None:
        d = rn.decide(facts(changed_files=["README.md"]))
        self.assertEqual(d.action, "release")

    def test_unpublished_package_releases(self) -> None:
        d = rn.decide(facts(published_versions=frozenset()))
        self.assertEqual(d.action, "release")

    def test_prerelease_uses_next_dist_tag(self) -> None:
        d = rn.decide(facts(version="3.1.0-beta.1"))
        self.assertEqual(d.action, "release")
        self.assertEqual(d.npm_tag, "next")
        self.assertTrue(d.prerelease)

    def test_equal_version_with_relevant_changes_warns_and_does_not_release(self) -> None:
        d = rn.decide(facts(version="2.0.1", tag_commit=OTHER))
        self.assertEqual(d.action, "noop")
        self.assertFalse(d.publish)
        self.assertFalse(d.create_tag)
        self.assertEqual(d.level, "warning")
        self.assertIn("library changed without a version bump: run `pnpm changeset version` in a PR", d.message)

    def test_equal_version_without_relevant_changes_is_quiet(self) -> None:
        d = rn.decide(facts(version="2.0.1", tag_commit=OTHER, changed_files=["README.md", ".github/workflows/ci.yaml"]))
        self.assertEqual(d.action, "noop")
        self.assertEqual(d.level, "notice")
        self.assertNotIn("without a version bump", d.message)
        self.assertFalse(d.publish)

    def test_equal_version_with_unknown_changes_is_quiet(self) -> None:
        d = rn.decide(facts(version="2.0.1", tag_commit=OTHER, changed_files=None))
        self.assertEqual(d.level, "notice")

    def test_tag_on_same_commit_and_not_on_npm_publishes_without_retagging(self) -> None:
        d = rn.decide(facts(tag_commit=HEAD))
        self.assertEqual(d.action, "release")
        self.assertFalse(d.create_tag)
        self.assertTrue(d.publish)

    def test_tag_on_different_commit_is_an_error(self) -> None:
        d = rn.decide(facts(tag_commit=OTHER))
        self.assertEqual(d.action, "error")
        self.assertEqual(d.level, "error")
        self.assertFalse(d.publish)
        self.assertFalse(d.create_tag)
        self.assertIn("workflow_dispatch", d.message)

    def test_version_already_on_npm_is_a_noop(self) -> None:
        d = rn.decide(facts(version="2.0.1", tag_commit=OTHER, changed_files=[]))
        self.assertEqual((d.action, d.publish, d.create_tag, d.github_release), ("noop", False, False, False))

    def test_rerun_on_released_commit_only_ensures_github_release(self) -> None:
        d = rn.decide(facts(version="2.0.1", tag_commit=HEAD, changed_files=[]))
        self.assertEqual(d.action, "noop")
        self.assertFalse(d.publish)
        self.assertFalse(d.create_tag)
        self.assertTrue(d.github_release)

    def test_version_behind_npm_and_unpublished_is_an_error(self) -> None:
        d = rn.decide(facts(version="1.5.0"))
        self.assertEqual(d.action, "error")

    def test_expect_tag_mismatch_is_an_error(self) -> None:
        d = rn.decide(facts(expect_tag="v2.0.1"))
        self.assertEqual(d.action, "error")

    def test_expect_tag_match_publishes_from_tagged_commit(self) -> None:
        d = rn.decide(facts(expect_tag="v3.0.0", tag_commit=HEAD))
        self.assertEqual(d.action, "release")
        self.assertFalse(d.create_tag)


class HelperTests(unittest.TestCase):
    def test_semver_ordering(self) -> None:
        order = ["1.0.0", "2.0.0-beta.2", "2.0.0-beta.10", "2.0.0", "2.0.1", "10.0.0"]
        self.assertEqual(sorted(reversed(order), key=rn.semver_key), order)
        self.assertEqual(rn.highest_version(["2.0.1", "3.0.0-rc.1", "bad"]), "3.0.0-rc.1")

    def test_relevant_changes_match_prefixes_not_substrings(self) -> None:
        self.assertTrue(rn.has_relevant_changes(["packages/headless/src/a/b.ts"], PATHS))
        self.assertFalse(rn.has_relevant_changes(["packages/headless/srcs/a.ts"], PATHS))

    def test_only_tag_ref_is_pushed(self) -> None:
        command = rn.tag_push_command("v3.0.0")
        self.assertEqual(command, ["git", "push", "origin", "refs/tags/v3.0.0:refs/tags/v3.0.0"])
        self.assertNotIn("HEAD:main", " ".join(command))
        self.assertNotIn("--atomic", command)

    def test_changelog_section(self) -> None:
        text = "# pkg\n\n## 3.0.0\n\n### Major Changes\n\n- a\n\n## 2.0.1\n\n- b\n"
        self.assertEqual(rn.changelog_section(text, "3.0.0"), "### Major Changes\n\n- a")
        self.assertEqual(rn.changelog_section(text, "2.0.1"), "- b")
        self.assertIsNone(rn.changelog_section(text, "9.9.9"))
        self.assertIsNone(rn.changelog_section(text, "3.0"))


class PrCheckTests(unittest.TestCase):
    def check(self, **overrides: object) -> str | None:
        args: dict[str, object] = {
            "changed_files": ["packages/headless/src/index.ts"],
            "added_files": [],
            "base_version": "3.0.0",
            "head_version": "3.0.0",
            "release_paths": PATHS,
        }
        args.update(overrides)
        return rn.pr_check(**args)  # type: ignore[arg-type]

    def test_warns_without_bump_or_changeset(self) -> None:
        self.assertIn("changeset", self.check() or "")

    def test_quiet_when_version_bumped(self) -> None:
        self.assertIsNone(self.check(head_version="3.0.1"))

    def test_quiet_when_changeset_added(self) -> None:
        self.assertIsNone(self.check(added_files=[".changeset/brave-lions-jump.md"]))

    def test_readme_in_changeset_dir_does_not_count(self) -> None:
        self.assertIsNotNone(self.check(added_files=[".changeset/README.md"]))

    def test_quiet_when_no_library_files_changed(self) -> None:
        self.assertIsNone(self.check(changed_files=["README.md"]))


if __name__ == "__main__":
    unittest.main()
