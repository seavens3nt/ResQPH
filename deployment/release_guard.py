"""Read-only exact-SHA release gate. No provider mutation or secret output."""
import json
import os
import re
import urllib.request

REQUIRED_JOBS = {
    "frontend", "backend", "ml-evidence", "routing", "mongodb-transactions",
    "production-browser", "release-gate",
}


def assert_candidate(sha, latest, runs, jobs, environment, staging_sha=""):
    if not re.fullmatch(r"[0-9a-f]{40}", sha) or sha != latest:
        raise ValueError("Candidate must be the current main commit")
    if environment not in {"staging", "production"}:
        raise ValueError("Unknown release environment")
    if environment == "production" and staging_sha != sha:
        raise ValueError("Hosted staging acceptance must approve this exact SHA first")
    if not any(run["head_sha"] == sha and run["head_branch"] == "main"
               and run["event"] == "push" and run["conclusion"] == "success" for run in runs):
        raise ValueError("Successful main push CI is required for this exact SHA")
    successful = {job["name"] for job in jobs if job["conclusion"] == "success"}
    if not REQUIRED_JOBS <= successful:
        raise ValueError("Every required CI job must succeed; skipped/neutral does not qualify")


def github(path):
    request = urllib.request.Request("https://api.github.com/" + path, headers={
        "Authorization": "Bearer " + os.environ["GH_TOKEN"],
        "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
    })
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def main():
    sha = os.environ["RELEASE_SHA"]
    repo = os.environ["GITHUB_REPOSITORY"]
    latest = github(f"repos/{repo}/git/ref/heads/main")["object"]["sha"]
    runs = github(f"repos/{repo}/actions/workflows/ci.yml/runs?head_sha={sha}&event=push&per_page=20")["workflow_runs"]
    candidates = [run for run in runs if run["head_sha"] == sha and run["head_branch"] == "main"
                  and run["event"] == "push" and run["conclusion"] == "success"]
    jobs = []
    if candidates:
        run_id = candidates[0]["id"]
        jobs = github(f"repos/{repo}/actions/runs/{run_id}/jobs?per_page=100")["jobs"]
    assert_candidate(sha, latest, runs, jobs, os.environ["RELEASE_ENVIRONMENT"], os.getenv("STAGING_ACCEPTED_SHA", ""))
    print(f"Exact-SHA release gate passed: {sha}")


if __name__ == "__main__":
    main()
