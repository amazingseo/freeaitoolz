# 🚀 FreeAIToolz - Complete Deployment Guide
## (For Absolute Beginners - Follow Every Step)

---

## ⏱️ Total Time: ~15 minutes

You need:
- ✅ GitHub account (you have this)
- ✅ Vercel account (you have this)
- ✅ Anthropic API key (get free at console.anthropic.com)

---

## PART 1: Get Your Anthropic API Key (2 minutes)

1. Go to **https://console.anthropic.com/**
2. Sign in (or create free account)
3. Click **"API Keys"** in the left sidebar
4. Click **"Create Key"**
5. Give it a name: `freeaitoolz`
6. **COPY the key** and save it somewhere safe (starts with `sk-ant-...`)
7. You get $5 free credit — enough for thousands of tool uses

---

## PART 2: Upload Project to GitHub (5 minutes)

### Option A: Using GitHub Website (Easiest - No Terminal Needed)

1. Go to **https://github.com/new**
2. Set these:
   - Repository name: `freeaitoolz`
   - Description: `Free AI Tools Website`
   - Keep it **Public**
   - Do NOT check "Add README" (we already have one)
3. Click **"Create repository"**
4. You'll see a page with setup instructions — **keep this page open**

### Now Upload the Files:

5. **Extract** the `freeaitoolz-project.tar.gz` file you downloaded from Claude
   - On Windows: Use **7-Zip** (free download from 7-zip.org) → Right-click → Extract Here
   - On Mac: Just double-click the file
   
6. You should now have a folder called `freeaitoolz` with these files:
   ```
   freeaitoolz/
   ├── src/
   ├── public/
   ├── package.json
   ├── astro.config.mjs
   ├── tailwind.config.mjs
   ├── tsconfig.json
   ├── README.md
   └── .gitignore
   ```

7. **Go back to your GitHub repo page**
8. Click **"uploading an existing file"** link
9. **Drag and drop ALL files and folders** from inside the `freeaitoolz` folder
   
   ⚠️ IMPORTANT: Drag the CONTENTS (src, public, package.json etc.), 
   NOT the freeaitoolz folder itself!
   
   ⚠️ DO NOT upload the `node_modules` folder or `dist` folder (they should not be in the download)

10. Scroll down, click **"Commit changes"**

### Option B: Using Terminal (Faster if you know Git)

```bash
# Navigate to the extracted project folder
cd freeaitoolz

# Initialize git
git init
git add .
git commit -m "Initial launch - FreeAIToolz"

# Connect to your GitHub repo (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/freeaitoolz.git
git branch -M main
git push -u origin main
```

---

## PART 3: Deploy on Vercel (5 minutes)

1. Go to **https://vercel.com/dashboard**

2. Click **"Add New..."** → **"Project"**

3. You'll see a list of your GitHub repos. Find **"freeaitoolz"** and click **"Import"**

4. On the **Configure Project** page, set these:

   | Setting | Value |
   |---------|-------|
   | Framework Preset | **Astro** (should auto-detect) |
   | Root Directory | **./** (leave default) |
   | Build Command | **`npm run build`** (leave default) |
   | Output Directory | **leave default** |

5. **IMPORTANT — Add Environment Variable:**
   - Click **"Environment Variables"** section (expand it)
   - Add this variable:
   
   | Key | Value |
   |-----|-------|
   | `ANTHROPIC_API_KEY` | `sk-ant-xxxxxxx` (paste YOUR actual key) |
   
   - Click **"Add"**

6. Click **"Deploy"** 🎉

7. **Wait 1-2 minutes** — Vercel will:
   - Install dependencies
   - Build the site
   - Deploy it globally

8. When done, you'll see **"Congratulations!"** with a URL like:
   `https://freeaitoolz-xxxxx.vercel.app`

9. **Click the URL** — your site is LIVE! 🎉

---

## PART 4: Connect Your Custom Domain (3 minutes)

Once you buy `freeaitoolz.com`:

1. In your Vercel project, click **"Settings"** → **"Domains"**

2. Type `freeaitoolz.com` and click **"Add"**

3. Vercel will show you DNS records to add. Go to your domain registrar (Namecheap, GoDaddy, etc.) and:

   **Option A: Use Vercel Nameservers (Recommended)**
   - Change your domain's nameservers to:
     - `ns1.vercel-dns.com`
     - `ns2.vercel-dns.com`
   
   **Option B: Add DNS Records**
   - Add an **A record**: `@` → `76.76.21.21`
   - Add a **CNAME record**: `www` → `cname.vercel-dns.com`

4. Wait 5-30 minutes for DNS to propagate

5. Vercel automatically adds **free SSL certificate** (https://)

---

## PART 5: Verify Everything Works ✅

After deployment, check these:

- [ ] Homepage loads at your URL
- [ ] Click "AI Humanizer" tool
- [ ] Paste some ChatGPT text and click "Humanize Text"
- [ ] Results appear (means API key is working)
- [ ] Check mobile responsiveness (resize browser)
- [ ] Visit `/sitemap-index.xml` (should show sitemap)
- [ ] Visit `/robots.txt` (should show robots file)

---

## 🔧 Troubleshooting

### "Build Failed" on Vercel
- Check the build logs (Vercel shows them)
- Most common issue: missing files. Make sure all files were uploaded to GitHub

### "API not configured" error when using tools
- Go to Vercel → Settings → Environment Variables
- Make sure `ANTHROPIC_API_KEY` is added correctly
- After adding/changing env variables, you need to **redeploy**:
  - Go to Deployments tab → click "..." on latest → "Redeploy"

### Tools are slow
- First request is always slower (cold start)
- Subsequent requests will be faster

### Custom domain not working
- DNS changes take up to 48 hours (usually 5-30 min)
- Make sure you added the correct records
- In Vercel, check if domain shows "Valid Configuration"

---

## 📊 After Deployment: Set Up Analytics & AdSense

### Google Search Console (Do this immediately!)
1. Go to https://search.google.com/search-console
2. Add your domain
3. Verify using DNS (add TXT record from Google)
4. Submit your sitemap: `https://freeaitoolz.com/sitemap-index.xml`

### Google Analytics 4
1. Go to https://analytics.google.com
2. Create new property for freeaitoolz.com
3. Get your G-XXXXXX tracking ID
4. Add the tracking script to `src/layouts/BaseLayout.astro` in the `<head>` section

### Google AdSense
1. You already have AdSense approved
2. Get your AdSense code from https://adsense.google.com
3. Add it to `src/layouts/BaseLayout.astro` (replace the placeholder comment)
4. Push changes to GitHub → Vercel auto-deploys

---

## 🔄 How to Update Your Site

Whenever you want to add new tools or make changes:

1. Edit files on GitHub (click any file → pencil icon → edit → commit)
2. OR push changes via terminal: `git push`
3. Vercel **automatically redeploys** within 30 seconds!

---

## 💡 Quick Cost Summary

| Item | Cost |
|------|------|
| Vercel hosting | **FREE** (100GB bandwidth/month) |
| GitHub | **FREE** |
| Anthropic API | **$5 free credit**, then ~$3/1000 tool uses |
| Domain (annual) | **~$10/year** |
| SSL Certificate | **FREE** (auto by Vercel) |
| **TOTAL** | **~$10/year + API usage** |

---

That's it! Your site is live! 🎉
