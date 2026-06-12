#!/usr/bin/env bash
#
# build45-build-and-submit.sh — chain a FRESH local build44 → TestFlight submit.
# ------------------------------------------------------------------------------
# Why fresh: the pre-existing build45.ipa (mtime 10:52) predates commit
#   1b0edba "B안 로그인 UX" (committed 13:29) — the very change the 대표 must
#   inspect on-device. So we MUST rebuild from current HEAD, not reuse it.
#
# Steps (all non-interactive, detached via run-long.sh):
#   1) build45-keychainfix.sh  → writes  $REPO/build45.ipa  (keychain-collision-safe)
#   2) copy that IPA to         /Users/deank/claude-orchestrator/dev/build45.ipa
#      (where build45-submit.sh expects it)
#   3) build45-submit.sh        → eas submit to TestFlight (eas.json 3-field profile)
#
# Run:
#   bash ~/claude-handoff/run-long.sh "build45 빌드→TestFlight 제출" \
#        ./scripts/build45-build-and-submit.sh
#
set -uo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

REPO_IPA="$REPO/build45.ipa"
DEV_IPA="/Users/deank/claude-orchestrator/dev/build45.ipa"
HEAD_SHA="$(git rev-parse --short HEAD)"

echo "=============================================================="
echo "[orchestrate] build45 fresh build → submit  (HEAD=$HEAD_SHA)"
echo "=============================================================="

# ---- 1) BUILD ---------------------------------------------------------------
echo "[orchestrate] STEP 1/3 — local build (build45-keychainfix.sh)"
bash "$REPO/scripts/build45-keychainfix.sh"
RC=$?
if [ "$RC" -ne 0 ] || [ ! -f "$REPO_IPA" ]; then
  echo "[orchestrate] BUILD FAILED (exit $RC, ipa present? $([ -f "$REPO_IPA" ] && echo yes || echo no)) — aborting before submit."
  exit "${RC:-1}"
fi
echo "[orchestrate] build OK → $REPO_IPA"
ls -la "$REPO_IPA"

# ---- 2) STAGE IPA where submit expects it -----------------------------------
echo "[orchestrate] STEP 2/3 — staging IPA to $DEV_IPA"
cp -f "$REPO_IPA" "$DEV_IPA"
ls -la "$DEV_IPA"

# ---- 3) SUBMIT --------------------------------------------------------------
echo "[orchestrate] STEP 3/3 — submit to TestFlight (build45-submit.sh)"
bash "$REPO/scripts/build45-submit.sh"
RC=$?
if [ "$RC" -ne 0 ]; then
  echo "[orchestrate] SUBMIT step returned exit $RC."
  echo "[orchestrate] NOTE: exit 1 can be a CLI polling drop, not a real failure —"
  echo "[orchestrate]       verify build44 status in App Store Connect / GraphQL before resubmitting."
  exit "$RC"
fi

echo "=============================================================="
echo "[orchestrate] DONE — build45 ($HEAD_SHA) submitted to TestFlight."
echo "[orchestrate] Next: confirm App Store Connect Processing → installable."
echo "=============================================================="
