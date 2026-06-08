# Fireworks Inventory - Docker Deployment Guide

## 🐳 Docker Deployment (Easiest Method)

### Prerequisites
- Docker installed on your machine
- Docker Hub account (free) OR
- Access to a server with Docker

---

## Local Testing (Your Mac)

### 1. Build and Run with Docker Compose
```bash
cd ~/fireworks-inventory

# Build and start
docker-compose up --build

# Or run in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**Access:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

---

## Deployment Options

### Option A: Deploy to Render.com (FREE, Easiest)

**Render.com** offers free Docker deployments with custom domains!

1. **Create account:** https://render.com
2. **New Web Service** → Connect GitHub/upload code
3. **Select:** Docker
4. **Configure:**
   - Name: `fireworks-inventory`
   - Environment: Docker
   - Region: Oregon (US West)
   - Instance Type: Free
5. **Deploy!**

**Result:** 
- URL: `https://fireworks-inventory.onrender.com`
- Custom domain: `inventory.kcap.club` (add in settings)
- Auto-deploy on git push
- **$0/month**

### Option B: DigitalOcean App Platform ($5/month)

1. **Create account:** https://digitalocean.com
2. **Create App** → Upload source
3. **Detect Dockerfile** automatically
4. **Deploy**

**Result:**
- URL: `https://fireworks-inventory-xxxxx.ondigitalocean.app`
- Custom domain supported
- **$5/month**

### Option C: Deploy to Your Dreamhost Server

**Check if Dreamhost supports Docker:**

```bash
ssh wp_rgntit@kcap.club
docker --version
```

**If Docker is available:**
```bash
# 1. Build image locally
cd ~/fireworks-inventory
docker build -t fireworks-inventory .

# 2. Save image
docker save fireworks-inventory > fireworks-inventory.tar

# 3. Upload to Dreamhost
scp fireworks-inventory.tar wp_rgntit@kcap.club:~/

# 4. SSH into Dreamhost
ssh wp_rgntit@kcap.club

# 5. Load and run
docker load < fireworks-inventory.tar
docker run -d -p 5173:5173 -p 3001:3001 --name fireworks fireworks-inventory
```

**If Docker is NOT available:**
→ Use Render.com (Option A) instead

### Option D: Docker Hub + Any Server

1. **Create Docker Hub account:** https://hub.docker.com

2. **Build and push:**
```bash
cd ~/fireworks-inventory

# Build image
docker build -t yourusername/fireworks-inventory:latest .

# Login to Docker Hub
docker login

# Push
docker push yourusername/fireworks-inventory:latest
```

3. **On any server with Docker:**
```bash
# Pull and run
docker pull yourusername/fireworks-inventory:latest
docker run -d -p 5173:5173 -p 3001:3001 \
  --name fireworks \
  --restart unless-stopped \
  yourusername/fireworks-inventory:latest
```

---

## Production Configuration

### Environment Variables

Create `.env.production`:
```
NODE_ENV=production
VITE_API_URL=https://inventory.kcap.club/api
ALLOWED_ORIGINS=https://inventory.kcap.club
```

### Custom Domain Setup

**For Render.com:**
1. Go to Settings → Custom Domain
2. Add: `inventory.kcap.club`
3. Update DNS at Dreamhost:
   - Type: CNAME
   - Name: inventory
   - Value: (Render provides this)

**For DigitalOcean:**
1. Add domain in Networking
2. Update DNS records

---

## Management Commands

```bash
# View running containers
docker ps

# View logs
docker logs -f fireworks

# Restart
docker restart fireworks

# Stop
docker stop fireworks

# Remove
docker rm fireworks

# Update (rebuild and restart)
docker-compose up -d --build

# Clean up old images
docker system prune -a
```

---

## My Recommendation: Use Render.com

**Why Render.com?**
- ✅ Free tier (enough for this app)
- ✅ Automatic HTTPS
- ✅ Custom domains
- ✅ Auto-deploy from Git
- ✅ Docker support
- ✅ Built-in monitoring
- ✅ Zero configuration

**Setup time: 10 minutes**

---

## Next Steps

**Would you like me to:**
1. Create a Render.com deployment (recommended)?
2. Push to Docker Hub for you?
3. Test locally first?

Let me know!
