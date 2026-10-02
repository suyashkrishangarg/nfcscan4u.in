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
  Friendly Setup Wizard             Instant HTTP 302 Redirect
  - Enter Activation PIN            (Or Rich Digital Business Card
  - Enter Target URL / Profile         with .vcf Contact Download)
  - Set Password to edit later
```

---

## 🌟 Key Features

- **Dynamic Intermediary Redirects**: The physical card always points to `/c/:cardId`. The destination can be changed anytime.
- **Batch Print Generator**:
  - Exports **Vector SVGs** (crisp at any size, perfect for Adobe Illustrator, Figma, CorelDraw).
  - Exports **300+ DPI PNGs** (for Canva, Photoshop, or direct printing).
  - Exports **CSV sheet** of Card IDs, Activation PINs, and NFC payload URLs.
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
   - Print the matching 4-digit **Activation PIN** on the card's paper sleeve, welcome letter, or packaging.

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
     - `BASE_URL`: `https://your-project.vercel.app` (or your custom domain)
     - `DATABASE_URL`: `libsql://your-db-name.turso.io`
     - `DATABASE_AUTH_TOKEN`: `your-turso-token`
     - `ADMIN_KEY`: `your_secure_admin_password`
     - `SESSION_SECRET`: `any-long-random-string`
   - Click **Deploy**.

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
   - `BASE_URL`: `https://your-service.onrender.com`
   - `DATABASE_URL`: `libsql://your-db.turso.io` (Recommended) or leave default for local disk
   - `DATABASE_AUTH_TOKEN`: `your-turso-token`
   - `ADMIN_KEY`: `your_admin_password`
   - `SESSION_SECRET`: `any-long-random-string`
6. Click **Create Web Service**.

---

## 🔒 Security Best Practices

- **Activation PIN**: Prevents anyone scanning a card in transit from claiming it before the legitimate buyer opens it.
- **Card Password**: Set by the owner during activation, required to edit destination links in `/manage/:cardId`.
- **Passlib/Bcrypt**: All passwords securely hashed with bcrypt.
