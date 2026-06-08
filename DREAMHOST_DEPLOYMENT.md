# Dreamhost Deployment - Step by Step Guide for kcap.club

## Prerequisites
- Dreamhost account with shell access (you have this ✓)
- Username: wp_rgntit
- Domain: kcap.club

## Step 1: Upload Files to Dreamhost

### Option A: Using SCP (Recommended)
```bash
# From your Mac, in the fireworks-inventory directory:
cd ~/fireworks-inventory

# Create deployment package
npm run build

# Upload to Dreamhost (you'll be prompted for password)
scp -r ./* wp_rgntit@kcap.club:~/fireworks-inventory/
```

### Option B: Using SFTP (FileZilla, Cyberduck)
1. Connect to kcap.club with SFTP
2. Username: wp_rgntit
3. Upload entire `fireworks-inventory` folder to `/home/wp_rgntit/`

### Option C: Using Git (Cleanest)
```bash
# On Dreamhost server (after SSH login):
cd ~
git clone <your-git-repo-url> fireworks-inventory
# OR manually create the folder and upload
```

---

## Step 2: SSH into Dreamhost

```bash
# From your Mac:
ssh wp_rgntit@kcap.club

# Enter your password when prompted
```

---

## Step 3: Check Node.js Installation

```bash
# Check if Node.js is installed
node --version

# If not installed, install NVM first:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

---

## Step 4: Install Dependencies and Build

```bash
cd ~/fireworks-inventory

# Install dependencies
npm install
cd server
npm install  
cd ..

# Build frontend for production
npm run build

# Install PM2 globally
npm install -g pm2

# Install serve for static file serving
npm install -g serve
```

---

## Step 5: Start the Application

```bash
# Make sure you're in the fireworks-inventory directory
cd ~/fireworks-inventory

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Set PM2 to start on server reboot
pm2 startup

# View status
pm2 list
pm2 logs
```

---

## Step 6: Set Up Subdomain in Dreamhost Panel

1. **Log into Dreamhost Panel** (panel.dreamhost.com)

2. **Go to: Domains → Manage Domains**

3. **Add Subdomain:**
   - Subdomain: `inventory`
   - Domain: `kcap.club`
   - Full subdomain: `inventory.kcap.club`
   - Web directory: `/home/wp_rgntit/fireworks-inventory/dist`
   - Enable HTTPS: ✓ Yes

4. **Wait 5-10 minutes** for DNS propagation

---

## Step 7: Configure Apache Reverse Proxy

Create `.htaccess` file in the subdomain directory:

```bash
# SSH into server
ssh wp_rgntit@kcap.club

# Create .htaccess
nano /home/wp_rgntit/fireworks-inventory/dist/.htaccess
```

Add this content:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # API Proxy - Forward API requests to backend
  RewriteCond %{REQUEST_URI} ^/api
  RewriteRule ^api/(.*)$ http://localhost:3001/api/$1 [P,L]
  
  # Frontend - SPA routing
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# CORS Headers
<IfModule mod_headers.c>
  Header set Access-Control-Allow-Origin "*"
  Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
  Header set Access-Control-Allow-Headers "Content-Type"
</IfModule>
```

Save: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 8: Update Frontend API URLs

Since we're using a subdomain, update the API endpoints:

```bash
# Edit the vendor hook
nano /home/wp_rgntit/fireworks-inventory/dist/assets/index-*.js

# Find and replace:
# http://localhost:3001 → https://inventory.kcap.club
```

**OR** rebuild with production API URL set:

```bash
# On your Mac, edit src/hooks/useVendors.js and src/components/FileUpload.jsx
# Change: http://localhost:3001 → https://inventory.kcap.club

# Then rebuild and re-upload
npm run build
scp -r dist/* wp_rgntit@kcap.club:~/fireworks-inventory/dist/
```

---

## Step 9: Test the Deployment

1. **Visit:** https://inventory.kcap.club
2. **Check backend:** https://inventory.kcap.club/api/vendors
3. **Upload test invoice** to verify PDF parsing works

---

## Troubleshooting

### If mod_proxy is not enabled:
Contact Dreamhost support and ask them to enable `mod_proxy` for your account.

### If ports are blocked:
Some shared hosting blocks custom ports. Alternative: Use passenger or run everything through Apache.

### Check PM2 logs:
```bash
pm2 logs fireworks-api
pm2 logs fireworks-frontend
```

### Restart services:
```bash
pm2 restart all
```

---

## Alternative: Using Passenger (Dreamhost Native)

If PM2 doesn't work, Dreamhost supports Passenger for Node.js:

1. Create `passenger_wsgi.py` in web root
2. Point it to your Node.js app
3. Dreamhost will auto-manage the process

Let me know if you need the Passenger configuration instead!

---

## Useful Commands

```bash
# SSH into server
ssh wp_rgntit@kcap.club

# Check running processes
pm2 list

# View logs
pm2 logs

# Restart all
pm2 restart all

# Stop all
pm2 stop all

# Monitor resources
pm2 monit
```

---

**Need help with any step?** Let me know where you get stuck!
