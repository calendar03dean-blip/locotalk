#!/usr/bin/env bash
#
# build45-submit.sh — non-interactive TestFlight submit for build45.ipa
# ---------------------------------------------------------------------
# Identical proven mechanism as build43-submit.sh (which succeeded:
# "✔ Submitted your app to Apple App Store Connect!").
#
# Only differences vs build43-submit.sh:
#   - IPA lives at the orchestrator dev dir (local keychain-fix build output):
#       /Users/deank/claude-orchestrator/dev/build45.ipa
#   - labels say build45
#
# `eas submit` resolves the ASC API key from the eas.json submit profile
# (ascApiKeyPath + ascApiKeyId + ascApiKeyIssuerId, all three). We inject
# those 3 fields temporarily, submit, then ALWAYS restore eas.json (trap EXIT)
# so the committed eas.json never carries the issuer id.
#
# Run detached via the long-job wrapper:
#   bash ~/claude-handoff/run-long.sh "build45 TestFlight 제출" ./scripts/build45-submit.sh
#
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

KEY_PATH="$REPO/credentials/AuthKey_957LPQM658.p8"
KEY_ID="957LPQM658"                                   # derived from .p8 filename
ISSUER_ID="${EXPO_ASC_ISSUER_ID:-5ef930ec-d270-44f0-bedd-97e3e8f75932}"
IPA="/Users/deank/claude-orchestrator/dev/build45.ipa"
EAS_JSON="$REPO/eas.json"
EAS_JSON_BAK="$REPO/eas.json.submit.bak"

# ---- preflight ------------------------------------------------------
[ -f "$KEY_PATH" ]  || { echo "FATAL: ASC API key not found at $KEY_PATH"; exit 1; }
[ -f "$IPA" ]       || { echo "FATAL: ipa not found at $IPA"; exit 1; }
[ -f "$EAS_JSON" ]  || { echo "FATAL: eas.json not found at $EAS_JSON"; exit 1; }

# ---- guaranteed restore (success / failure / interrupt) -------------
restore_eas_json() {
  if [ -f "$EAS_JSON_BAK" ]; then
    if ! mv -f "$EAS_JSON_BAK" "$EAS_JSON"; then
      echo "FATAL: failed to restore eas.json from backup — MANUAL CHECK REQUIRED" >&2
      exit 99
    fi
    echo "[build45] eas.json restored from backup."
  fi
}
trap restore_eas_json EXIT

# ---- backup + inject ascApiKey* into submit.production.ios ----------
cp -p "$EAS_JSON" "$EAS_JSON_BAK"
PRE_SUM="$(shasum -a 256 "$EAS_JSON" | awk '{print $1}')"

KEY_PATH="$KEY_PATH" KEY_ID="$KEY_ID" ISSUER_ID="$ISSUER_ID" EAS_JSON="$EAS_JSON" \
node -e '
  const fs = require("fs");
  const p = process.env.EAS_JSON;
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  j.submit = j.submit || {};
  j.submit.production = j.submit.production || {};
  const ios = j.submit.production.ios = j.submit.production.ios || {};
  ios.ascApiKeyPath = "./credentials/AuthKey_957LPQM658.p8";
  ios.ascApiKeyId = process.env.KEY_ID;
  ios.ascApiKeyIssuerId = process.env.ISSUER_ID;
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
  console.log("[build45] eas.json patched: ascApiKeyId=" + ios.ascApiKeyId + ", ascAppId=" + ios.ascAppId + ", appleTeamId=" + ios.appleTeamId);
'

export EAS_BUILD_NO_EXPO_GO_WARNING=true

echo "[build45] Submitting $IPA → TestFlight (Key ID $KEY_ID, issuer ***) via eas.json profile."

npx eas-cli submit \
  --platform ios \
  --profile production \
  --path "$IPA" \
  --non-interactive

echo "[build45] SUBMIT SUCCEEDED → TestFlight processing (App Store Connect)."

# ---- restore now + verify file matches its pre-script state ---------
restore_eas_json
trap - EXIT   # already restored; avoid double-restore on normal exit

POST_SUM="$(shasum -a 256 "$EAS_JSON" | awk '{print $1}')"
if [ "$POST_SUM" = "$PRE_SUM" ]; then
  echo "[build45] eas.json verified IDENTICAL to pre-script state (no net change)."
else
  echo "WARN: eas.json differs from pre-script snapshot after restore — please inspect:" >&2
  git --no-pager diff -- "$EAS_JSON" >&2
  exit 98
fi
