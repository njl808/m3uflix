# 🐳 Docker Deployment Guide

## Quick Start

1. **Clone and configure:**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit with your IPTV credentials
   nano .env
   ```

2. **Deploy with Docker Compose:**
   ```bash
   # Start all services
   docker-compose up -d
   
   # Check status
   docker-compose ps
   
   # View logs
   docker-compose logs -f iptv-player
   ```

3. **Access the application:**
   - Open http://localhost:5000 in your browser
   - Enter your Xtream Codes credentials in the app

## Environment Variables

### Required:
- `XTREAM_URL` - Your IPTV server URL
- `XTREAM_USERNAME` - Your IPTV username  
- `XTREAM_PASSWORD` - Your IPTV password

### Optional:
- `SESSION_SECRET` - Session encryption key
- `TZ` - Timezone (default: UTC)
- `PORT` - Application port (default: 5000)

## Services

### IPTV Player App
- **Port**: 5000
- **Health Check**: HTTP endpoint monitoring
- **Restart Policy**: unless-stopped

### PostgreSQL Database  
- **Internal Port**: 5432
- **Database**: iptv_player
- **User**: iptv_user
- **Persistent Storage**: Docker volume

## Production Deployment

### Docker Swarm:
```bash
docker stack deploy -c docker-compose.yaml iptv-stack
```

### With Custom Network:
```bash
docker network create iptv-net
docker-compose up -d
```

### Behind Reverse Proxy:
Update your nginx/traefik config to proxy to `localhost:5000`

## Troubleshooting

### Check container logs:
```bash
docker-compose logs iptv-player
docker-compose logs postgres
```

### Rebuild after code changes:
```bash
docker-compose build --no-cache iptv-player
docker-compose up -d
```

### Reset database:
```bash
docker-compose down -v
docker-compose up -d
```

### Custom port binding:
```yaml
# In docker-compose.yaml
ports:
  - "8080:5000"  # External:Internal
```

## Security Notes

- Change `SESSION_SECRET` in production
- Use strong PostgreSQL passwords  
- Consider using Docker secrets for credentials
- Enable firewall rules for port 5000
- Use HTTPS with reverse proxy in production