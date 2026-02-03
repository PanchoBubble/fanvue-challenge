# CI/CD & Deployment

## Overview

The project uses **GitHub Actions** to automatically deploy to a **Hetzner** server on every push to `main`. The workflow SSHs into the server and runs a production Docker Compose build in-place.

## Architecture

```
Push to main
    │
    ▼
GitHub Actions (ubuntu-latest)
    │
    ▼  SSH (appleboy/ssh-action)
Hetzner Server
    ├── git pull origin main
    ├── docker compose -f docker-compose.prod.yml up -d --build
    └── docker image prune -f
```

## File Structure

```
.github/
└── workflows/
    └── deploy.yml              # GitHub Actions workflow
docker-compose.yml              # Development (local)
docker-compose.prod.yml         # Production (server)
backend/
└── Dockerfile                  # Multi-stage Node 20 Alpine build
```

### `deploy.yml`

Triggered on push to `main`. Single job that SSHs into the server and redeploys.

### `docker-compose.prod.yml`

Production variant of the dev compose file. Key differences from `docker-compose.yml`:

| Aspect | Dev | Prod |
|---|---|---|
| Credentials | Hardcoded | Read from `.env` on server |
| Source volumes | Mounted (`./backend/src:/app/src`) | None (baked into image) |
| Seed data | Runs on every start | Skipped |
| Restart policy | None | `unless-stopped` |
| Exposed ports | Postgres (5432), Redis (6379) | Only API (3001) |
| NODE_ENV | `development` | `production` |

## Server Setup (One-Time)

### 1. Install Docker

```bash
# Hetzner servers typically run Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
systemctl enable docker
```

### 2. Clone the Repository

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/<your-org>/fanvue-challenge.git
cd fanvue-challenge
```

### 3. Create Production `.env`

Create `/opt/fanvue-challenge/.env` with:

```env
DB_USER=fanvue
DB_PASSWORD=<generate-a-strong-password>
DB_NAME=fanvue_inbox
JWT_SECRET=<generate-a-random-secret>
```

Generate secrets with:

```bash
openssl rand -hex 32
```

### 4. Initial Deploy

```bash
cd /opt/fanvue-challenge
docker compose -f docker-compose.prod.yml up -d --build
```

To seed initial data on first deploy:

```bash
docker compose -f docker-compose.prod.yml exec api sh -c "npm run seed"
```

### 5. Verify

```bash
# Check containers are running
docker compose -f docker-compose.prod.yml ps

# Check API health
curl http://localhost:3001/api/threads
```

## GitHub Secrets

Configure these in **Settings > Secrets and variables > Actions**:

| Secret | Description | Example |
|---|---|---|
| `SERVER_HOST` | Hetzner server IP or hostname | `65.108.x.x` |
| `SERVER_USER` | SSH user | `root` or `deploy` |
| `SSH_PRIVATE_KEY` | Full SSH private key content | `-----BEGIN OPENSSH...` |
| `DEPLOY_PATH` | Absolute path to repo on server | `/opt/fanvue-challenge` |

### Setting Up SSH Key Access

If you don't already have a deploy key:

```bash
# On your local machine
ssh-keygen -t ed25519 -f ~/.ssh/fanvue-deploy -C "github-actions-deploy"

# Copy public key to server
ssh-copy-id -i ~/.ssh/fanvue-deploy.pub <user>@<server-ip>

# The private key (~/.ssh/fanvue-deploy) goes into the SSH_PRIVATE_KEY GitHub secret
```

## Operations

### View Logs

```bash
ssh <user>@<server-ip>
cd /opt/fanvue-challenge
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f postgres
```

### Restart Services

```bash
docker compose -f docker-compose.prod.yml restart api
```

### Run Migrations Manually

```bash
docker compose -f docker-compose.prod.yml exec api sh -c "npm run migration:run"
```

### Database Backup

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d).sql
```

### Rollback

```bash
cd /opt/fanvue-challenge
git log --oneline -5            # find the commit to roll back to
git checkout <commit-sha>
docker compose -f docker-compose.prod.yml up -d --build
```

## Troubleshooting

**Deploy fails with SSH error:**
- Verify `SSH_PRIVATE_KEY` secret contains the full key including `-----BEGIN` and `-----END` lines
- Check server firewall allows SSH (port 22)
- Ensure the public key is in `~/.ssh/authorized_keys` on the server

**Containers crash on startup:**
- Check `.env` file exists at `DEPLOY_PATH` on the server
- Run `docker compose -f docker-compose.prod.yml logs api` for error details
- Verify Postgres is healthy before API starts (healthcheck handles this)

**Port 3001 not accessible:**
- Check server firewall: `ufw allow 3001` or configure via Hetzner Cloud firewall
- If using a reverse proxy (nginx), ensure it proxies to `localhost:3001`
