# Hostinger VPS Deployment

This runbook deploys the Replica app on a fresh Ubuntu 24 VPS with Docker Compose, MySQL, the API, the Next.js web app and Caddy for HTTPS.

## 1. Point DNS to the VPS

Create an `A` record for your domain, for example `salon.example.com`, pointing to the Hostinger VPS public IPv4 address. Wait until DNS resolves before starting Caddy, because Caddy requests the HTTPS certificate automatically.

## 2. Install system packages and Docker

SSH into the VPS, then install Docker from Docker's official apt repository:

```sh
sudo apt update
sudo apt install -y ca-certificates curl git ufw
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run hello-world
```

## 3. Open only the required public ports

```sh
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

The production compose stack only publishes Caddy on `80` and `443`. MySQL, API and web containers stay on the private Docker network.

## 4. Clone the app

```sh
sudo mkdir -p /opt/replica-salon
sudo chown -R "$USER:$USER" /opt/replica-salon
git clone https://github.com/Adarshjaiswal/replica-salon.git /opt/replica-salon
cd /opt/replica-salon
```

If the repository is private, configure an SSH deploy key or use a GitHub token before cloning.

## 5. Create the production env file

```sh
cp deploy/hostinger/env.production.example deploy/hostinger/.env.production
chmod 600 deploy/hostinger/.env.production
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 48
```

Edit `deploy/hostinger/.env.production` and replace every placeholder. At minimum set:

- `DOMAIN`, for example `salon.example.com`
- `TLS_EMAIL`
- `WEB_ORIGIN=https://your-domain`
- `API_ORIGIN=https://your-domain`
- `NEXT_PUBLIC_API_BASE_URL=https://your-domain/api/v1`
- `BETTER_AUTH_URL=https://your-domain`
- `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`
- `BETTER_AUTH_SECRET`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_BOOTSTRAP_PASSWORD`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Use URL-safe generated secrets, such as `openssl rand -hex 32`, for MySQL values because Compose builds `DATABASE_URL` from those variables.

## 6. Build, migrate and start

```sh
docker compose --env-file deploy/hostinger/.env.production -f deploy/hostinger/docker-compose.prod.yml build
docker compose --env-file deploy/hostinger/.env.production -f deploy/hostinger/docker-compose.prod.yml up -d
docker compose --env-file deploy/hostinger/.env.production -f deploy/hostinger/docker-compose.prod.yml ps
```

The `migrate` service runs `prisma migrate deploy` once before the API starts.

## 7. Seed the first admin

Run this once after the stack is healthy:

```sh
docker compose --env-file deploy/hostinger/.env.production -f deploy/hostinger/docker-compose.prod.yml run --rm migrate pnpm db:seed
```

After login works, remove `SUPER_ADMIN_BOOTSTRAP_PASSWORD` from `deploy/hostinger/.env.production`, then restart the API:

```sh
docker compose --env-file deploy/hostinger/.env.production -f deploy/hostinger/docker-compose.prod.yml up -d api web caddy
```

Leaving the bootstrap password in the env file makes later seed runs reset that admin password.

## 8. Configure Razorpay

In the Razorpay dashboard, set the webhook URL to:

```text
https://your-domain/api/v1/customer/payments/razorpay/webhook
```

Use the same webhook secret in `RAZORPAY_WEBHOOK_SECRET`. Keep test credentials for staging/testing only; switch to live Razorpay keys before accepting real payments.

## 9. Verify the deployment

```sh
curl -I https://your-domain
curl https://your-domain/api/v1/health
curl https://your-domain/api/v1/readiness
docker compose --env-file deploy/hostinger/.env.production -f deploy/hostinger/docker-compose.prod.yml logs --tail=100 api
```

Then test admin login and check the admin payment reconciliation screen after a Razorpay test payment/webhook.

## Updating Later

```sh
cd /opt/replica-salon
git pull
docker compose --env-file deploy/hostinger/.env.production -f deploy/hostinger/docker-compose.prod.yml build
docker compose --env-file deploy/hostinger/.env.production -f deploy/hostinger/docker-compose.prod.yml up -d
```

Back up the `mysql-data` Docker volume before major releases.
