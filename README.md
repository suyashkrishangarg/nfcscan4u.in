# 🚀 OpenTap — Open-Source Dynamic NFC & QR Card Platform

An open-source, production-ready platform for blank NFC and QR smart cards.

Print high-resolution vector QR codes and program NFC chips **once**. Assign, reassign, or switch destination links **anytime** without ever reprinting or touching the physical card again.

---

## ⚡ How It Works

```
        Physical NFC / QR Card (Blank, Pre-printed)
                         │
                         ▼ Tapped or Scanned
            https://yourdomain.com/c/A7X9K2
                         │
         ┌───────────────┴───────────────┐
         │ Database Status Check         │
         └───────────────┬───────────────┘
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
   [Unclaimed]                       [Active]
  One-Tap Claim Wizard             Instant HTTP 302 Redirect
  - Pick Target URL / Profile       (Or Rich Digital Business Card
  - Set Password to edit later         with .vcf Contact Download)
  (No PIN required)
```

---

## 🌟 Key Features

- **Dynamic Intermediary Redirects**: The physical card always points to `/c/:cardId`. The destination can be changed anytime.
- **Batch Print Generator**:
  - Exports **Vector SVGs** (crisp at any size, perfect for Adobe Illustrator, Figma, CorelDraw).
  - Exports **300+ DPI PNGs** (for Canva, Photoshop, or direct printing).
  - Exports **CSV sheet** of Card IDs and NFC payload URLs.
  - Generates single downloadable `.zip` file from the web UI or CLI.
- **2 Operation Modes per Card**:
  1. **Direct Redirect**: Instantly forwards scanner to any URL (LinkedIn, Instagram, WhatsApp, portfolio, Google Review, Linktree, etc.).
  2. **Digital Business Card**: Displays a mobile contact profile with Avatar, Bio, Social links, and a **"Save to Contacts" (.vcf)** button.
- **Self-Service Cardholder Portal**:
  - Cardholders can log in with their Card ID and password to change their link anytime.
  - Scan analytics counter (tracks how many times the card has been scanned/tapped).
- **Admin Control Center**:
  - Generate new batches of cards in seconds.
  - View, monitor, pause, or reset cards.
- **Database Flexibility**:
  - Embedded **SQLite** locally (zero configuration).
  - **Turso Cloud** (free hosted SQLite) for 100% free serverless deployment on Vercel or Render.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

### 3. Run the Server
```bash
npm start
```
Open your browser at:
- **Homepage**: [http://localhost:3000](http://localhost:3000)
- **Admin Portal**: [http://localhost:3000/admin](http://localhost:3000/admin) *(Default Key: `admin123`)*

---

## 📦 Batch QR Generation for Printing

You can generate cards from the **Admin Web UI** or via the **CLI**:

```bash
# Generate 50 cards with prefix 'CARD-'
npm run generate -- --count 50 --prefix CARD-
```

All vector SVGs, high-res PNGs, and the CSV file will be exported directly into an `output/batch_<timestamp>/` folder.

---

## 🖨️ Physical Manufacturing & NFC Encoding Guide

1. **Printing the Cards**:
   - Provide the generated `.svg` files (from the `qr_svg` folder) to your card printing vendor.
   - Recommended minimum print size: **15mm x 15mm** (0.6" x 0.6").
   - No PIN is printed anymore — simply hand the finished card to its owner. The
     owner claims it on the very first tap/scan by setting a destination and a password.

2. **Encoding the Blank NFC Chips (NTAG213 / 215 / 216)**:
   - Use the free **NFC Tools** app (available on iOS App Store & Google Play).
   - Tap **Write** ➔ **Add a record** ➔ **Custom URL / URI**.
   - Paste the card URL from the generated `batch_cards_list.csv` (e.g., `https://yourdomain.com/c/CARD-A7X9K2`).
   - Tap **Write / Tap to Write** and hold the card against the phone.
   - *Both the printed QR code and the NFC chip must point to the identical URL.*

---

## ☁️ Deployment Guide: Render vs. Vercel

### Which Free Service is Better?

| Feature | **Vercel + Turso** *(Recommended)* | **Render (Free Web Service)** |
| :--- | :--- | :--- |
| **Tap/Scan Latency** | ⚡ **Instant (<300ms)** | ⏳ **30–50s delay on first tap** (cold start) |
| **Server Sleep** | Never sleeps | Sleeps after 15 mins of inactivity |
| **Free Tier Storage** | 9 GB permanently free via Turso | Ephemeral disk (resets on restart) |
| **Best For** | Real-world NFC cards scanned in person | Non-time-sensitive background apps |

> [!TIP]
> **Why Vercel + Turso is recommended**: When someone physically taps an NFC card, they expect an immediate response. Render's free tier sleeps after 15 minutes, causing a 40-second spin-up delay for the first person scanning. Vercel's serverless functions wake up in under 300ms!

---

### Option A: Deploying to Vercel (Recommended)

1. **Create a Free Turso Database** (Takes 1 minute):
   - Go to [turso.tech](https://turso.tech) and create a free account.
   - Create a database: e.g. `nfc-cards`.
   - Copy your **Database URL** (`libsql://...`) and create an **Auth Token**.

2. **Deploy to Vercel**:
   - Push your code to GitHub.
   - Import the repository in [Vercel](https://vercel.com).
   - In **Environment Variables**, add:
     - `BASE_URL`: `https://nfcscan4u.in`
     - `DATABASE_URL`: `libsql://your-db-name.turso.io`
     - `DATABASE_AUTH_TOKEN`: `your-turso-token`
     - `ADMIN_KEY`: `your_secure_admin_password`
     - `SESSION_SECRET`: `any-long-random-string`
   - Click **Deploy**.
   - Then connect your GoDaddy domain (see the **Custom Domain** section below).
   - This repo already ships `api/index.js` (a Vercel Function that re-exports the Express app) plus a rewrite in `vercel.json`, so no build command or framework preset is needed.
   - ⚠️ **Local SQLite does not persist on Vercel** — you must set `DATABASE_URL` to your Turso URL or your data resets on every deploy.
   - ⚠️ Large print batches are best generated locally (`npm run generate`) rather than in the serverless function.

---

### Option B: Deploying to Render

1. Go to [render.com](https://render.com) and create a free account.
2. Click **New +** ➔ **Web Service**.
3. Connect your GitHub repository.
4. Settings:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
5. Under **Environment Variables**, add:
   - `BASE_URL`: `https://nfcscan4u.in`
   - `DATABASE_URL`: `libsql://your-db.turso.io` (Recommended) or leave default for local disk
   - `DATABASE_AUTH_TOKEN`: `your-turso-token`
   - `ADMIN_KEY`: `your_admin_password`
   - `SESSION_SECRET`: `any-long-random-string`
6. Click **Create Web Service**.

---

## 🌐 Connecting Your GoDaddy Domain (`nfcscan4u.in`)

You bought the domain at GoDaddy, so you keep GoDaddy as your registrar and simply point its DNS records at your free host (Vercel shown here; Render works the same way).

### Step 1 — Add the domain in the host dashboard
1. Open your project on Vercel → **Settings** → **Domains**.
2. Add **`nfcscan4u.in`** and **`www.nfcscan4u.in`**.
3. Vercel now shows the **exact DNS records** to create in the **domain card**. Always copy the values from your own card — they are the source of truth. Typically:
   - **Apex** (`nfcscan4u.in`) → **A record** = `76.76.21.21` (general-purpose) *or* a project-specific anycast IP such as `216.198.79.1`. **Use whatever your domain card displays.**
   - **www** → **CNAME record** = the project's unique target shown by Vercel (e.g. `cname.vercel-dns.com`)

> ⚠️ Vercel does **not** support IPv6 for custom domains added via a third-party DNS provider. Delete any **AAAA** records for `@`.
> ⚠️ Vercel verifies the *exact* A record from your card. If it doesn't match, the domain stays "Invalid Configuration".

### Step 2 — Edit DNS in GoDaddy
1. Sign in to GoDaddy → **My Products** → find `nfcscan4u.in` → **DNS** (Manage DNS).
2. **Delete ALL conflicting default records** for `@` and `www`. GoDaddy pre-creates a "parked" A record set (commonly `3.33.130.190`, `15.197.148.33`) and a `www` CNAME pointing back to the apex. These serve a GoDaddy "lander"/parking page and **must be removed**, or your domain will never reach Vercel.
3. **Add** these records using the values from your Vercel domain card:

   | Type | Name | Value | TTL |
   | :--- | :--- | :--- | :--- |
   | **A** | `@` | the A record from your Vercel card (e.g. `76.76.21.21` or `216.198.79.1`) | 1 hour (or default) |
   | **CNAME** | `www` | the CNAME from your Vercel card (e.g. `cname.vercel-dns.com`) | 1 hour (or default) |

4. Save the records.

### Step 3 — Wait & verify
- DNS propagation is usually minutes (up to ~24h worst case).
- Back in Vercel → **Domains**, the status turns to **Valid Configuration** and a free SSL certificate is issued automatically (HTTPS).
- Set your preferred primary domain — recommended: **`nfcscan4u.in`** (Vercel then 301-redirects `www` to it).

### Troubleshooting the custom domain
- **You see a GoDaddy "lander"/parking page instead of your app** → stale GoDaddy A records still exist. Delete every `@` A record that isn't the one from your Vercel domain card.
- **`http://` works but `https://` fails / no certificate** → DNS is split between providers or contains AAAA/conflicting records. Remove them and wait for propagation; Vercel auto-issues SSL once DNS is clean.
- **Status stays "Invalid Configuration"** → the A record value doesn't exactly match your Vercel domain card, or an AAAA record is present.

### Step 4 — Point the app at the domain
Set the environment variable and redeploy so printed QR/NFC URLs use your real domain:
```
BASE_URL=https://nfcscan4u.in
```
> ⚠️ **Important:** the card URL baked into every QR code and NFC chip is `BASE_URL + /c/<CardID>`. Generate your batches **after** setting `BASE_URL=https://nfcscan4u.in`, otherwise the printed cards will point at `localhost` or the temporary `*.vercel.app` URL.

---

## 🔒 Security Best Practices

- **No Activation PIN**: Claiming happens in a single tap for maximum convenience. Whoever first taps an unclaimed card sets its destination and password — so distribute blank cards directly to their intended owners and avoid leaving unclaimed cards in public places.
- **Card Password**: Set by the owner during claiming, required to edit destination links in `/manage/:cardId`.
- **Bcrypt**: All passwords are securely hashed with bcrypt.
- **Admin Key**: Required to access `/admin`. Always set a long random `ADMIN_KEY` in production and never keep the default.
