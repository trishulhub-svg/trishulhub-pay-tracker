# 🚀 TrishulHub Pay Tracker — Deployment Guide

This guide will walk you through deploying your app to the internet using:
- **GitHub** — to store your code
- **Turso** — for your cloud database
- **Vercel** — to host your website

You need **3 free accounts**. Total time: ~20 minutes.

---

## Step 1: Create a GitHub Account (if you don't have one)

1. Go to https://github.com/signup
2. Create your account
3. Remember your username — you'll need it below

---

## Step 2: Create a GitHub Repository

1. Go to https://github.com/new
2. Fill in:
   - **Repository name**: `trishulhub-pay-tracker`
   - **Description**: `Track salary payments from any company — Free forever`
   - **Visibility**: ✅ Private (recommended — your code has business logic)
   - ❌ Do NOT check "Add a README file"
   - ❌ Do NOT add .gitignore or license (we already have them)
3. Click **Create repository**
4. **Copy the repo URL** — it looks like: `https://github.com/YOUR-USERNAME/trishulhub-pay-tracker.git`

---

## Step 3: Push Your Code to GitHub

Open your **terminal** on your computer and run these commands one by one:

```bash
# Go to your project folder
cd /home/z/my-project

# Add your GitHub repo as the "remote" (replace YOUR-USERNAME!)
git remote add origin https://github.com/YOUR-USERNAME/trishulhub-pay-tracker.git

# Push your code to GitHub
git push -u origin main
```

**If it asks for login**, GitHub now requires a Personal Access Token instead of password:
1. Go to https://github.com/settings/tokens
2. Click **Generate new token** → **Generate new token (classic)**
3. Give it a name like "TrishulHub Deploy"
4. Check the **repo** checkbox (full control)
5. Click **Generate token**
6. **Copy the token** (you won't see it again!)
7. When terminal asks for password, paste the token

✅ **Done!** Your code is now on GitHub. Verify by going to your repo page.

---

## Step 4: Create a Turso Account & Database

Turso gives you a **free** serverless SQLite database in the cloud.

### 4a. Sign up for Turso
1. Go to https://turso.tech/sign-up
2. Sign up with your **GitHub account** (easiest) or email

### 4b. Create your database
1. Go to https://console.turso.tech
2. Click **Create Database**
3. Fill in:
   - **Name**: `trishulhub-pay-tracker`
   - **Group**: default (or create one in the closest region to you)
4. Click **Create**

### 4c. Get your database URL
1. Click on your new database
2. You'll see the **URL** — it looks like: `libsql://trishulhub-pay-tracker-YOUR-ORG.turso.so`
3. **Copy it** — you'll need it for Vercel

### 4d. Create an auth token
1. In the database page, click **Settings** → **API Tokens**
2. Click **Create new token**
3. Give it a name like "vercel-production"
4. **Copy the token** — you'll need it for Vercel

### 4e. Push your database schema to Turso

Run these commands in your terminal:

```bash
# Install Turso CLI (if not already installed)
curl -sL https://get.tur.so/install.sh | bash

# Login to Turso
turso auth login

# Set your database URL as a temp variable (replace with YOUR URL)
export TURSO_DATABASE_URL="libsql://trishulhub-pay-tracker-YOUR-ORG.turso.so"
export TURSO_AUTH_TOKEN="YOUR-TURSO-AUTH-TOKEN"

# Push your Prisma schema to Turso
cd /home/z/my-project
DATABASE_URL="$TURSO_DATABASE_URL?authToken=$TURSO_AUTH_TOKEN" npx prisma db push
```

This creates all your tables (User, Company, PaymentRecord, Shift, OtpCode) in Turso.

### 4f. Seed the admin user

Run this to create your admin account:

```bash
# Create a quick seed script
cat > /tmp/seed-turso.js << 'EOF'
const { createClient } = require('@libsql/client');
const crypto = require('crypto');

async function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const passwordHash = await hashPassword('admin123');
  const referralCode = 'TRISHUL-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  try {
    await client.execute({
      sql: `INSERT INTO User (id, email, name, password, role, referralCode, isPremium, emailVerified, termsAccepted, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: ['admin-001', 'admin@trishulhub.com', 'TrishulHub Admin', passwordHash, 'ADMIN', referralCode, 1, 1, 1],
    });
    console.log('✅ Admin user created!');
    console.log('   Email: admin@trishulhub.com');
    console.log('   Password: admin123');
    console.log('   Referral Code:', referralCode);
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      console.log('⚠️  Admin user already exists, skipping.');
    } else {
      console.error('❌ Error:', e.message);
    }
  }
}

main();
EOF

# Run the seed script
cd /home/z/my-project
node /tmp/seed-turso.js
```

✅ **Done!** Your Turso database is set up with tables and admin user.

---

## Step 5: Deploy to Vercel

### 5a. Sign up for Vercel
1. Go to https://vercel.com/signup
2. **Sign up with your GitHub account** — this is important! It lets Vercel access your code.

### 5b. Import your project
1. Go to https://vercel.com/new
2. You should see your `trishulhub-pay-tracker` repository
3. If not, click **Adjust GitHub App Permissions** → give access to the repo
4. Click **Import** on your repository

### 5c. Configure the project
On the "Configure Project" page:

1. **Project Name**: `trishulhub-pay-tracker` (or any name you like)
2. **Framework Preset**: Next.js (should auto-detect)
3. **Root Directory**: `./` (leave as default)
4. **Build Command**: leave as default (`npm run build`)
5. **Output Directory**: leave as default

### 5d. Add Environment Variables ⚠️ CRITICAL STEP!

Click **Environment Variables** and add ALL of these one by one:

| Key | Value | Where to get it |
|-----|-------|----------------|
| `DATABASE_URL` | `file:./db/custom.db` | Just copy this exactly (placeholder) |
| `TURSO_DATABASE_URL` | `libsql://trishulhub-pay-tracker-YOUR-ORG.turso.so` | From Step 4c |
| `TURSO_AUTH_TOKEN` | `your-turso-auth-token` | From Step 4d |
| `SESSION_SECRET` | `a-random-long-string-here` | Generate with: `openssl rand -hex 32` |
| `BREVO_API_KEY` | `xsmtpsib-8597be31d74b9486a2aa26aa495da74f9eaef33f654739b89f17a213628fdf10-19u2Nq6FEvBESnfe` | Your Brevo SMTP password |
| `BREVO_FROM_EMAIL` | `a9f138001@smtp-brevo.com` | Your Brevo sender email |
| `BREVO_FROM_NAME` | `TrishulHub Pay Tracker` | Your app name |
| `BREVO_SMTP_LOGIN` | `a9f138001@smtp-brevo.com` | Your Brevo SMTP login |
| `BREVO_SMTP_SERVER` | `smtp-relay.brevo.com` | Brevo SMTP server |
| `BREVO_SMTP_PORT` | `587` | Brevo SMTP port |

**Important**: For `SESSION_SECRET`, generate a proper random string. Run this in terminal:
```bash
openssl rand -hex 32
```
Paste the output as the value. This secures your user sessions!

### 5e. Deploy!
1. Click **Deploy**
2. Wait 2-3 minutes for the build to complete
3. 🎉 You'll get your live URL: `https://trishulhub-pay-tracker.vercel.app`

✅ **Done!** Your app is live on the internet!

---

## Step 6: Verify Everything Works

1. **Open your Vercel URL** in a browser
2. **Try logging in** with admin credentials:
   - Email: `admin@trishulhub.com`
   - Password: `admin123`
3. **Try the signup flow** — create a test account, verify OTP
4. **Check the database** — go to Turso console, your data should be there

---

## 🔄 Future Updates (How to redeploy)

Whenever you make changes to your code:

```bash
cd /home/z/my-project

# Stage your changes
git add .

# Commit with a message
git commit -m "describe your changes here"

# Push to GitHub
git push
```

**Vercel automatically redeploys** every time you push to GitHub! No manual steps needed.

---

## 🆘 Common Issues & Fixes

### "Build Error: Prisma Client could not be generated"
- Make sure `postinstall` script in package.json says `prisma generate`
- Check that `prisma/schema.prisma` is committed to GitHub

### "Database connection error"
- Check that `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set in Vercel
- Make sure you ran `prisma db push` against your Turso database

### "Email not sending (OTP not received)"
- Check `BREVO_SMTP_LOGIN` and `BREVO_API_KEY` in Vercel env vars
- Verify your Brevo account is active at https://app.brevo.com

### "Session not working (keeps logging out)"
- Make sure `SESSION_SECRET` is set to a random string (not the default)
- Redeploy after changing env vars: Vercel Dashboard → your project → Deployments → Redeploy

---

## 📋 Quick Reference — All URLs

| Service | URL | Purpose |
|---------|-----|---------|
| GitHub | https://github.com/YOUR-USERNAME/trishulhub-pay-tracker | Code repository |
| Turso | https://console.turso.tech | Database management |
| Vercel | https://vercel.com/dashboard | App hosting & deployment |
| Brevo | https://app.brevo.com | Email service |
| Your App | https://trishulhub-pay-tracker.vercel.app | Live website |
