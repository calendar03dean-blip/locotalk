#!/usr/bin/env bash
#
# build45-keychainfix.sh — non-interactive local iOS build that sidesteps the
# dual-distribution-cert keychain collision WITHOUT deleting any cert.
# -------------------------------------------------------------------------------
# Root cause (confirmed): login.keychain holds a distribution cert
#   B976F855... "iPhone Distribution: Jukang Kim (CZ6F9378X9)" whose CN is
#   IDENTICAL to EAS's managed cert 244387C7... . During `eas build --local`,
#   xcodebuild's signing-identity resolution scans the keychain SEARCH LIST and
#   can pick the login one, which the AppStore profile does NOT include →
#   "Provisioning profile ... doesn't include signing certificate" (build42/43/44 fail).
#
# Fix (fully reversible, no GUI, no password, no cert deletion):
#   temporarily remove login.keychain from the USER search list for the duration
#   of the build. EAS prepends its own temp keychain (which carries 244387C7 +
#   private key), so only the CORRECT cert is visible → archive signs cleanly.
#   A trap restores the original search list + default keychain on ANY exit.
#
# Verified beforehand: with login excluded, `security find-identity -p codesigning`
# returns 0 identities (collision cert gone); restore brings it back.
#
set -uo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

KEY_PATH="$REPO/credentials/AuthKey_957LPQM658.p8"
TMPKC="/tmp/eas-build-noLogin.keychain"

ORIG_LIST="$(security list-keychains -d user | sed 's/^[[:space:]]*//; s/"//g')"
ORIG_DEFAULT="$(security default-keychain -d user | sed 's/^[[:space:]]*//; s/"//g')"
echo "[fix] original user search list: $ORIG_LIST"
echo "[fix] original default keychain: $ORIG_DEFAULT"

restore() {
  echo "[fix] restoring keychain search list + default keychain"
  # shellcheck disable=SC2086
  security list-keychains -d user -s $ORIG_LIST || true
  security default-keychain -d user -s "$ORIG_DEFAULT" || true
  security delete-keychain "$TMPKC" 2>/dev/null || true
  echo "[fix] keychain state restored."
}
trap restore EXIT

# throwaway keychain becomes the only entry in the user search list (login excluded).
# BUT: EAS validates its imported dist cert with `security find-identity -v` (VALID
# identities), and chain validation needs the Apple WWDR intermediate — which lives
# in login.keychain. So we copy the public Apple CA/intermediate certs (no private
# keys → no GUI prompt) into the throwaway, giving chain validation what it needs
# while still hiding the colliding distribution IDENTITY that only login.keychain has.
security delete-keychain "$TMPKC" 2>/dev/null || true
security create-keychain -p tempPW123 "$TMPKC"
security set-keychain-settings "$TMPKC"
security unlock-keychain -p tempPW123 "$TMPKC"

WWDR_PEM="/tmp/_apple_chain.pem"
: > "$WWDR_PEM"
for cn in "Worldwide Developer Relations" "Apple Root CA" "Apple iPhone Certification Authority"; do
  security find-certificate -a -c "$cn" -p login.keychain-db >> "$WWDR_PEM" 2>/dev/null || true
done
# split the PEM bundle into individual certs (macOS csplit lacks -b/-z; use awk) and
# import each (security import takes only the first cert from a multi-cert bundle).
rm -f /tmp/_apple_cert_*.pem 2>/dev/null || true
awk 'BEGIN{n=0} /BEGIN CERTIFICATE/{n++} {print > ("/tmp/_apple_cert_" n ".pem")}' "$WWDR_PEM"
for c in /tmp/_apple_cert_*.pem; do
  [ -f "$c" ] && security import "$c" -k "$TMPKC" -A >/dev/null 2>&1 || true
done
rm -f /tmp/_apple_cert_*.pem "$WWDR_PEM" 2>/dev/null || true
echo "[fix] Apple chain certs in throwaway: $(security find-certificate -a "$TMPKC" 2>/dev/null | grep -c labl)"

security list-keychains -d user -s "$TMPKC"
echo "[fix] user search list now excludes login.keychain:"
security list-keychains -d user

# verify the collision cert IDENTITY is invisible before spending ~15 min on a build
if security find-identity -v -p codesigning | grep -q "iPhone Distribution: Jukang Kim"; then
  echo "[fix] FATAL: distribution cert still visible — aborting to avoid a doomed build."
  exit 1
fi
echo "[fix] confirmed: no distribution identity visible (collision avoided)."

# ASC API key (key already on disk; issuer provided by 대표) — used by submit later,
# exported here too so any EAS auth path is non-interactive.
export EXPO_ASC_API_KEY_PATH="$KEY_PATH"
export EXPO_ASC_KEY_ID="957LPQM658"
export EXPO_ASC_ISSUER_ID="5ef930ec-d270-44f0-bedd-97e3e8f75932"
export EAS_BUILD_NO_EXPO_GO_WARNING=true
# Skip the advisory expo-doctor prebuild gate (official EAS escape hatch, build-tools
# setup.js:115). Doctor flags non-blocking project warnings (eas-cli in deps,
# react-native-worklets peer, expo-intent-launcher version) that do NOT stop the
# binary from compiling; we are not mutating deps right before a release build.
export EAS_BUILD_DISABLE_EXPO_DOCTOR_STEP=1

echo "[fix] starting: npx eas build --platform ios --profile production --local --non-interactive"
npx eas build \
  --platform ios \
  --profile production \
  --local \
  --non-interactive \
  --output "$REPO/build45.ipa"
RC=$?

if [ "$RC" -eq 0 ] && [ -f "$REPO/build45.ipa" ]; then
  echo "[fix] BUILD SUCCEEDED → $REPO/build45.ipa"
  ls -la "$REPO/build45.ipa"
else
  echo "[fix] BUILD FAILED (exit $RC) — see log above."
fi
exit $RC
