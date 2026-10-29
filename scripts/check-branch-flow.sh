#!/usr/bin/env bash
# Decides whether a pull request may target its base branch.
#   main  : only from a branch named UAT that lives in this repository (not a fork)
#   UAT   : anything goes, the gates job is the only requirement
# Exits 0 to allow, 1 to refuse, and says why on stdout.
set -eu

BASE="${BASE:-}"
HEAD="${HEAD:-}"
HEAD_REPO="${HEAD_REPO:-}"
THIS_REPO="${THIS_REPO:-}"

if [ -z "$BASE" ] || [ -z "$HEAD" ]; then
    echo "check-branch-flow: BASE and HEAD are required" >&2
    exit 2
fi

echo "flow: $HEAD (from ${HEAD_REPO:-unknown}) -> $BASE"

# A refusal should be visible as an annotation in the PR, not only buried in the job log.
refuse() {
    if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
        echo "::error::$1"
    else
        echo "flow REFUSED: $1"
    fi
    exit 1
}

if [ "$BASE" != "main" ]; then
    echo "flow OK: only main has a source rule"
    exit 0
fi

if [ -z "$HEAD_REPO" ] || [ -z "$THIS_REPO" ]; then
    refuse "cannot prove where $HEAD came from (HEAD_REPO/THIS_REPO unset); refusing to release to main"
fi

if [ "$HEAD_REPO" != "$THIS_REPO" ]; then
    refuse "main takes releases from this repository's UAT branch, not a fork ($HEAD_REPO)"
fi

if [ "$HEAD" != "UAT" ]; then
    refuse "main only takes merges from UAT; this PR is $HEAD -> main. Merge into UAT first, then open the release PR from UAT."
fi

echo "flow OK: UAT -> main"
