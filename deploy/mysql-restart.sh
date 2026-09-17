#!/usr/bin/env bash
# Gracefully restart the user-space MySQL so mysqlx_bind_address=127.0.0.1 takes
# effect (closes the public :33060). Runs entirely as 'dev' — NO sudo/root.
# Review, then run:   bash /home/dev/MyEduPort/deploy/mysql-restart.sh
set -u
BASE=/home/dev/mysql-local
SOCK=$BASE/tmp/mysql.sock
BIN=$BASE/mysql/bin
LOG=$BASE/logs/error.log

echo "== ports BEFORE =="; ss -ltn 2>/dev/null | grep -E ':3306|:33060' || echo "(mysql not listening?)"

# load DB creds from the app's .env (for a privileged, graceful shutdown)
set -a; . /home/dev/MyEduPort/backend/.env 2>/dev/null; set +a

MPID=$(pgrep -x mysqld | head -1)
echo "== stopping mysqld (pid ${MPID:-none}) =="
if "$BIN/mysqladmin" --socket="$SOCK" -u"${DB_USER:-root}" -p"${DB_PASSWORD:-}" shutdown 2>/dev/null; then
  echo "clean shutdown via mysqladmin"
else
  echo "mysqladmin shutdown not permitted — sending SIGTERM (mysqld shuts down gracefully on it)"
  [ -n "$MPID" ] && kill "$MPID"
fi

# wait up to 30s for it to stop
for i in $(seq 1 30); do pgrep -x mysqld >/dev/null || { echo "stopped after ~${i}s"; break; }; sleep 1; done
if pgrep -x mysqld >/dev/null; then echo "!! still running after 30s — aborting, do NOT relaunch. Check $LOG"; exit 1; fi

echo "== relaunching (detached, identical command) =="
cd "$BASE" || exit 1
setsid ./mysql/bin/mysqld --defaults-file=./my.cnf </dev/null >>"$LOG" 2>&1 &
disown 2>/dev/null || true

# wait up to 40s for it to come back
for i in $(seq 1 40); do
  if [ -S "$SOCK" ] && ss -ltn 2>/dev/null | grep -q '127.0.0.1:3306'; then echo "back up after ~${i}s"; break; fi
  sleep 1
done

echo "== ports AFTER (want BOTH on 127.0.0.1, no * / 0.0.0.0) =="
ss -ltn 2>/dev/null | grep -E ':3306|:33060' || echo "(mysql not listening — check $LOG)"
echo "== new mysqld pid: $(pgrep -x mysqld) =="
echo "== app DB health =="; curl -s http://127.0.0.1:4000/health 2>/dev/null | head -c 300; echo
echo "Done. If :33060 now shows 127.0.0.1, the public X-protocol port is closed."
