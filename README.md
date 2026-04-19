# OpenPlate

**OpenPlate** is an open-source, AI-powered nutrition tracking Progressive Web App (PWA). It lets users log daily food and exercise, track 37+ macro and micronutrients, set personalized health goals, and identify food from photos using AI vision.

> [中文文档 →](./README.zh-CN.md)

---

## Features

- **Daily Nutrition Log** — track meals and exercise by date with full nutrient breakdowns
- **AI Food Recognition** — upload a photo; Qwen Vision identifies the food and fills in nutritional data automatically (5 uses/day)
- **AI Quick Record** — photograph a complete meal and get an estimated total nutrient summary
- **37-Nutrient Tracking** — calories, macros (protein, carbs, fat subtypes, fiber, sodium), 27 vitamins and minerals
- **Personalized Goals** — BMR/TDEE calculated from your profile; bulk / cut / maintain presets with custom calorie adjustments
- **Exercise Tracking** — 8 exercise types with MET-based calorie burn, integrated into daily totals
- **Shared Food Catalog** — community food database all users can read and contribute to
- **Meal Presets** — save reusable meals composed of existing foods
- **Offline-First PWA** — installable on iOS/Android; works without a connection and syncs when back online
- **Push Notifications** — FCM notifications when AI processing completes
- **Admin Panel** — approve or reject user-submitted content deletion requests

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| State | Zustand 5 with localStorage persistence |
| Routing | React Router v7 |
| PWA | vite-plugin-pwa + Workbox service workers |
| Backend | Firebase (Auth, Firestore, Storage, Cloud Functions v2) |
| AI | Alibaba Qwen Vision (`qwen3.6-flash`) via Cloud Functions |
| Notifications | Firebase Cloud Messaging (FCM) |

---

## Project Structure

```
OpenPlate/
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/             # Route-level page components
│   ├── store/             # Zustand stores (auth, foods, meals, daily log, goals…)
│   ├── hooks/             # Custom React hooks (Firestore sync, FCM, scroll lock…)
│   ├── lib/               # Firebase init, nutrition math, image storage, FCM setup
│   ├── types/             # Shared TypeScript interfaces
│   └── sw.ts              # Workbox service worker
├── functions/             # Firebase Cloud Functions (AI task processor)
├── scripts/               # Admin CLI scripts
├── public/                # PWA icons and manifest assets
├── firestore.rules        # Firestore security rules
├── storage.rules          # Storage security rules
└── firebase.json          # Firebase hosting / functions config
```

---

## Prerequisites

- Node.js 18+
- A [Firebase](https://console.firebase.google.com/) project with the following services enabled:
  - Authentication (Email/Password)
  - Cloud Firestore
  - Firebase Storage
  - Cloud Functions (requires Blaze plan for AI features)
  - Firebase Cloud Messaging
- An [Alibaba Cloud / DashScope](https://dashscope.aliyun.com/) API key for Qwen Vision (required for AI features)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/frankl1nzhu/openplate.git
cd openplate
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your Firebase project values:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

> To use local Firebase Emulators instead of production, also add `VITE_USE_EMULATORS=true`.

### 3. Deploy Firebase security rules

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage:rules
```

Alternatively, paste the contents of `firestore.rules` and `storage.rules` into the Firebase Console rules editors and publish.

### 4. Create Firestore indexes

On first run, Firestore will prompt you with links to create the required composite indexes. You can also add them manually:

| Collection | Fields |
|---|---|
| `foods` | `createdAt` DESC |
| `meals` | `createdAt` DESC |
| `dailyLogs` | `userId` ASC, `date` ASC |

### 5. Deploy Cloud Functions (required for AI features)

Set the Qwen API key as a Firebase Function secret:

```bash
firebase functions:secrets:set QWEN_API_KEY
```

Then deploy:

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

### 6. Set up an admin user (optional)

Admin users can approve or reject content deletion requests. To grant admin privileges:

1. Download a service account key from Firebase Console → Project Settings → Service Accounts → Generate new private key
2. Run the admin script:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
npx tsx scripts/setAdmin.ts user@example.com
```

The user must re-login for the change to take effect.

---

## Development

```bash
npm run dev          # Start Vite dev server at http://localhost:5173
npm run build        # Production build → dist/
npm run preview      # Preview the production build locally
npm run lint         # Run ESLint
```

### Using Firebase Emulators (optional)

```bash
firebase init emulators   # Enable Auth, Firestore, Storage emulators
firebase emulators:start
```

Add `VITE_USE_EMULATORS=true` to `.env` to route the app to local emulators.

---

## Deployment

### Firebase Hosting (recommended)

```bash
npm run build
firebase init hosting   # Set dist/ as public directory, configure as SPA
firebase deploy
```

### Other static hosts

The `dist/` folder is a standard SPA. Deploy it to Vercel, Netlify, Cloudflare Pages, or any static host. Configure the host to serve `index.html` for all routes (SPA fallback).

---

## Installing as a PWA

**iOS (Safari)**
1. Open the deployed URL in Safari
2. Tap the Share button (box with arrow) → **Add to Home Screen**
3. Confirm and open from the home screen icon for full-screen mode

**Android (Chrome)**
1. Open the URL in Chrome
2. Tap the menu → **Install app** (or accept the browser prompt)

---

## Data Model

| Collection | Access | Purpose |
|---|---|---|
| `foods` | Shared read, auth write | Community food database |
| `meals` | Owner only | User-created meal presets |
| `dailyLogs` | Owner only | Daily food and exercise entries |
| `dailyGoals` | Owner only | Personalized nutrient targets |
| `fitnessGoals` | Owner only | Bulk / cut / maintain goals |
| `userProfiles` | Owner only | Demographics for BMR/TDEE |
| `deleteRequests` | Auth read/create, admin update | Content moderation queue |
| `aiTasks` | Owner + Cloud Function | AI processing queue |
| `llmUsage` | Cloud Function write | AI quota tracking |

---

## Security Notes

- `.env` is excluded from git via `.gitignore`. **Never commit it.**
- Firestore and Storage rules enforce server-side ownership checks — the frontend cannot bypass them.
- Admin privileges are granted via Firebase Custom Claims, not stored in the database.
- Food and meal data are shared across users; daily logs and goals are private.

---

## Contributing

Pull requests are welcome. For significant changes, please open an issue first to discuss your proposal.

---

## License

MIT
