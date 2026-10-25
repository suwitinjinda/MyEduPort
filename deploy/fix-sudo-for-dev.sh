#!/usr/bin/env bash
#
# Diagnose and fix sudo for the `dev` account.
#
# Symptom this is for: `dev` IS in the sudo group, but sudo still says
#     "Sorry, user dev may not run sudo on <host>."
#
# That message means sudo recognised the user but found no rule granting them anything,
# which is different from "not in the sudoers file". The usual causes:
#
#   a) /etc/sudoers has no `%sudo ALL=(ALL:ALL) ALL` line (it was removed or edited)
#   b) /etc/sudoers has no `@includedir /etc/sudoers.d` line, so drop-in files are
#      silently ignored — a rule can be sitting there doing absolutely nothing
#   c) a later rule overrides the earlier grant
#
# This script reports which of those it found, then fixes it with an explicit rule for
# the user, validated with visudo before anything is kept.
#
# Run as root:
#
#     su -
#     bash /home/dev/MyEduPort/deploy/fix-sudo-for-dev.sh
#
# Safe to run twice. Password is still required for sudo afterwards (no NOPASSWD).

set -euo pipefail

USER_NAME=${1:-dev}
SUDOERS=/etc/sudoers
DROPIN_DIR=/etc/sudoers.d
DROPIN=$DROPIN_DIR/91-$USER_NAME

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
note() { printf '  %s\n' "$*"; }
fail() { printf '\n\033[31m✗ %s\033[0m\n\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || fail "This needs root. Run:  su -   then:  bash $0"
id "$USER_NAME" >/dev/null 2>&1 || fail "No such user: $USER_NAME"

grant_already_works() {
  sudo -l -U "$1" 2>/dev/null | grep -qE '\(ALL[[:space:]]*:[[:space:]]*ALL\)[[:space:]]+ALL'
}

# ---------------------------------------------------------------- diagnose
say "1. What sudo currently thinks $USER_NAME may do"
sudo -l -U "$USER_NAME" 2>&1 | sed 's/^/  /' || true

say "2. Groups"
note "$(id -nG "$USER_NAME")"

say "3. /etc/sudoers"
if grep -qE '^[[:space:]]*%sudo[[:space:]]' "$SUDOERS"; then
  note "has a %sudo rule:  $(grep -E '^[[:space:]]*%sudo[[:space:]]' "$SUDOERS" | head -1)"
  HAS_SUDO_RULE=yes
else
  note "NO %sudo rule — being in the sudo group grants nothing on its own."
  HAS_SUDO_RULE=no
fi

# This is the quiet one: without an includedir line, everything in sudoers.d is ignored.
if grep -qE '^[[:space:]]*[@#]includedir[[:space:]]+/etc/sudoers\.d' "$SUDOERS"; then
  note "includes /etc/sudoers.d — drop-in files are read"
  HAS_INCLUDE=yes
else
  note "DOES NOT include /etc/sudoers.d — any drop-in rule there is being IGNORED."
  HAS_INCLUDE=no
fi

say "3b. The actual rules in $SUDOERS (comments stripped)"
grep -vE '^[[:space:]]*(#|$)' "$SUDOERS" | sed 's/^/  /'

say "3c. Every drop-in rule that is actually in force"
for f in "$DROPIN_DIR"/*; do
  [[ -f $f ]] || continue
  # sudo ignores drop-ins whose name contains a dot or ends in ~
  case "${f##*/}" in
    *.*|*~) printf '  %s  <-- IGNORED by sudo (name has a dot or ends in ~)\n' "${f##*/}"; continue ;;
  esac
  printf '  %s:\n' "${f##*/}"
  grep -vE '^[[:space:]]*(#|$)' "$f" 2>/dev/null | sed 's/^/      /' || true
done

say "4. Files in $DROPIN_DIR"
if [[ -d $DROPIN_DIR ]]; then
  ls -1 "$DROPIN_DIR" 2>/dev/null | sed 's/^/  /' || note "(empty)"
else
  note "(directory does not exist)"
fi

# ---------------------------------------------------------------- fix
say "5. Applying the fix"

if grant_already_works "$USER_NAME"; then
  cat <<EOF
  Nothing to fix: sudoers already grants $USER_NAME full access.

  If "sudo" still refuses in your shell, that shell is carrying the group list it had at
  login, from before $USER_NAME joined the sudo group. Groups are read once, at login.

  Get a fresh one without dropping your SSH session:

      exec su -l $USER_NAME
      sudo -v

EOF
  exit 0
fi


if [[ $HAS_INCLUDE == no ]]; then
  # Restore the include so drop-ins work. Appended at the end: sudoers applies the LAST
  # matching rule, and includes must come after the defaults they may override.
  cp -p "$SUDOERS" "${SUDOERS}.bak.$(date +%Y%m%d-%H%M%S)"
  printf '\n@includedir /etc/sudoers.d\n' >> "$SUDOERS"
  if ! visudo -c >/dev/null 2>&1; then
    LATEST=$(ls -t "${SUDOERS}".bak.* | head -1)
    cp -p "$LATEST" "$SUDOERS"
    fail "Adding the includedir line broke sudoers — restored $LATEST, nothing changed."
  fi
  note "added '@includedir /etc/sudoers.d' to $SUDOERS (backup taken)"
  HAS_INCLUDE=yes
fi

mkdir -p "$DROPIN_DIR"
chmod 0755 "$DROPIN_DIR"

# An explicit per-user rule, rather than relying on the group. It is unambiguous, it is
# easy to find later, and it survives someone editing the %sudo line again.
TMP=$(mktemp)
printf '# Added by MyEduPort deploy/fix-sudo-for-dev.sh\n%s ALL=(ALL:ALL) ALL\n' "$USER_NAME" > "$TMP"
if ! visudo -cf "$TMP" >/dev/null; then
  rm -f "$TMP"
  fail "The new rule did not validate. Nothing changed."
fi
install -m 0440 -o root -g root "$TMP" "$DROPIN"
rm -f "$TMP"
note "wrote $DROPIN:  $USER_NAME ALL=(ALL:ALL) ALL"

if [[ $HAS_SUDO_RULE == no ]]; then
  GROUP_DROPIN=$DROPIN_DIR/90-sudo-group
  TMP=$(mktemp)
  printf '# Added by MyEduPort deploy/fix-sudo-for-dev.sh\n%%sudo ALL=(ALL:ALL) ALL\n' > "$TMP"
  if visudo -cf "$TMP" >/dev/null; then
    install -m 0440 -o root -g root "$TMP" "$GROUP_DROPIN"
    note "wrote $GROUP_DROPIN:  %sudo ALL=(ALL:ALL) ALL"
  fi
  rm -f "$TMP"
fi

visudo -c >/dev/null || fail "sudoers is now invalid. DO NOT log out of this root shell. Run: visudo -c"

# ---------------------------------------------------------------- prove it
say "6. What sudo thinks now"
sudo -l -U "$USER_NAME" 2>&1 | sed 's/^/  /' || true

if grant_already_works "$USER_NAME"; then
  cat <<EOF

$(printf '\033[32m✓ Fixed.\033[0m') $USER_NAME can now run any command via sudo, after typing their own password.

Open a NEW shell as $USER_NAME and check:

    exec su -l $USER_NAME
    sudo -v

Then finish the other pending change:

    sudo bash /home/dev/MyEduPort/deploy/enable-share-links.sh

EOF
else
  cat <<EOF

$(printf '\033[33m! Still not granted.\033[0m') Paste the output of section 6 above and the
line below, and we'll work out what is overriding it:

    grep -vE '^\s*(#|$)' /etc/sudoers

EOF
  exit 1
fi
