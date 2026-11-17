#!/usr/bin/env bash
# =============================================================================
#  Перенос сайта на новый домен ncars.by.
#  Старый nomacars.by (и www) навсегда перенаправляется на https://ncars.by (301) —
#  ссылки и позиции в поиске не теряются.
#
#  Запуск (от root, после того как A-записи ncars.by и www.ncars.by указывают на сервер):
#    curl -fsSL https://raw.githubusercontent.com/yvowner-cloud/Nomacars.by/main/deploy/switch-domain.sh | bash
#
#  Можно запускать повторно. При ошибке в настройке Nginx возвращается прежняя конфигурация.
# =============================================================================
set -euo pipefail

NEW="ncars.by"
OLD="nomacars.by"
PORT=3000
BASE="/srv/nomacars"
CONF="/etc/nginx/sites-available/nomacars"
ACME="/var/www/acme"

say() { printf "\n\033[1;31m==>\033[0m \033[1m%s\033[0m\n" "$*"; }
ok()  { printf "    \033[32m✓\033[0m %s\n" "$*"; }
die() { printf "    \033[31m✗\033[0m %s\n" "$*"; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Запустите от root."
command -v dig >/dev/null || apt-get install -y -qq dnsutils >/dev/null

say "1/5 Проверка DNS"
IP="$(curl -fsS4 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
for h in "$NEW" "www.$NEW"; do
  got="$(dig +short A "$h" @1.1.1.1 | tail -n1)"
  [ "$got" = "$IP" ] || die "$h указывает на '${got:-ничего}', а сервер — $IP. В DNS домена $NEW нужны A-записи @ и www → $IP. Подождите 15–30 минут после правки и запустите снова."
  [ -z "$(dig +short AAAA "$h" @1.1.1.1)" ] || die "У $h есть запись AAAA (IPv6) — удалите её в DNS домена и запустите снова."
  ok "$h → $IP"
done

say "2/5 Сертификат HTTPS для $NEW"
mkdir -p "$ACME"
[ -f "$CONF" ] && cp -a "$CONF" "$CONF.bak-$(date +%Y%m%d-%H%M%S)"
if [ ! -f "/etc/letsencrypt/live/$NEW/fullchain.pem" ]; then
  cat > /etc/nginx/sites-enabled/ncars-acme <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $NEW www.$NEW;
    location /.well-known/acme-challenge/ { root $ACME; }
    location / { return 404; }
}
EOF
  nginx -t -q && systemctl reload nginx
  certbot certonly --webroot -w "$ACME" -d "$NEW" -d "www.$NEW" --agree-tos --register-unsafely-without-email -n \
    || { rm -f /etc/nginx/sites-enabled/ncars-acme; systemctl reload nginx; die "Не удалось выпустить сертификат. Проверьте DNS и запустите снова."; }
  rm -f /etc/nginx/sites-enabled/ncars-acme
fi
ok "Сертификат для $NEW и www.$NEW есть, продлевается автоматически"

say "3/5 Настройка Nginx"
SSL_OPTS=""
[ -f /etc/letsencrypt/options-ssl-nginx.conf ] && SSL_OPTS="include /etc/letsencrypt/options-ssl-nginx.conf;"
[ -f /etc/letsencrypt/ssl-dhparams.pem ] && SSL_OPTS="$SSL_OPTS ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;"
OLD_BLOCK=""
if [ -f "/etc/letsencrypt/live/$OLD/fullchain.pem" ]; then
  OLD_BLOCK="server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $OLD www.$OLD;
    ssl_certificate /etc/letsencrypt/live/$OLD/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$OLD/privkey.pem;
    $SSL_OPTS
    return 301 https://$NEW\$request_uri;
}"
fi

cat > "$CONF" <<EOF
# Ncars: основной адрес https://$NEW; $OLD и www — переадресация 301 на https://$NEW
server {
    listen 80;
    listen [::]:80;
    server_name $NEW www.$NEW $OLD www.$OLD;
    location /.well-known/acme-challenge/ { root $ACME; }
    location / { return 301 https://$NEW\$request_uri; }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name www.$NEW;
    ssl_certificate /etc/letsencrypt/live/$NEW/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$NEW/privkey.pem;
    $SSL_OPTS
    return 301 https://$NEW\$request_uri;
}

$OLD_BLOCK

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $NEW;
    ssl_certificate /etc/letsencrypt/live/$NEW/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$NEW/privkey.pem;
    $SSL_OPTS
    client_max_body_size 20m;

    location /_next/static/ {
        proxy_pass http://127.0.0.1:$PORT;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
    location / {
        proxy_pass http://127.0.0.1:$PORT;
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
ln -sf "$CONF" /etc/nginx/sites-enabled/nomacars
if nginx -t 2>/tmp/nginx-test.log; then
  systemctl reload nginx
  ok "Nginx перенастроен"
else
  cat /tmp/nginx-test.log
  LAST="$(ls -1t "$CONF".bak-* 2>/dev/null | head -n1 || true)"
  [ -n "$LAST" ] && cp -a "$LAST" "$CONF" && systemctl reload nginx
  die "Ошибка в настройке Nginx — прежняя конфигурация возвращена. Пришлите вывод выше."
fi

say "4/5 Адрес сайта в настройках"
if grep -q '^SITE_URL=' "$BASE/.env"; then sed -i "s|^SITE_URL=.*|SITE_URL=https://$NEW|" "$BASE/.env"; else echo "SITE_URL=https://$NEW" >> "$BASE/.env"; fi
systemctl restart nomacars
sleep 4
ok "SITE_URL=https://$NEW, сайт перезапущен"

say "5/5 Проверка"
code_new="$(curl -s -o /dev/null -w '%{http_code}' "https://$NEW/")"
loc_old="$(curl -s -o /dev/null -w '%{http_code} → %{redirect_url}' "https://$OLD/catalog" || true)"
loc_www="$(curl -s -o /dev/null -w '%{http_code} → %{redirect_url}' "http://www.$NEW/" || true)"
echo "    https://$NEW/            → $code_new"
echo "    https://$OLD/catalog → $loc_old"
echo "    http://www.$NEW/         → $loc_www"
[ "$code_new" = "200" ] && ok "Готово: сайт работает на https://$NEW" || die "Сайт на https://$NEW не ответил 200 — пришлите вывод выше."
