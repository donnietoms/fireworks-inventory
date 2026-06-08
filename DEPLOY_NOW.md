# 🚀 Deploy to Render.com - Quick Start Guide

## ✅ Files Ready!
Your code is committed and ready to deploy.

---

## Option 1: Deploy via GitHub (Recommended - Easiest)

### Step 1: Create GitHub Account (if you don't have one)
1. Go to: https://github.com
2. Click "Sign Up"
3. Follow the prompts

### Step 2: Create New Repository on GitHub

1. Go to: https://github.com/new
2. **Repository name:** `fireworks-inventory`
3. **Description:** "Fireworks Inventory Management System"
4. **Public** (so Render can access it for free)
5. **DO NOT** check "Initialize with README" (we already have code)
6. Click: **"Create repository"**

### Step 3: Push Your Code to GitHub

Copy the commands GitHub shows you, OR run these:

```bash
cd ~/fireworks-inventory

# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/fireworks-inventory.git

# Push code
git branch -M main
git push -u origin main
```

**You'll be prompted for:**
- Username: (your GitHub username)
- Password: (use a Personal Access Token, not your password)
  - Get token at: https://github.com/settings/tokens
  - Click "Generate new token (classic)"
  - Check "repo" scope
  - Copy the token and use it as password

### Step 4: Deploy to Render

1. Go to: https://render.com
2. Click **"Get Started"** or **"Sign Up"**
3. Choose **"Sign up with GitHub"** (easiest)
4. Authorize Render to access GitHub

### Step 5: Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Click **"Connect GitHub"**
3. Find and select: **`fireworks-inventory`**
4. Click **"Connect"**

### Step 6: Configure Service

Fill in these settings:

**Basic Settings:**
- **Name:** `fireworks-inventory`
- **Region:** `Oregon (US West)`
- **Branch:** `main`
- **Root Directory:** (leave blank)

**Build Settings:**
- **Environment:** `Docker`
- **Dockerfile Path:** `./Dockerfile` (auto-detected)

**Instance Type:**
- Select: **`Free`**

**Advanced (Optional):**
- **Auto-Deploy:** `Yes` (enabled by default)

### Step 7: Deploy!

1. Click **"Create Web Service"** at the bottom
2. **Watch the build logs** (takes 3-5 minutes)
   - Installing dependencies...
   - Building frontend...
   - Creating Docker image...
   - Deploying...
3. Wait for **"✅ Your service is live"**

**Your URL will be:**
`https://fireworks-inventory-XXXXX.onrender.com`

### Step 8: Test Your App

1. Click the URL in Render dashboard
2. You should see the Fireworks Inventory app!
3. Test uploading: `~/Downloads/Sale 101628.pdf`

---

## Option 2: Deploy Without GitHub (Upload Directly)

If you don't want to use GitHub:

### Step 1: Create Account
1. Go to: https://render.com
2. Sign up with email

### Step 2: Use Blueprint (render.yaml)
1. Click **"New +"** → **"Blueprint"**
2. Select **"Connect to Git"**
3. Choose: **"I'll upload my code"**
4. Upload the `fireworks-inventory` folder

**OR use Docker Hub:**
1. Install Docker Desktop first
2. Build and push image (I can help with this)
3. Deploy from Docker registry

---

## Step 9: Add Custom Domain

### In Render.com:

1. Go to your service
2. Click **"Settings"** (left sidebar)
3. Scroll down to **"Custom Domain"**
4. Click **"Add Custom Domain"**
5. Enter: `inventory-manager.kcap.club`
6. Click **"Save"**

**Render will show:**
```
Add CNAME record:
Name: inventory-manager
Value: fireworks-inventory-XXXXX.onrender.com
```

### In Dreamhost Panel:

1. Go to: https://panel.dreamhost.com
2. **Domains** → **Manage Domains**
3. Find `inventory-manager.kcap.club`
4. Click **"DNS"** 
5. Add/Edit CNAME record:
   - **Type:** CNAME
   - **Name:** inventory-manager
   - **Points to:** `fireworks-inventory-XXXXX.onrender.com`
6. **Save**
7. **Delete** the old A record if it exists

### Wait for SSL

- DNS: 5-30 minutes
- SSL: Automatic once DNS propagates
- Check in Render: Settings → Custom Domain → Status

---

## What Happens Next?

✅ **Auto-deploy:** Every time you push to GitHub, Render automatically rebuilds and deploys

✅ **Free HTTPS:** Automatic SSL certificate

✅ **Monitoring:** Check logs and metrics in Render dashboard

✅ **Spin-down:** Free tier sleeps after 15 min inactivity (wakes up in ~30 seconds when accessed)

---

## Troubleshooting

### Build fails?
- Check logs in Render dashboard
- Common: Missing dependencies
- Solution: Verify `package.json` and `Dockerfile`

### Can't connect GitHub?
- Make sure repo is public
- Or grant Render access to private repos

### Custom domain not working?
- Check DNS propagation: https://www.whatsmydns.net
- Verify CNAME in Dreamhost
- Wait up to 24-48 hours (usually much faster)

---

## Need Help?

I'm here! Tell me:
1. Which option you're choosing (GitHub or direct)
2. Where you get stuck

Let's do this! 🚀
