#!/usr/bin/env bash
# =============================================================================
#  Nomacars.by — первичная настройка облачного сервера (Ubuntu 22.04 / 24.04)
#
#  Запуск (от root, в консоли сервера hoster.by):
#    curl -fsSL https://raw.githubusercontent.com/yvowner-cloud/Nomacars.by/main/deploy/setup-server.sh | bash
#
#  Что делает:
#    • обновляет систему, включает файрвол и автообновления безопасности
#    • добавляет 2 ГБ подкачки (swap) — чтобы хватало памяти при сборке и ИИ-задачах
#    • ставит Node.js 22, PostgreSQL, Nginx, Certbot (HTTPS)
#    • создаёт базу данных и пользователя для сайта (пароль генерируется сам)
#    • создаёт служебного пользователя deploy для автообновления сайта из GitHub
#    • настраивает Nginx для nomacars.by и выпускает сертификат HTTPS
#    • в конце печатает 3 значения, которые нужно вставить в GitHub
#
#  Скрипт можно запускать повторно — он ничего не сломает.
# =============================================================================
set -euo pipefail

DOMAIN="nomacars.by"
APP="nomacars"
BASE="/srv/${APP}"
PORT=3000

say()  { printf "\n\033[1;31m==>\033[0m \033[1m%s\033[0m\n" "$*"; }
ok()   { printf "    \033[32m✓\033[0m %s\n" "$*"; }
warn() { printf "    \033[33m!\033[0m %s\n" "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "Запустите от root (или через sudo)."; exit 1; }
. /etc/os-release
if [ "${ID:-}" != "ubuntu" ]; then
  warn "Скрипт рассчитан на Ubuntu, у вас: ${PRETTY_NAME:-неизвестно}. Продолжаю, но возможны ошибки."
fi
export DEBIAN_FRONTEND=noninteractive

say "1/9 Обновление системы"
apt-get update -qq
apt-get -y -qq -o Dpkg::Options::="--force-confold" upgrade
apt-get install -y -qq curl ca-certificates gnupg git rsync ufw nginx postgresql postgresql-contrib \
  certbot python3-certbot-nginx unattended-upgrades dnsutils openssl >/dev/null
ok "Пакеты установлены"

say "2/9 Подкачка (swap) 2 ГБ"
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ok "Swap включён"
else
  ok "Swap уже есть"
fi

say "3/9 Node.js 22"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
ok "Node.js $(node -v)"

say "4/9 Файрвол и автообновления безопасности"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null
dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null 2>&1 || true
ok "Открыты только SSH, HTTP и HTTPS"

say "5/9 Папки и служебный пользователь deploy"
id deploy >/dev/null 2>&1 || useradd -m -s /bin/bash deploy
mkdir -p "${BASE}/releases" "${BASE}/uploads" "${BASE}/logs"
chown -R deploy:deploy "${BASE}"
# deploy может только перезапускать сайт, больше никаких прав root
cat > /etc/sudoers.d/${APP}-deploy <<EOF
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart ${APP}, /usr/bin/systemctl status ${APP}, /usr/bin/systemctl is-active ${APP}
EOF
chmod 440 /etc/sudoers.d/${APP}-deploy
ok "Пользователь deploy готов"

say "6/9 Ключ для автообновления из GitHub"
mkdir -p /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
if [ ! -f /home/deploy/.ssh/github_deploy ]; then
  ssh-keygen -t ed25519 -N "" -C "github-actions-deploy" -f /home/deploy/.ssh/github_deploy >/dev/null
fi
touch /home/deploy/.ssh/authorized_keys
grep -qf /home/deploy/.ssh/github_deploy.pub /home/deploy/.ssh/authorized_keys || cat /home/deploy/.ssh/github_deploy.pub >> /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys /home/deploy/.ssh/github_deploy
chown -R deploy:deploy /home/deploy/.ssh
ok "Ключ создан"

say "7/9 База данных PostgreSQL"
ENV_FILE="${BASE}/.env"
if [ ! -f "${ENV_FILE}" ]; then
  DB_PASS="$(openssl rand -hex 24)"
  sudo -u postgres psql -qtc "SELECT 1 FROM pg_roles WHERE rolname='${APP}'" | grep -q 1 \
    && sudo -u postgres psql -qc "ALTER USER ${APP} WITH PASSWORD '${DB_PASS}';" \
    || sudo -u postgres psql -qc "CREATE USER ${APP} WITH PASSWORD '${DB_PASS}';"
  sudo -u postgres psql -qtc "SELECT 1 FROM pg_database WHERE datname='${APP}'" | grep -q 1 \
    || sudo -u postgres psql -qc "CREATE DATABASE ${APP} OWNER ${APP};"
  cat > "${ENV_FILE}" <<EOF
# Настройки сайта. Этот файл хранится только на сервере, в GitHub его нет.
NODE_ENV=production
PORT=${PORT}
HOSTNAME=127.0.0.1
SITE_URL=https://${DOMAIN}
DATABASE_URL=postgresql://${APP}:${DB_PASS}@127.0.0.1:5432/${APP}
SESSION_SECRET=$(openssl rand -hex 32)
UPLOADS_DIR=${BASE}/uploads
# Владельцы сайта (через запятую): эти номера получают права владельца при входе
OWNER_PHONES=
# SMS-сервис: пусто или log — код пишется в журнал; http — см. src/lib/server/sms.ts
SMS_PROVIDER=
SMS_API_KEY=
# Этап 4: Telegram-уведомления
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
# Этап 6: ИИ-шлюз и данные аукционов
AIAI_API_BASE=https://api.aiai.by/v1
AIAI_API_KEY=
AUCTION_DATA_API_KEY=
EOF
  ok "База создана, пароль сохранён в ${ENV_FILE}"
else
  ok "Файл настроек уже есть, базу не трогаю"
fi
chown root:deploy "${ENV_FILE}" && chmod 640 "${ENV_FILE}"

say "8/9 Служба сайта и Nginx"
cat > /etc/systemd/system/${APP}.service <<EOF
[Unit]
Description=Nomacars.by website
After=network.target postgresql.service

[Service]
Type=simple
User=deploy
WorkingDirectory=${BASE}/current
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/node ${BASE}/current/server.js
Restart=always
RestartSec=3
MemoryMax=1200M
StandardOutput=append:${BASE}/logs/app.log
StandardError=append:${BASE}/logs/app.log

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable ${APP} >/dev/null 2>&1 || true

cat > /etc/nginx/sites-available/${APP} <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};
    client_max_body_size 20m;

    location /_next/static/ {
        proxy_pass http://127.0.0.1:${PORT};
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
ln -sf /etc/nginx/sites-available/${APP} /etc/nginx/sites-enabled/${APP}
rm -f /etc/nginx/sites-enabled/default
nginx -t -q && systemctl reload nginx
ok "Nginx настроен для ${DOMAIN}"

say "9/9 Сертификат HTTPS"
SERVER_IP="$(curl -fsS4 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
DNS_IP="$(dig +short A ${DOMAIN} | tail -n1)"
if [ -n "${DNS_IP}" ] && [ "${DNS_IP}" = "${SERVER_IP}" ]; then
  WWW=""; [ "$(dig +short A www.${DOMAIN} | tail -n1)" = "${SERVER_IP}" ] && WWW="-d www.${DOMAIN}"
  if certbot --nginx -d ${DOMAIN} ${WWW} --non-interactive --agree-tos --register-unsafely-without-email --redirect -q; then
    ok "HTTPS включён, сертификат будет продлеваться автоматически"
  else
    warn "Certbot не смог выпустить сертификат. Запустите позже: certbot --nginx -d ${DOMAIN}"
  fi
else
  warn "Домен ${DOMAIN} пока указывает на '${DNS_IP:-ничего}', а IP сервера ${SERVER_IP}."
  warn "Добавьте A-запись ${DOMAIN} → ${SERVER_IP} в DNS и потом выполните: certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
fi

# ---------------------------------------------------------------------------
SSH_PORT="$(sshd -T 2>/dev/null | awk '/^port /{print $2; exit}')"; SSH_PORT="${SSH_PORT:-22}"
cat <<EOF


===============================================================================
  ГОТОВО. Теперь добавьте 4 секрета в GitHub:
  github.com/yvowner-cloud/Nomacars.by → Settings → Secrets and variables →
  Actions → New repository secret
===============================================================================

  Имя: DEPLOY_HOST
  Значение:
${SERVER_IP}

  Имя: DEPLOY_PORT
  Значение:
${SSH_PORT}

  Имя: DEPLOY_KNOWN_HOSTS
  Значение (все строки целиком):
$(ssh-keyscan -p "${SSH_PORT}" -t ed25519,rsa 127.0.0.1 2>/dev/null | sed "s/^127.0.0.1/${SERVER_IP}/; s/^\[127.0.0.1\]/[${SERVER_IP}]/")

  Имя: DEPLOY_SSH_KEY
  Значение (всё от -----BEGIN до -----END включительно):
$(cat /home/deploy/.ssh/github_deploy)

===============================================================================
  Ключ DEPLOY_SSH_KEY даёт право только обновлять сайт. Никому его не
  пересылайте и не публикуйте — только в секреты GitHub.
  Показать эти значения ещё раз:  bash ${BASE}/show-secrets.sh
===============================================================================
EOF

cat > "${BASE}/show-secrets.sh" <<EOF
#!/usr/bin/env bash
echo "DEPLOY_HOST: ${SERVER_IP}"; echo "DEPLOY_PORT: ${SSH_PORT}"
echo "DEPLOY_KNOWN_HOSTS:"; ssh-keyscan -p ${SSH_PORT} -t ed25519,rsa 127.0.0.1 2>/dev/null | sed "s/^127.0.0.1/${SERVER_IP}/; s/^\[127.0.0.1\]/[${SERVER_IP}]/"
echo "DEPLOY_SSH_KEY:"; cat /home/deploy/.ssh/github_deploy
EOF
chmod 700 "${BASE}/show-secrets.sh"
