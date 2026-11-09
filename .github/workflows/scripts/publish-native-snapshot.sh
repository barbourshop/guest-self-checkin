#!/usr/bin/env bash
# Publish one installable native build as the current snapshot.
# Replaces the same-named asset on the native-snapshot prerelease and deletes
# older Actions artifacts of this name so previous builds are not kept.
#
# Usage: publish-native-snapshot.sh <artifact-name> <file>

set -euo pipefail

# Git Bash rewrites arguments that start with / into Windows paths.
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

artifact_name="${1:?artifact name required}"
file="${2:?file required}"

if [[ ! -f "$file" ]]; then
  echo "Snapshot file not found: $file" >&2
  exit 1
fi

repo="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
run_id="${GITHUB_RUN_ID:?GITHUB_RUN_ID is required}"
sha="${GITHUB_SHA:-unknown}"
tag="native-snapshot"
asset_name="$(basename "$file")"

notes="$(cat <<EOF
Latest installable snapshot of the native Qt app. This release is replaced on each build; older snapshots are not kept.

- FrontDeskApp-Windows.zip — unzip the folder and run FrontDeskApp.exe
- FrontDeskApp-macOS-arm64.dmg — Apple silicon. Open the disk image and double-click Install.command. Sonoma reports the unsigned download as damaged until that script clears the download flag.
- FrontDeskApp-macOS-x86_64.dmg — Intel. Same install step.

Updated from \`${sha}\`.
EOF
)"

retry() {
  local attempt
  for attempt in 1 2 3 4 5; do
    if "$@"; then
      return 0
    fi
    echo "Command failed (attempt ${attempt}); retrying" >&2
    sleep $((attempt * 3))
  done
  return 1
}

echo "Publishing ${asset_name} to ${tag}"
if ! gh release view "$tag" --repo "$repo" >/dev/null 2>&1; then
  retry gh release create "$tag" \
    --repo "$repo" \
    --prerelease \
    --title "Native app snapshot" \
    --notes "$notes" \
    || true
fi

retry gh release upload "$tag" --repo "$repo" "$file" --clobber

# Refresh the description. Another platform job from this same commit may
# write the same notes.
retry gh release edit "$tag" \
  --repo "$repo" \
  --prerelease \
  --title "Native app snapshot" \
  --notes "$notes" >/dev/null

delete_named_artifacts() {
  local name="$1"
  local exclude_current="$2"
  local ids
  if [[ "$exclude_current" == "yes" ]]; then
    ids="$(gh api --paginate "repos/${repo}/actions/artifacts?per_page=100" \
      --jq ".artifacts[] | select(.name==\"${name}\" and .expired==false and .workflow_run.id != ${run_id}) | .id")"
  else
    ids="$(gh api --paginate "repos/${repo}/actions/artifacts?per_page=100" \
      --jq ".artifacts[] | select(.name==\"${name}\" and .expired==false) | .id")"
  fi
  if [[ -z "$ids" ]]; then
    return 0
  fi
  while IFS= read -r id; do
    [[ -z "$id" ]] && continue
    echo "Deleting Actions artifact ${name} (${id})"
    gh api --method DELETE "repos/${repo}/actions/artifacts/${id}" >/dev/null
  done <<<"$ids"
}

# Keep the artifact uploaded by this run. Remove the same snapshot from older runs.
delete_named_artifacts "$artifact_name" yes

legacy_names=""
case "$artifact_name" in
  snapshot-windows)
    legacy_names="native-windows-build native-windows-exe native-windows"
    ;;
  snapshot-macos-arm64)
    legacy_names="native-macos-arm64-dmg native-macos-arm64-app native-macos-arm64"
    ;;
  snapshot-macos-x86_64)
    legacy_names="native-macos-x86_64-dmg native-macos-x86_64-app native-macos-x86_64"
    ;;
esac

for legacy in $legacy_names; do
  delete_named_artifacts "$legacy" no
done

echo "Snapshot ${asset_name} is now the only retained ${artifact_name} build."
