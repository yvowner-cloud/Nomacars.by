# Размещение на сервере hoster.by

Сервер: Ubuntu, IP **87.232.71.75**. Основной домен **ncars.by** (A-записи `@` и `www` → IP); старый **nomacars.by** перенаправляется на него (301). Перенос — `deploy/switch-domain.sh`. Внутренние имена на сервере остались прежними: `/srv/nomacars`, служба `nomacars`.
Стек на сервере: Node.js 22 + PostgreSQL + Nginx (+ HTTPS через Certbot).

## Как сайт попадает на сервер
**Без ключей и секретов.** Сервер каждые 2 минуты проверяет ветку `main` в GitHub. Если там новый код —
забирает его, ставит зависимости, прогоняет тесты, собирает и перезапускает сайт. Если тесты или сборка
упали — работающая версия остаётся.

В GitHub Actions (`.github/workflows/check.yml`) — только проверка: тесты и сборка на каждом изменении.

## Первичная настройка (один раз, под root)
1. Базовая настройка (Node, PostgreSQL, Nginx, файрвол, swap, служба сайта, база и `/srv/nomacars/.env`):
   ```bash
   curl -fsSL https://raw.githubusercontent.com/yvowner-cloud/Nomacars.by/main/deploy/setup-server.sh | bash
   ```
2. Автообновление + первая сборка:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/yvowner-cloud/Nomacars.by/main/deploy/install-autoupdate.sh | bash
   ```
3. HTTPS (когда домен уже указывает на сервер):
   ```bash
   certbot --nginx -d nomacars.by -d www.nomacars.by --redirect --agree-tos --register-unsafely-without-email -n
   ```

## Вход по SMS
- Пока SMS-сервис не подключён (`SMS_PROVIDER` пустой), код не отправляется, а пишется в журнал:
  `grep "\[SMS\]" /srv/nomacars/logs/app.log | tail -n 5`
- Номер владельца (получает права владельца при входе):
  `echo 'OWNER_PHONES=+375XXXXXXXXX' >> /srv/nomacars/.env && systemctl restart nomacars`
- Таблицы базы создаются сами при старте сайта (миграции в `src/lib/server/migrations.ts`).

## Полезное
- Состояние сайта: `systemctl status nomacars`
- Журнал сайта: `tail -n 50 /srv/nomacars/logs/app.log`
- Журнал обновлений: `tail -n 50 /srv/nomacars/logs/update.log`
- Обновить прямо сейчас: `sudo -H -u deploy /srv/nomacars/update.sh --force`
- Настройки и ключи сервисов: `/srv/nomacars/.env` (в GitHub не попадают)
- Откат: `ls /srv/nomacars/releases`, затем
  `ln -sfn /srv/nomacars/releases/<папка> /srv/nomacars/current && systemctl restart nomacars`
  (следующий новый коммит снова обновит сайт)

## Секреты DEPLOY_* в GitHub
Больше не используются (схема «GitHub заходит на сервер по ключу» заменена). Их можно удалить:
Settings → Secrets and variables → Actions.
