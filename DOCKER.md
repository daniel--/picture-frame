# Docker Setup

This document describes how to run the Picture Frame application using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

## Quick Start

1. **Create a `.env.production` file** in the project root with the following variables:

```env
JWT_SECRET=your-strong-random-secret-key-here
DB_FILE_NAME=/data/db/picture-frame.db
PORT=3000
NODE_ENV=production
```

**Important**: Generate a strong random string for `JWT_SECRET`. You can use:

```bash
openssl rand -base64 32
```

You can copy the example file to get started:

```bash
cp .env.production.example .env.production
# Then edit .env.production and set your JWT_SECRET
```

2. **Build and start the container**:

```bash
docker-compose up -d
```

**Important**: The container loads environment variables from `.env.production` via the `env_file` directive. The `.env` file (if it exists) is excluded from the Docker image for security. All environment variables should be set in `.env.production`.

If you have a `.env` file, it won't affect the container since:

- It's excluded from the Docker image (via `.dockerignore`)
- The `docker-compose.yml` uses `env_file: .env.production` to load variables
- Variable substitution has been removed from the compose file

3. **View logs**:

```bash
docker-compose logs -f
```

4. **Stop the container**:

```bash
docker-compose down
```

## Building the Image

To build the Docker image manually:

```bash
docker build -t picture-frame:latest .
```

## Running the Container

To run the container manually (without docker-compose):

```bash
docker run -d \
  --name picture-frame \
  -p 3000:3000 \
  -e JWT_SECRET=your-secret-key \
  -e DB_FILE_NAME=/data/db/picture-frame.db \
  -v picture-frame-db:/data/db \
  -v picture-frame-uploads:/app/public/uploads \
  picture-frame:latest
```

## Volumes

The Docker setup uses named volumes to persist data:

- **db-data**: Stores the SQLite database file
- **uploads-data**: Stores uploaded images and thumbnails

These volumes persist even when containers are removed. To remove volumes:

```bash
docker-compose down -v
```

## Environment Variables

| Variable       | Description                      | Default                     | Required |
| -------------- | -------------------------------- | --------------------------- | -------- |
| `JWT_SECRET`   | Secret key for JWT token signing | -                           | Yes      |
| `DB_FILE_NAME` | Path to SQLite database file     | `/data/db/picture-frame.db` | No       |
| `PORT`         | Server port                      | `3000`                      | No       |
| `NODE_ENV`     | Node environment                 | `production`                | No       |

## Health Check

The container includes a health check that verifies the HTTP server is responding. Check health status:

```bash
docker ps
```

Look for the "STATUS" column showing "healthy" or "unhealthy".

## Creating the First User

After starting the container, you can create the first user by executing:

```bash
docker-compose exec picture-frame npm run create-user
```

Or if running manually:

```bash
docker exec -it picture-frame npm run create-user
```

## Troubleshooting

### Container won't start

1. Check logs: `docker-compose logs`
2. Verify `.env.production` file exists and environment variables are set correctly
3. Ensure port 3000 is not already in use

### Database issues

1. The database is stored in a Docker volume
2. To reset the database, remove the volume: `docker-compose down -v`
3. Restart the container to create a fresh database

### Upload issues

1. Verify the uploads volume is mounted correctly
2. Check container logs for file permission errors
3. Ensure sufficient disk space

## Production Considerations

1. **Security**:
   - Use a strong, randomly generated `JWT_SECRET`
   - Consider using Docker secrets for sensitive data
   - Run containers as non-root user (already using node user in Alpine)

2. **Performance**:
   - Consider using a reverse proxy (nginx, Traefik) in front of the container
   - Set appropriate resource limits in docker-compose.yml

3. **Backups**:
   - Regularly backup the `db-data` and `uploads-data` volumes
   - Use volume backup tools or copy data from volumes

4. **Monitoring**:
   - Set up logging aggregation
   - Monitor container health checks
   - Track resource usage
