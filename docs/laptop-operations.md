# Laptop Operations

Run these commands on the Linux laptop.

## Resume Storage

If `STORAGE_DRIVER=local`, uploaded resumes live in the Docker `api_uploads` volume and should be backed up.

If `STORAGE_DRIVER=r2`, new uploaded resumes live in Cloudflare R2. The local uploads backup is only needed for old files uploaded before R2 was enabled.

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

If `BACKUP_STORAGE_DRIVER=r2`, the same script also uploads the archive to Cloudflare R2 under:

```text
backups/mongodb/
```

Use these GitHub Actions variables to enable R2 backup upload on the laptop:

```text
BACKUP_STORAGE_DRIVER=r2
BACKUP_R2_PREFIX=backups/mongodb
```

The script reuses the existing R2 values:

```text
R2_ENDPOINT
R2_BUCKET
R2_REGION
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
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

## Pull Latest Backup To Mac

Use this when you start working locally and want your Mac database to match the latest laptop backup.

First, make sure your local `.env` has the R2 values:

```env
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_BUCKET=inclusive-hire-resumes
R2_REGION=auto
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
BACKUP_R2_PREFIX=backups/mongodb
```

Then run on the Mac:

```bash
cd /Users/kayratkaipov/Desktop/test-apps/devops/hiring-people
./deploy/scripts/pull-latest-mongodb-backup.sh
docker compose up -d mongodb
./deploy/scripts/restore-mongodb.sh ./backups/mongodb/latest.archive.gz
```

This is one-way sync from R2 backup to your Mac. Restore uses `--drop`, so it replaces your local MongoDB data.

## Health Checks

```bash
cd /opt/inclusive-hire
docker compose ps
curl -i http://localhost:8080/health
docker compose logs --tail=120 api nginx mongodb
```
