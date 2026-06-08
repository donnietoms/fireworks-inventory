# 🚀 Deploy Fireworks Inventory to Render.com

## Step-by-Step Deployment Guide

### Step 1: Prepare Code (DONE ✅)

All necessary files have been created:
- ✅ `Dockerfile` - Optimized for Render
- ✅ `render.yaml` - Render configuration
- ✅ Server updated for production CORS
- ✅ Package.json updated

### Step 2: Create GitHub Repository (5 minutes)

**Option A: Use GitHub Desktop (Easiest)**

1. Download GitHub Desktop: https://desktop.github.com
2. Open GitHub Desktop
3. Click: File → Add Local Repository
4. Select: `/Users/donnie_toms/fireworks-inventory`
5. Click: "Create a repository" 
6. Name: `fireworks-inventory`
7. Click: "Publish repository"
8. Uncheck "Keep this code private" (or keep private, both work)
9. Click: "Publish Repository"

**Option B: Use Command Line**

```bash
cd ~/fireworks-inventory

# Initialize git if not already
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Fireworks Inventory"

# Create repo on GitHub (you'll need to login)
gh repo create fireworks-inventory --public --source=. --push
```

**Option C: Manual Upload**

We'll upload directly to Render (skip GitHub for now).

---

### Step 3: Deploy to Render.com (10 minutes)

#### 3.1 Create Render Account

1. Go to: https://render.com
2. Click: "Get Started"
3. Sign up with GitHub (easiest) or email

#### 3.2 Create New Web Service

1. Click: **"New +"** (top right)
2. Select: **"Web Service"**

#### 3.3 Connect Your Code

**If you created GitHub repo (Option A or B above):**
- Click: "Connect GitHub"
- Select: `fireworks-inventory` repository
- Click: "Connect"

**If skipping GitHub (Option C):**
- We'll use Docker Hub instead (see Step 4 below)

#### 3.4 Configure Service

Fill in these settings:

- **Name:** `fireworks-inventory`
- **Region:** `Oregon (US West)` (closest to you)
- **Branch:** `main` (or `master`)
- **Root Directory:** (leave blank)
- **Environment:** `Docker`
- **Instance Type:** `Free`

#### 3.5 Environment Variables (Optional)

Add these if you want:
- `NODE_ENV` = `production`

#### 3.6 Deploy!

1. Click: **"Create Web Service"**
2. Watch the build logs (takes 3-5 minutes)
3. Wait for: "✅ Live" status

**You'll get a URL like:**
`https://fireworks-inventory-xxxxx.onrender.com`

---

### Step 4: Add Custom Domain (5 minutes)

#### 4.1 In Render.com

1. Go to your service
2. Click: **"Settings"** (left sidebar)
3. Scroll to: **"Custom Domain"**
4. Click: **"Add Custom Domain"**
5. Enter: `inventory-manager.kcap.club`
6. Click: **"Save"**

**Render will show you:**
```
Add this CNAME record to your DNS:
inventory-manager → xxxxx.onrender.com
```

#### 4.2 In Dreamhost Panel

1. Go to: https://panel.dreamhost.com
2. Navigate to: **Domains → Manage Domains**
3. Find: `inventory-manager.kcap.club`
4. Click: **"DNS"** (or edit)
5. Change/Add CNAME:
   - **Type:** CNAME
   - **Name:** inventory-manager
   - **Value:** `xxxxx.onrender.com` (from Render)
6. **Save**

#### 4.3 Wait for DNS (5-15 minutes)

- DNS propagation takes time
- Check status in Render dashboard
- Once verified, Render auto-enables HTTPS!

---

### Step 5: Test Your Deployment

1. Visit: `https://inventory-manager.kcap.club`
2. Upload test invoice: `~/Downloads/Sale 101628.pdf`
3. Verify:
   - ✅ Vendor detection works
   - ✅ 43 items parsed
   - ✅ Order created
   - ✅ Inventory updated

---

## Alternative: Direct Docker Deployment (No GitHub)

If you don't want to use GitHub:

### 1. Build and Push to Docker Hub

```bash
cd ~/fireworks-inventory

# Build image
docker build -t YOUR_DOCKERHUB_USERNAME/fireworks-inventory .

# Login to Docker Hub
docker login

# Push
docker push YOUR_DOCKERHUB_USERNAME/fireworks-inventory
```

### 2. Deploy to Render from Docker Hub

1. In Render: New Web Service
2. Select: "Deploy an existing image from a registry"
3. Image URL: `YOUR_DOCKERHUB_USERNAME/fireworks-inventory`
4. Continue with steps above

---

## Troubleshooting

### Build fails?
Check build logs in Render dashboard. Common issues:
- Missing dependencies (check package.json)
- Build timeout (upgrade to paid tier for more time)

### App shows 404?
- Check if build completed successfully
- Verify Dockerfile CMD is correct
- Check logs: "Logs" tab in Render

### Custom domain not working?
- DNS can take 24-48 hours (usually 5-15 min)
- Verify CNAME in Dreamhost DNS
- Check Render dashboard for SSL status

### API calls failing?
- Check CORS settings in server/index.js
- Verify environment variables in Render

---

## Next Steps

Once deployed, you can:

1. **Enable Auto-Deploy:** 
   - Every git push → automatic deployment

2. **Add Team Members:**
   - Share access in Render dashboard

3. **Monitor Usage:**
   - Free tier: 750 hours/month
   - More than enough for this app

4. **Upgrade if needed:**
   - $7/month for better performance
   - Custom domains included

---

## Need Help?

I'm here! Let me know which step you're on and if you run into any issues.

**Ready to start?** 
1. Do you want to use GitHub (recommended) or skip it?
2. I can guide you through each step!
