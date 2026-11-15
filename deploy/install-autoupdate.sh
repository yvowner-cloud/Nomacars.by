#!/usr/bin/env bash
# =============================================================================
#  Nomacars.by — автообновление сайта на сервере (без ключей и секретов)
#
#  Сервер каждые 2 минуты проверяет GitHub. Если в ветке main новый код:
#  забирает его, ставит зависимости, прогоняет тесты, собирает и перезапускает сайт.
#  Если тесты или сборка упали — работающий сайт не трогается.
#
#  Запуск (от root, один раз; можно повторять):
#    curl -fsSL https://raw.githubusercontent.com/yvowner-cloud/Nomacars.by/main/deploy/install-autoupdate.sh | bash
# =============================================================================
set -euo pipefail
BASE=/srv/nomacars
REPO=https://github.com/yvowner-cloud/Nomacars.by.git

[ "$(id -u)" -eq 0 ] || { echo "Запустите от root."; exit 1; }
id deploy >/dev/null 2>&1 || useradd -m -s /bin/bash deploy
mkdir -p "$BASE/releases" "$BASE/logs"
chown deploy:deploy "$BASE" "$BASE/releases" "$BASE/logs"
command -v git >/dev/null || apt-get install -y -qq git
command -v flock >/dev/null || apt-get install -y -qq util-linux

echo "==> Код сайта"
if [ ! -d "$BASE/src/.git" ]; then
  sudo -H -u deploy git clone -q --depth 50 "$REPO" "$BASE/src"
fi
echo "    ✓ $BASE/src"

echo "==> Скрипт обновления"
cat > "$BASE/update.sh" <<'EOF'
#!/usr/bin/env bash
# Обновить сайт из GitHub. --force — пересобрать даже без новых изменений.
set -euo pipefail
BASE=/srv/nomacars
exec 9>"$BASE/.update.lock"
if ! flock -n 9; then echo "Сборка уже идёт — подождите и смотрите $BASE/logs/update.log"; exit 0; fi
cd "$BASE/src"
git fetch -q --depth 50 origin main
NEW="$(git rev-parse origin/main)"
CUR="$(cat "$BASE/.deployed" 2>/dev/null || true)"
if [ "$NEW" = "$CUR" ] && [ "${1:-}" != "--force" ]; then exit 0; fi
echo "[$(date '+%F %T')] обновление до ${NEW:0:7}"
git reset -q --hard origin/main
npm ci --no-audit --no-fund --loglevel=error
npm test
NEXT_TELEMETRY_DISABLED=1 npm run build
REL="$BASE/releases/$(date +%Y%m%d-%H%M%S)-${NEW:0:7}"
mkdir -p "$REL/.next"
cp -r .next/standalone/. "$REL/"
cp -r .next/static "$REL/.next/static"
cp -r public "$REL/public"
ln -sfn "$REL" "$BASE/current.new" && mv -Tf "$BASE/current.new" "$BASE/current"
sudo /usr/bin/systemctl restart nomacars
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS -o /dev/null http://127.0.0.1:3000/; then
    echo "$NEW" > "$BASE/.deployed"
    echo "[$(date '+%F %T')] ✓ сайт обновлён и отвечает (${NEW:0:7})"
    ls -1dt "$BASE"/releases/* | tail -n +6 | xargs -r rm -rf
    exit 0
  fi
  sleep 2
done
echo "[$(date '+%F %T')] ✗ сайт не ответил после перезапуска — смотрите $BASE/logs/app.log"
exit 1
EOF
chmod 755 "$BASE/update.sh"
chown deploy:deploy "$BASE/update.sh"
echo "    ✓ $BASE/update.sh"

echo "==> Проверка каждые 2 минуты"
cat > /etc/systemd/system/nomacars-update.service <<EOF
[Unit]
Description=Nomacars.by: обновление сайта из GitHub
After=network-online.target

[Service]
Type=oneshot
User=deploy
ExecStart=$BASE/update.sh
StandardOutput=append:$BASE/logs/update.log
StandardError=append:$BASE/logs/update.log
TimeoutStartSec=1200
EOF
cat > /etc/systemd/system/nomacars-update.timer <<'EOF'
[Unit]
Description=Nomacars.by: проверять GitHub каждые 2 минуты

[Timer]
OnBootSec=1min
OnUnitInactiveSec=2min
Persistent=true

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now nomacars-update.timer >/dev/null
echo "    ✓ таймер включён"

echo "==> Первая сборка сайта (3–6 минут, ждите)…"
# если таймер уже начал сборку — дождаться её, иначе собрать самим
sleep 2
flock "$BASE/.update.lock" true
if [ -s "$BASE/.deployed" ] || sudo -H -u deploy "$BASE/update.sh" --force; then
  tail -n 3 "$BASE/logs/update.log" 2>/dev/null || true
  echo
  echo "==============================================================="
  echo "  ГОТОВО. Сайт запущен: http://$(curl -fsS4 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
  echo "  Дальше сайт обновляется сам в течение ~2 минут после изменений в GitHub."
  echo "  Журнал обновлений: tail -n 50 $BASE/logs/update.log"
  echo "==============================================================="
else
  echo "Сборка не удалась — пришлите последние 30 строк выше."
  exit 1
fi
