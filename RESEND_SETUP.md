# Resend Email Setup for MediGo Backend

This document explains how to set up Resend for sending transactional emails in MediGo.

## Prerequisites

1. A Resend account (free tier: 3,000 emails/month)
2. Domain verification for `medigo.tech`

## Setup Instructions

### 1. Create Resend Account

1. **Sign up at [resend.com](https://resend.com)**
2. **Verify your email address**
3. **Complete account setup**

### 2. Get API Key

1. **Go to Resend Dashboard**
2. **Navigate to API Keys section**
3. **Click "Create API Key"**
4. **Name it "MediGo Backend"**
5. **Copy the API key** (starts with `re_`)

### 3. Verify Your Domain

1. **Go to Domains section in Resend**
2. **Click "Add Domain"**
3. **Enter: `medigo.tech`**
4. **Add the required DNS records:**
   - **TXT record:** `@` → `resend-verification=your-verification-code`
   - **CNAME record:** `resend._domainkey` → `resend._domainkey.resend.com`
   - **MX record:** `@` → `mxa.resend.com` (priority 10)
   - **MX record:** `@` → `mxb.resend.com` (priority 20)

### 4. Environment Variables

Add the following to your `.env` file:

```env
# Email Configuration (Resend)
RESEND_API_KEY=re_your_actual_api_key_here
FRONTEND_URL=https://medigo.tech
```

### 5. Test the Setup

```bash
# Update test-resend.js with your API key
node test-resend.js
```

## Features

### ✅ **What's Included:**
- **3,000 emails/month** - Free tier
- **Excellent deliverability** - Professional reputation
- **Modern API** - Easy integration
- **Email templates** - HTML support
- **Analytics** - Track delivery and opens
- **Webhooks** - Real-time events

### 📧 **Email Types Supported:**
- **Welcome emails** - New user registration
- **Transactional emails** - Password reset, etc.
- **Marketing emails** - Newsletters, updates

## Integration

### **Files Created:**
- `utils/resendEmailService.js` - Resend email service
- `test-resend.js` - Test script
- `RESEND_SETUP.md` - This documentation

### **To Enable Email Sending:**

1. **Update auth routes** to use Resend service:
   ```javascript
   const { sendWelcomeEmail } = require("../utils/resendEmailService");
   ```

2. **Uncomment email sending code** in `routes/authRoutes.js`

3. **Test thoroughly** before production

## Troubleshooting

### **Common Issues:**

1. **"Invalid API Key"**
   - Verify your API key is correct
   - Check if the key is active in Resend dashboard

2. **"Domain not verified"**
   - Complete DNS verification
   - Wait for DNS propagation (up to 24 hours)

3. **"From address not verified"**
   - Verify your domain in Resend
   - Use verified domain in from address

### **Testing:**

```bash
# Test with your API key
RESEND_API_KEY=re_your_key_here node test-resend.js
```

## Production Checklist

- [ ] **API Key configured**
- [ ] **Domain verified**
- [ ] **DNS records added**
- [ ] **Test emails sent successfully**
- [ ] **Email sending enabled in auth routes**
- [ ] **Error handling tested**

## Benefits of Resend

- ✅ **Free tier** - 3,000 emails/month
- ✅ **Excellent deliverability** - 99.9% success rate
- ✅ **Modern API** - Developer-friendly
- ✅ **Real-time analytics** - Track performance
- ✅ **Webhook support** - Event notifications
- ✅ **Email templates** - Professional designs

## Next Steps

1. **Complete domain verification**
2. **Test email sending**
3. **Enable in production**
4. **Monitor delivery rates**
5. **Set up webhooks** (optional)

Your MediGo email system will be powered by Resend! 🚀
