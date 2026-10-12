import unittest

from release_guard import REQUIRED_JOBS, assert_candidate

SHA = "a" * 40
RUNS = [{"head_sha": SHA, "head_branch": "main", "event": "push", "conclusion": "success"}]
JOBS = [{"name": name, "conclusion": "success"} for name in REQUIRED_JOBS]


class ReleaseGuardTests(unittest.TestCase):
    def test_staging_accepts_current_main_and_complete_ci(self):
        assert_candidate(SHA, SHA, RUNS, JOBS, "staging")

    def test_production_requires_same_sha_hosted_acceptance(self):
        with self.assertRaises(ValueError):
            assert_candidate(SHA, SHA, RUNS, JOBS, "production")
        assert_candidate(SHA, SHA, RUNS, JOBS, "production", SHA)

    def test_older_main_cannot_replace_newer_release(self):
        with self.assertRaises(ValueError):
            assert_candidate(SHA, "b" * 40, RUNS, JOBS, "staging")

    def test_pr_success_is_not_main_release_evidence(self):
        with self.assertRaises(ValueError):
            assert_candidate(SHA, SHA, [{**RUNS[0], "event": "pull_request"}], JOBS, "staging")

    def test_skipped_or_missing_required_jobs_block_release(self):
        for conclusion in ["skipped", "neutral", "failure", "cancelled"]:
            with self.subTest(conclusion=conclusion), self.assertRaises(ValueError):
                assert_candidate(SHA, SHA, RUNS, [{**job, "conclusion": conclusion} for job in JOBS], "staging")
        with self.assertRaises(ValueError):
            assert_candidate(SHA, SHA, RUNS, [], "staging")


if __name__ == "__main__":
    unittest.main()
