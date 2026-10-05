# Running Avtoskop on a home server (Raspberry Pi 5)

One Docker Compose file runs everything: PostgreSQL, database migrations, the website and the Telegram bot.
It works on any 64-bit Linux machine with Docker; the same files will be the starting point for Hetzner.

Needs Raspberry Pi OS **64-bit**, and the Pi and the phone on the same Wi-Fi.

## 1. Install Docker on the Pi (once)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Log out and back in, then check: `docker run --rm hello-world`.

## 2. Get the code

```bash
git clone https://github.com/Konstantin86/avtoskop.git
cd avtoskop
```

## 3. Create the settings file

```bash
cp deploy/env.example deploy/.env
hostname -I        # the first address is the Pi's IP, e.g. 192.168.0.50
openssl rand -hex 16   # use as POSTGRES_PASSWORD
nano deploy/.env
```

| Variable                         | Needed      | Value                                                                                           |
| -------------------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `SITE_URL`                       | yes         | `http://<Pi IP>:3000`                                                                           |
| `POSTGRES_PASSWORD`              | yes         | output of `openssl rand -hex 16`                                                                |
| `REQUEST_CONTACT_KEY`            | yes         | encrypts buyers' phones; copy from the laptop, or make a new one with `openssl rand -base64 32` |
| `TELEGRAM_BOT_TOKEN`             | yes         | copy from the laptop                                                                            |
| `TELEGRAM_BOT_USERNAME`          | yes         | the bot's username, without `@`                                                                 |
| `ADMIN_TELEGRAM_IDS`             | recommended | your Telegram ID; without it nobody can open `/admin`                                           |
| `SITE_OPERATOR`, `CONTACT_EMAIL` | no          | shown on the terms and privacy pages                                                            |
| `AUTO_RIA_API_KEY`               | no          | only the auto.ria collector uses it                                                             |

`DATABASE_URL` is set by the compose file, and `AVTOSKOP_DEV_LOGIN` only works on the dev server.

`deploy/.env` holds secrets and is ignored by git. Don't commit it.

## 4. Stop the bot on the laptop

Telegram allows one running copy of a bot. Stop `pnpm bot` on the laptop (Ctrl+C) before starting the Pi.

## 5. Start

```bash
docker compose -f deploy/compose.yml --env-file deploy/.env up -d --build
```

The first build takes several minutes on a Pi. Check that everything runs:

```bash
docker compose -f deploy/compose.yml --env-file deploy/.env ps
docker compose -f deploy/compose.yml --env-file deploy/.env logs -f web bot
```

The bot log should say `Bot @... is running`.

## 6. Copy the car brands and models

The Pi starts with an empty database; the request form needs the brand and model lists. Repeat this step whenever the lists change on the laptop: it only adds what is missing and never deletes requests or offers.

On the **laptop**, in the repository:

```bash
docker compose exec -T postgres pg_dump -U avtoskop -d avtoskop --data-only --inserts --on-conflict-do-nothing -t brands -t models > data/brands.sql
scp data/brands.sql <user>@<Pi IP>:git/avtoskop/data/
```

On the **Pi**:

```bash
docker compose -f deploy/compose.yml --env-file deploy/.env exec -T db psql -q -U avtoskop -d avtoskop < data/brands.sql
```

## 7. Use it

Open `http://<Pi IP>:3000` on any phone or computer on the Wi-Fi.
The Pi has its own database: sign in again and create your seller profile there.

## Updating after code changes

```bash
git pull
docker compose -f deploy/compose.yml --env-file deploy/.env up -d --build
```

## Switching back to the laptop

```bash
docker compose -f deploy/compose.yml --env-file deploy/.env stop bot
```

Then run `pnpm bot` on the laptop again.
