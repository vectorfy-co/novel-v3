"""Unit tests for the release decision logic. No network, no git.

Run: ``uv run --python 3.12 -m unittest scripts/test_release_novel.py``
"""

from __future__ import annotations

import argparse
import contextlib
import io
import json
import subprocess
import sys
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

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

    def test_expect_tag_requires_existing_remote_tag(self) -> None:
        d = rn.decide(facts(expect_tag="v3.0.0"))
        self.assertEqual(d.action, "error")
        self.assertFalse(d.create_tag)
        self.assertFalse(d.publish)

    def test_expect_tag_rejects_unsafe_or_unsupported_formats(self) -> None:
        for tag in ["v3.0.0\n", "v3.0.0;echo bad", "3.0.0", "v3.0.0+build"]:
            with self.subTest(tag=tag):
                self.assertEqual(rn.decide(facts(expect_tag=tag)).action, "error")

    def test_numeric_version_comparison_and_prerelease_precedence(self) -> None:
        self.assertEqual(rn.decide(facts(version="10.0.0", published_versions=frozenset({"9.0.0"}))).action, "release")
        self.assertEqual(rn.decide(facts(version="3.0.0-beta.10", published_versions=frozenset({"3.0.0-beta.2"}))).npm_tag, "next")
        self.assertEqual(rn.decide(facts(version="3.0.0-beta.10", published_versions=frozenset({"3.0.0"}))).action, "error")


class RegistryTests(unittest.TestCase):
    def fetch_response(self, data: object) -> frozenset[str]:
        with patch.object(rn.urllib.request, "urlopen", return_value=io.StringIO(json.dumps(data))):
            return rn.fetch_published_versions("@vectorfyco/novel-v3")

    def test_reads_published_versions(self) -> None:
        self.assertEqual(self.fetch_response({"versions": {"2.0.1": {}, "3.0.0": {}}}), frozenset({"2.0.1", "3.0.0"}))

    def test_missing_or_malformed_versions_fail_closed(self) -> None:
        for data in [{}, {"versions": {}}, {"versions": []}, {"versions": {"bad": {}}}, []]:
            with self.subTest(data=data), self.assertRaises(SystemExit):
                self.fetch_response(data)

    def test_invalid_json_fails_closed(self) -> None:
        with patch.object(rn.urllib.request, "urlopen", return_value=io.StringIO("not JSON")), self.assertRaises(SystemExit):
            rn.fetch_published_versions("@vectorfyco/novel-v3")

    def test_registry_errors_fail_closed_after_retries(self) -> None:
        errors = [
            urllib.error.HTTPError("https://registry.npmjs.org/pkg", 404, "Not Found", {}, None),
            urllib.error.HTTPError("https://registry.npmjs.org/pkg", 503, "Unavailable", {}, None),
            urllib.error.URLError("network unavailable"),
            TimeoutError("timeout"),
        ]
        for error in errors:
            with self.subTest(error=error), patch.object(rn.urllib.request, "urlopen", side_effect=error) as request, patch.object(rn.time, "sleep"), self.assertRaises(SystemExit):
                rn.fetch_published_versions("@vectorfyco/novel-v3")
            self.assertEqual(request.call_count, 3)


class CommandTests(unittest.TestCase):
    def test_remote_tag_peels_annotated_tags(self) -> None:
        output = f"{OTHER}\trefs/tags/v3.0.0\n{HEAD}\trefs/tags/v3.0.0^{{}}\n"
        with patch.object(rn, "git", return_value=subprocess.CompletedProcess([], 0, output)):
            self.assertEqual(rn.remote_tag_commit("v3.0.0"), HEAD)

    def test_remote_tag_absence(self) -> None:
        with patch.object(rn, "git", return_value=subprocess.CompletedProcess([], 0, "")):
            self.assertIsNone(rn.remote_tag_commit("v3.0.0"))

    def test_remote_tag_network_failure_fails_closed(self) -> None:
        failure = subprocess.CompletedProcess([], 128, "", "network unavailable")
        with patch.object(rn.subprocess, "run", return_value=failure), contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            rn.remote_tag_commit("v3.0.0")

    def plan(self, *, create_tag: bool, published: frozenset[str] = frozenset({"2.0.1"}), tag_commit: str | None = None) -> tuple[int, list[tuple[object, ...]], dict[str, str]]:
        with patch.object(rn, "read_package", return_value=("@vectorfyco/novel-v3", "3.0.0")), patch.object(rn, "git", return_value=subprocess.CompletedProcess([], 0, HEAD)) as git, patch.object(rn, "fetch_published_versions", return_value=published), patch.object(rn, "remote_tag_commit", return_value=tag_commit), patch.object(rn, "latest_local_tag", return_value=None), patch.object(rn, "changed_files_since", return_value=[]), patch.object(rn, "set_outputs") as outputs, patch.object(rn, "write_summary"), contextlib.redirect_stdout(io.StringIO()):
            code = rn.cmd_plan(argparse.Namespace(create_tag=create_tag, expect_tag=None, require_main_head=False))
            return code, [call.args for call in git.call_args_list], outputs.call_args.kwargs

    def test_dry_run_never_tags_or_pushes(self) -> None:
        code, commands, outputs = self.plan(create_tag=False)
        self.assertEqual(code, 0)
        self.assertEqual(commands, [("rev-parse", "HEAD")])
        self.assertEqual(outputs["publish"], "true")

    def test_create_tag_pushes_only_the_tag_at_head(self) -> None:
        code, commands, _ = self.plan(create_tag=True)
        self.assertEqual(code, 0)
        self.assertEqual(commands, [("rev-parse", "HEAD"), ("tag", "v3.0.0", HEAD), ("push", "origin", "refs/tags/v3.0.0:refs/tags/v3.0.0")])

    def test_wrong_existing_tag_returns_failure_without_mutation(self) -> None:
        code, commands, outputs = self.plan(create_tag=True, tag_commit=OTHER)
        self.assertEqual(code, 1)
        self.assertEqual(commands, [("rev-parse", "HEAD")])
        self.assertEqual(outputs["publish"], "false")

    def test_existing_tag_recovers_without_retagging(self) -> None:
        code, commands, outputs = self.plan(create_tag=True, tag_commit=HEAD)
        self.assertEqual(code, 0)
        self.assertEqual(commands, [("rev-parse", "HEAD")])
        self.assertEqual(outputs["publish"], "true")

    def test_published_version_never_mutates_git(self) -> None:
        code, commands, outputs = self.plan(create_tag=True, published=frozenset({"3.0.0"}), tag_commit=HEAD)
        self.assertEqual(code, 0)
        self.assertEqual(commands, [("rev-parse", "HEAD")])
        self.assertEqual(outputs["publish"], "false")
        self.assertEqual(outputs["github_release"], "true")

    def test_lookup_failures_abort_before_tagging(self) -> None:
        for helper in ["fetch_published_versions", "remote_tag_commit"]:
            with self.subTest(helper=helper), patch.object(rn, "read_package", return_value=("@vectorfyco/novel-v3", "3.0.0")), patch.object(rn, "git", return_value=subprocess.CompletedProcess([], 0, HEAD)) as git, patch.object(rn, "fetch_published_versions", return_value=frozenset({"2.0.1"})), patch.object(rn, helper, side_effect=SystemExit("lookup failed")), contextlib.redirect_stdout(io.StringIO()), self.assertRaises(SystemExit):
                rn.cmd_plan(argparse.Namespace(create_tag=True, expect_tag=None, require_main_head=False))
            self.assertEqual([call.args for call in git.call_args_list], [("rev-parse", "HEAD")])

    def test_main_head_checked_after_registry_lookup_before_mutation(self) -> None:
        for remote in [HEAD, OTHER]:
            commands = []
            def fake_git(*args: str) -> subprocess.CompletedProcess[str]:
                commands.append(args)
                return subprocess.CompletedProcess([], 0, HEAD if args[0] == "rev-parse" else f"{remote}\trefs/heads/main\n")
            def registry(name: str) -> frozenset[str]:
                self.assertEqual(commands, [("rev-parse", "HEAD")])
                return frozenset({"2.0.1"})
            with self.subTest(remote=remote), patch.object(rn, "read_package", return_value=("@vectorfyco/novel-v3", "3.0.0")), patch.object(rn, "git", side_effect=fake_git), patch.object(rn, "fetch_published_versions", side_effect=registry), patch.object(rn, "remote_tag_commit", return_value=None), patch.object(rn, "latest_local_tag", return_value=None), patch.object(rn, "set_outputs") as outputs, patch.object(rn, "write_summary"), contextlib.redirect_stdout(io.StringIO()):
                result = rn.cmd_plan(argparse.Namespace(create_tag=True, expect_tag=None, require_main_head=True))
            self.assertEqual(result, 0 if remote == HEAD else 1)
            self.assertEqual(commands[1], ("ls-remote", "--exit-code", "origin", "refs/heads/main"))
            if remote != HEAD:
                self.assertEqual(len(commands), 2)
                outputs.assert_not_called()

    def test_tag_push_failure_is_not_swallowed(self) -> None:
        with patch.object(rn, "read_package", return_value=("@vectorfyco/novel-v3", "3.0.0")), patch.object(rn, "git", side_effect=[subprocess.CompletedProcess([], 0, HEAD), subprocess.CompletedProcess([], 0, ""), SystemExit(128)]) as git, patch.object(rn, "fetch_published_versions", return_value=frozenset({"2.0.1"})), patch.object(rn, "remote_tag_commit", return_value=None), patch.object(rn, "latest_local_tag", return_value=None), patch.object(rn, "set_outputs"), patch.object(rn, "write_summary"), contextlib.redirect_stdout(io.StringIO()), self.assertRaises(SystemExit) as failure:
            rn.cmd_plan(argparse.Namespace(create_tag=True, expect_tag=None, require_main_head=False))
        self.assertEqual(failure.exception.code, 128)
        self.assertEqual(git.call_args.args, ("push", "origin", "refs/tags/v3.0.0:refs/tags/v3.0.0"))


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
