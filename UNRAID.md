# Deploying Picture Frame to Unraid

## One-time setup

1. Log into your container registry:

   ```bash
   docker login ghcr.io   # for GitHub Container Registry
   # or
   docker login           # for Docker Hub
   ```

2. Build and push the image:
   ```bash
   APP_NAME="Family Photos" ./publish.sh ghcr.io/username/picture-frame
   ```
   The `APP_NAME` is baked into the image at build time (PWA manifest, page title). Change it to whatever you want the app to be called.

## Unraid: Add Container

In the Unraid web UI, go to **Docker** → **Add Container** and fill in:

| Field        | Value                                   |
| ------------ | --------------------------------------- |
| Name         | `picture-frame`                         |
| Repository   | `ghcr.io/username/picture-frame:latest` |
| Network type | Bridge                                  |

**Port mapping:**
| Host port | Container port |
|---|---|
| `3000` | `3000` |

**Volume mappings:**
| Host path | Container path |
|---|---|
| `/mnt/user/appdata/picture-frame/db` | `/data/db` |
| `/mnt/user/appdata/picture-frame/uploads` | `/app/public/uploads` |

**Environment variables:**

The following are baked into the image — no need to set them: `NODE_ENV`, `APP_NAME`, `PORT`.

| Variable          | Required    | Notes                                           |
| ----------------- | ----------- | ----------------------------------------------- |
| `JWT_SECRET`      | Yes         | Random secret for session tokens                |
| `DB_FILE_NAME`    | Yes         | `file:/data/db/picture-frame.db`                |
| `APP_URL`         | Recommended | `https://your-domain.com` — used in email links |
| `EMAIL_FROM_NAME` | No          | Defaults to the baked-in `APP_NAME`             |
| `SMTP_HOST`       | No          | For email invites                               |
| `SMTP_PORT`       | No          |                                                 |
| `SMTP_USER`       | No          |                                                 |
| `SMTP_PASS`       | No          |                                                 |
| `EMAIL_FROM`      | No          |                                                 |

Click **Apply** to start the container. Check the **Docker** tab — the container should show a green healthy status within ~30 seconds.

## Updating

1. Re-run publish to build and push a new image:

   ```bash
   APP_NAME="Family Photos" ./publish.sh ghcr.io/username/picture-frame
   ```

2. In Unraid's Docker tab, click the container icon → **Force Update**.

## First user

After the container is running, create your first account:

```bash
docker exec picture-frame node dist/scripts/create-user.js "Your Name" email@example.com yourpassword
```

Then navigate to `http://unraid-ip:3000` and log in.
