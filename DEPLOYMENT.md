# Fireworks Inventory - Deployment Guide

## Option 1: Local Auto-Start with PM2

PM2 is a process manager that keeps your app running and restarts it automatically.

### Install PM2
```bash
npm install -g pm2
```

### Create PM2 Ecosystem File
We'll create a configuration file that manages both servers:

```bash
cd ~/fireworks-inventory
```

Then create `ecosystem.config.js` (already created for you).

### Start the Application
```bash
# Start both servers
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs

# Stop all
pm2 stop all

# Restart all
pm2 restart all
```

### Auto-start on Mac Boot
```bash
# Save current PM2 processes
pm2 save

# Generate startup script
pm2 startup

# Follow the command it outputs (will ask for sudo password)
```

### Useful PM2 Commands
```bash
pm2 list                 # List all processes
pm2 logs fireworks-app   # View frontend logs
pm2 logs fireworks-api   # View backend logs
pm2 monit                # Monitor CPU/Memory
pm2 restart all          # Restart both servers
pm2 stop all             # Stop all servers
pm2 delete all           # Remove all processes
```

---

## Option 2: Make Accessible Outside Your Network

You have several options depending on your needs:

### A. Using ngrok (Easiest - For Testing/Demo)

**Pros:** Quick setup, HTTPS included, no router config
**Cons:** Free tier has random URLs, session-based

```bash
# Install ngrok
brew install ngrok

# Start your servers first
cd ~/fireworks-inventory
npm run dev:all

# In another terminal, expose frontend
ngrok http 5173

# You'll get a URL like: https://abc123.ngrok.io
# Share this URL with others
```

**For both frontend AND backend:**
```bash
# Terminal 1: Start servers
npm run dev:all

# Terminal 2: Expose frontend
ngrok http 5173 --scheme=https

# Terminal 3: Expose backend
ngrok http 3001 --scheme=https

# Update frontend to use ngrok backend URL
# Edit src/hooks/useVendors.js and src/components/FileUpload.jsx
# Change http://localhost:3001 to your ngrok backend URL
```

### B. Using Tailscale (Best for Private Access)

**Pros:** Secure, works anywhere, free for personal use
**Cons:** Users need Tailscale installed

```bash
# Install Tailscale
brew install tailscale

# Start Tailscale
sudo tailscale up

# Your Mac gets a permanent IP like: 100.x.x.x
# Access from any device on your Tailscale network:
# http://100.x.x.x:5173
```

### C. Port Forwarding (For Permanent Public Access)

**Pros:** No third-party service, permanent
**Cons:** Requires router access, security considerations

1. **Get your Mac's local IP:**
   ```bash
   ipconfig getifaddr en0  # WiFi
   # or
   ipconfig getifaddr en1  # Ethernet
   ```

2. **Configure Router:**
   - Log into your router (usually 192.168.1.1 or 192.168.0.1)
   - Find "Port Forwarding" or "NAT"
   - Forward external port 80 → internal IP:5173
   - Forward external port 3001 → internal IP:3001

3. **Get your public IP:**
   ```bash
   curl ifconfig.me
   ```

4. **Access from outside:**
   - http://YOUR_PUBLIC_IP:5173
   - **Important:** Update CORS in server/index.js

5. **Optional: Get a domain name:**
   - Use DuckDNS (free dynamic DNS)
   - Point domain to your public IP
   - Access via http://yourname.duckdns.org:5173

### D. Deploy to a VPS (Most Professional)

**Pros:** Always online, professional, secure
**Cons:** Monthly cost (~$5-20/month)

Popular options:
- **DigitalOcean** ($6/month droplet)
- **Linode** ($5/month)
- **AWS Lightsail** ($3.50/month)
- **Render.com** (Free tier available!)

---

## Option 3: Production Build (Recommended for External Access)

Instead of running `npm run dev`, build for production:

### Create Production Build Script

Add to `package.json`:
```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview",
    "start:prod": "node server/index.js"
  }
}
```

### Build and Serve
```bash
# Build frontend
npm run build

# Serve both (uses ecosystem.config.js)
pm2 start ecosystem.config.js --env production
```

---

## Security Considerations for External Access

If exposing to the internet, add these protections:

### 1. Add Basic Authentication
```bash
npm install express-basic-auth
```

### 2. Use HTTPS (with Caddy - easiest)
```bash
brew install caddy

# Create Caddyfile
echo "yourdomain.com {
  reverse_proxy localhost:5173
}

api.yourdomain.com {
  reverse_proxy localhost:3001
}" > Caddyfile

# Start Caddy (auto-handles HTTPS)
caddy run
```

### 3. Environment Variables
Create `.env` file:
```
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=https://yourdomain.com
```

---

## Recommendation Based on Use Case

**For you only (home/office):**
→ Use **PM2** for auto-start + **Tailscale** for remote access

**For demos/testing:**
→ Use **ngrok** (5 minutes setup)

**For small team (5-10 people):**
→ Use **Tailscale** (secure, easy)

**For public/customers:**
→ Deploy to **Render.com** (free) or **DigitalOcean** ($6/month)

**For production business:**
→ VPS with HTTPS, authentication, backups

---

Need help with any specific option? Let me know!
