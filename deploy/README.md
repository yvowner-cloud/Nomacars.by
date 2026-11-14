# Размещение на сервере hoster.by

Сайт работает на облачном сервере (Ubuntu 22.04/24.04, от 2 ГБ RAM): Node.js + PostgreSQL + Nginx + HTTPS.
Обновление автоматическое: каждый push в `main` → GitHub Actions собирает сайт, прогоняет тесты и выкладывает его на сервер.

## Шаг 1. DNS
В панели hoster.by → домен `nomacars.by` → DNS добавьте записи:
- `A`  `nomacars.by`     → IP сервера
- `A`  `www.nomacars.by` → IP сервера

## Шаг 2. Настройка сервера (один раз)
Откройте консоль сервера (панель hoster.by → облачный сервер → «Консоль») и под `root` выполните:

```bash
curl -fsSL https://raw.githubusercontent.com/yvowner-cloud/Nomacars.by/main/deploy/setup-server.sh | bash
```

Скрипт ставит всё нужное (~10 минут) и в конце печатает 4 значения.

## Шаг 3. Секреты в GitHub
`github.com/yvowner-cloud/Nomacars.by` → **Settings → Secrets and variables → Actions → New repository secret**.
Создайте 4 секрета с именами и значениями из вывода скрипта:

| Имя | Что это |
|---|---|
| `DEPLOY_HOST` | IP сервера |
| `DEPLOY_PORT` | порт SSH (обычно 22) |
| `DEPLOY_KNOWN_HOSTS` | «отпечаток» сервера — защита от подмены |
| `DEPLOY_SSH_KEY` | ключ, который умеет только обновлять сайт |

Показать значения ещё раз: `bash /srv/nomacars/show-secrets.sh`

## Шаг 4. Первый запуск
GitHub → вкладка **Actions** → «Deploy to server» → **Run workflow**. Через 3–5 минут сайт откроется на https://nomacars.by.

## Полезное на сервере
- Состояние сайта: `systemctl status nomacars`
- Журнал: `tail -f /srv/nomacars/logs/app.log`
- Настройки и ключи сервисов: `/srv/nomacars/.env` (в GitHub не попадают)
- Откат на прошлую версию: `ls /srv/nomacars/releases`, затем
  `ln -sfn /srv/nomacars/releases/<папка> /srv/nomacars/current && systemctl restart nomacars`
