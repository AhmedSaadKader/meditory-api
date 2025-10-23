# Railway Email Setup Guide

## Problem

Railway's network blocks outbound SMTP connections to Gmail (ports 587/465), causing `ETIMEDOUT` errors:

```
Error: Connection timeout
code: 'ETIMEDOUT',
command: 'CONN'
```

## Solution

The EmailService now supports **two providers**:

### Option 1: Resend (Recommended for Railway)

Resend is a transactional email API that works perfectly with Railway.

**Steps:**

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Add to Railway environment variables:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
SMTP_FROM=onboarding@resend.dev  # Or your verified domain
APP_URL=https://your-actual-railway-app.up.railway.app
```

**Free tier:** 3,000 emails/month, 100 emails/day

### Option 2: SMTP (Works on localhost)

Keep for local development:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=asa.next@gmail.com
SMTP_PASS=cvef qayu losj baau
SMTP_FROM=asa.next@gmail.com
APP_URL=http://localhost:3000
```

## How It Works

The EmailService automatically detects which provider to use:

1. **Checks for `RESEND_API_KEY` first** (preferred for production)
2. **Falls back to SMTP** if Resend not configured
3. **Logs which provider is active**:
   - `Email service initialized with Resend from noreply@meditory.com` ✓
   - `Email service initialized with SMTP: smtp.gmail.com:587` ✓
   - Or warnings if neither is configured

## Railway Environment Variables

Set these **individually** in Railway's Variables tab (not as one text block):

### For Resend:
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
SMTP_FROM=onboarding@resend.dev
APP_URL=https://meditory-api-production.up.railway.app
DB_TYPE=postgres
DB_HOST=postgres.railway.internal
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=aCBVJpNTEhuwbRvuRbrQFCdZhAEFvNDu
DB_DATABASE=railway
DB_SSL=false
DB_SYNCHRONIZE=false
DATABASE_URL=postgresql://postgres:aCBVJpNTEhuwbRvuRbrQFCdZhAEFvNDu@postgres.railway.internal:5432/railway
NODE_ENV=production
SESSION_SECRET=change-this-to-a-strong-random-secret-at-least-32-characters-long
BCRYPT_SALT_ROUNDS=12
REQUIRE_EMAIL_VERIFICATION=false
FRONTEND_URL=https://your-frontend-url.com
```

## Testing

After deploying, check Railway logs:

```bash
[Nest] LOG Email service initialized with Resend from onboarding@resend.dev
[Nest] LOG Verification email sent successfully to user@example.com via resend
```

## Resend Setup Notes

1. **Default "From" address:** `onboarding@resend.dev` (works immediately)
2. **Custom domain:** Verify your domain in Resend dashboard to use your own email
3. **No connection timeout:** API-based, no SMTP port blocking issues

## Alternative Providers

If you prefer other services:

- **SendGrid**: 100 emails/day free
- **Mailgun**: 5,000 emails/month free
- **AWS SES**: Very cheap, requires AWS account

Just update the EmailService to use their SDK instead of SMTP.
