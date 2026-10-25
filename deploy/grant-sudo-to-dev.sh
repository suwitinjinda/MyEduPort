#!/usr/bin/env bash
#
# Give the `dev` account sudo rights on this server.
#
# Right now `dev` is in no admin group, so `sudo` refuses with "dev is not in the sudoers
# file" and every change that needs root has to go through `su -`. This puts `dev` in the
# standard Ubuntu `sudo` group, which is the normal way to do it.
#
# Run as root:
#
#     su -
#     bash /home/dev/MyEduPort/deploy/grant-sudo-to-dev.sh
#
# What this means, plainly: afterwards `dev` can run any command as root by typing the
# DEV password. That is full administrative access to this machine. It does NOT enable
# passwordless sudo — a password is still required every time, which is what you want on
# a server that also runs the public website.
#
# Safe to run twice.

set -euo pipefail

USER_NAME=${1:-dev}

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[31m✗ %s\033[0m\n\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || fail "This needs root. Run:  su -   then:  bash $0"
id "$USER_NAME" >/dev/null 2>&1 || fail "No such user: $USER_NAME"
getent group sudo >/dev/null || fail "There is no 'sudo' group on this system."

# ---------------------------------------------------------------- 1. the group
if id -nG "$USER_NAME" | tr ' ' '\n' | grep -qx sudo; then
  say "$USER_NAME is already in the sudo group."
else
  usermod -aG sudo "$USER_NAME"
  say "Added $USER_NAME to the sudo group"
fi

# ---------------------------------------------------------------- 2. the rule
# Being in the group only helps if /etc/sudoers actually grants the group anything.
# Ubuntu ships that line, but check rather than assume — a missing %sudo rule is the
# classic reason "I added myself to the group and sudo still says no".
if grep -qE '^[[:space:]]*%sudo[[:space:]]' /etc/sudoers; then
  say "/etc/sudoers already grants the sudo group"
else
  DROPIN=/etc/sudoers.d/90-sudo-group
  printf '%%sudo ALL=(ALL:ALL) ALL\n' > "$DROPIN"
  chmod 0440 "$DROPIN"
  # Never leave a broken sudoers file behind — that can lock everyone out of sudo
  if ! visudo -cf "$DROPIN" >/dev/null; then
    rm -f "$DROPIN"
    fail "The sudoers rule did not validate — removed it, nothing changed."
  fi
  say "Added the %sudo rule in $DROPIN (validated with visudo)"
fi

visudo -c >/dev/null || fail "sudoers is not valid — fix it before logging out of this root shell."

# ---------------------------------------------------------------- 3. prove it
say "Checking"
printf '  groups for %s: %s\n' "$USER_NAME" "$(id -nG "$USER_NAME")"

if runuser -l "$USER_NAME" -c 'sudo -n true' 2>/dev/null; then
  printf '  sudo works without a password prompt (unexpected, but it works)\n'
elif runuser -l "$USER_NAME" -c 'sudo -nv' 2>&1 | grep -q 'password is required'; then
  printf '  sudo is now available and will ask for a password — correct.\n'
else
  printf '\033[33m  Could not confirm from here. Group membership only applies to NEW login\n'
  printf '  sessions, so your current shell still has the old groups.\033[0m\n'
fi

cat <<EOF

$(printf '\033[32m✓ Done.\033[0m')

IMPORTANT: group changes only take effect in a NEW login session.
Log out of this root shell and out of your SSH session, then log back in as $USER_NAME:

    exit          # leave the root shell
    exit          # leave the SSH session
    ssh $USER_NAME@<this server>
    sudo -v       # should prompt for YOUR password, then return quietly

While you are still root, you may as well finish the other pending change:

    bash /home/dev/MyEduPort/deploy/enable-share-links.sh

To undo this later:

    su -
    gpasswd -d $USER_NAME sudo

EOF
