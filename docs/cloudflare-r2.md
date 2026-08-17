# Cloudflare R2 Resume Storage

Use Cloudflare R2 for uploaded resumes so files are not tied to one laptop Docker volume.

## 1. Create A Bucket

In Cloudflare:

1. Open `R2 Object Storage`.
2. Create a bucket, for example:
   ```text
   inclusive-hire-resumes
   ```
3. Keep the bucket private.

## 2. Create API Credentials

In Cloudflare R2:

1. Open `Manage R2 API Tokens`.
2. Create an API token.
3. Give it object read/write access to the resume bucket.
4. Copy:
   - Access Key ID
   - Secret Access Key
   - Endpoint URL

The endpoint usually looks like:

```text
https://ACCOUNT_ID.r2.cloudflarestorage.com
```

## 3. Add GitHub Actions Variables

Repository settings:

```text
Settings -> Secrets and variables -> Actions -> Variables
```

Add:

```text
STORAGE_DRIVER=r2
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_BUCKET=inclusive-hire-resumes
R2_REGION=auto
```

## 4. Add GitHub Actions Secrets

Repository settings:

```text
Settings -> Secrets and variables -> Actions -> Secrets
```

Add:

```text
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
```

## 5. Redeploy

Run:

```text
Actions -> Deploy laptop -> Run workflow
```

New resume uploads will go to Cloudflare R2. Existing locally uploaded resumes stay in the Docker volume until you migrate them.

## 6. Migration Later

The current code supports both old local resume records and new R2 resume records. You can migrate old local files later without blocking deployment.
