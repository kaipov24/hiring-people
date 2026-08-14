# Laptop Operations

Run these commands on the Linux laptop.

## Back Up MongoDB

```bash
cd /opt/inclusive-hire
./scripts/backup-mongodb.sh
```

Backups are written to:

```text
/opt/inclusive-hire/backups/mongodb
```

By default, backups older than 7 days are deleted.

To keep more days:

```bash
BACKUP_KEEP_DAYS=30 ./scripts/backup-mongodb.sh
```

## Daily Backup Cron

Open crontab:

```bash
crontab -e
```

Add:

```cron
15 3 * * * cd /opt/inclusive-hire && ./scripts/backup-mongodb.sh >> /opt/inclusive-hire/backups/mongodb/backup.log 2>&1
```

This runs every day at 03:15 laptop time.

## Restore MongoDB

Pick a backup:

```bash
ls -lh /opt/inclusive-hire/backups/mongodb
```

Restore:

```bash
cd /opt/inclusive-hire
./scripts/restore-mongodb.sh ./backups/mongodb/inclusive-hire-mongodb-YYYYMMDDTHHMMSSZ.archive.gz
```

Restore uses `--drop`, so it replaces existing collections in the `inclusive_hire` database.

## Health Checks

```bash
cd /opt/inclusive-hire
docker compose ps
curl -i http://localhost:8080/health
docker compose logs --tail=120 api nginx mongodb
```
