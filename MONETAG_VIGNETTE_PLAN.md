# Monetag Vignette Banner Implementation Plan

## 🎯 Goal
Tambah Monetag **Vignette Banner** ads di Ryukomik untuk meningkatkan revenue. Vignette adalah full-screen overlay ad yang muncul sesuai interval navigasi, bukan popunder new tab.

---

## 📊 Analisis Masalah Sekarang

### Current State
- `MonetagScript.tsx` load `tag.min.js` **sekali** di layout mount
- Zone `10944835` = popunder only
- Next.js App Router: **layout gak remount** saat user klik `<Link>`
- MonetagScript **gak watch `pathname`** → script gak re-fire on navigation
- Cleanup function hapus script → re-inject gak konsisten

### Kenapa Vignette Gak Jalan (kalau cuma tambah zone)
1. Vignette perlu **re-injection** atau **manual trigger** setiap page view baru
2. Next.js SPA routing = no full page reload = Monetag script gak tau ada navigasi
3. Monetag `tag.min.js` auto-manages zones based on page load events, bukan route change

### Kenapa Popunder Jalan
- Popunder fire on **first user click** (independent of page navigation)
- Script inject sekali, click listener tetap aktif meskipun SPA navigate
- Interstitial/Vignette butuh **page load event** yang gak terjadi di SPA

---

## 🏗️ Architecture Solution

### Approach: **Pathname-Triggered Script Re-injection + Cooldown**

```
User navigasi (Link click) 
  → usePathname detects change 
  → cooldown check (e.g., max 1 vignette per 60 detik)
  → remove old monetag script tags
  → re-inject tag.min.js dengan zone vignette
  → Monetag sees "new page load" → fires vignette ad
```

### Why This Works
1. Monetag `tag.min.js` berisi logic internal: "kalau script baru di-inject, check ad eligibility"
2. Dengan re-injection, Monetag treat setiap navigasi sebagai "page view baru"
3. Cooldown prevents ad fatigue (user gak bakal kesel)
4. Premium users skip semua ini

---

## 📁 File Changes Required

### 1. NEW: `src/components/MonetagVignette.tsx`
**Purpose**: Handle vignette ad re-injection on route change

```tsx
// Pseudocode
"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const VIGNETTE_ZONE_ID = "XXX"; // Zone ID dari Monetag dashboard (tipe Vignette)
const COOLDOWN_MS = 60000; // 60 detik antar vignette
const SKIP_PATHS = ["/chapter", "/hentai/episode", "/donghua/episode"]; // Skip di reader

export default function MonetagVignette() {
  const pathname = usePathname();
  const { loading, isPremium } = usePremiumStatus();
  const lastFireRef = useRef(0);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    // Skip jika masih loading, premium, atau path gak berubah
    if (loading || isPremium || pathname === prevPathRef.current) return;
    
    // Skip di halaman reader (ganggu baca)
    const isReader = SKIP_PATHS.some(p => pathname?.startsWith(p));
    if (isReader) return;

    // Cooldown check
    const now = Date.now();
    if (now - lastFireRef.current < COOLDOWN_MS) return;

    // Re-inject Monetag script
    const existingScripts = document.querySelectorAll('script[data-zone]');
    existingScripts.forEach(el => el.remove());

    const s = document.createElement("script");
    s.dataset.zone = VIGNETTE_ZONE_ID;
    s.src = "https://al5sm.com/tag.min.js";
    document.body.appendChild(s);

    lastFireRef.current = now;
    prevPathRef.current = pathname;
  }, [pathname, loading, isPremium]);

  return null;
}
```

### 2. MODIFY: `src/components/MonetagScript.tsx`
**Purpose**: Rename popunder script, add zone data attribute, gak perlu diubah signifikan

```diff
  // Di dalam useEffect kedua:
- s.dataset.zone = "10944835";
+ s.dataset.zone = "10944835"; // Popunder - tetap sama
  
+ // Tambah identifier biar MonetagVignette tau ini popunder
+ s.dataset.monetagType = "popunder";
```

### 3. MODIFY: `src/app/layout.tsx`
**Purpose**: Tambah MonetagVignette component

```diff
  import MonetagScript from "@/components/MonetagScript";
+ import MonetagVignette from "@/components/MonetagVignette";
  
  // Di dalam <body>:
  <MonetagScript />
+ <MonetagVignette />
```

### 4. OPTIONAL: `src/components/MonetagManager.tsx`
**Purpose**: Gabungin semua Monetag logic jadi 1 component (cleaner)

```
// Gabungin MonetagScript + MonetagVignette + cleanup logic
// Lebih rapi dari punya 2-3 file terpisah
// Tapi optional — bisa dilakukan nanti
```

---

## 🔧 Monetag Dashboard Setup

### Yang Perlu Dilakukan di Monetag Dashboard:
1. Login ke Monetag → Publishers → Ad Zones
2. Buat **new zone** dengan tipe **"Vignette"** (atau "Interstitial" kalau ada)
3. Copy **Zone ID** baru
4. Replace `VIGNETTE_ZONE_ID` di kode dengan zone ID baru
5. Setting: Frequency cap = 1 per 60s (sesuaikan dengan cooldown di kode)

### Zone yang Harusnya Ada:
| Zone | Type | Location |
|------|------|----------|
| `10944835` | Popunder | Global (udah ada) |
| `NEW_ZONE_ID` | Vignette | SPA navigation trigger |

---

## ⚙️ Configuration Options

### Adjustable Constants (di MonetagVignette.tsx):
```tsx
const COOLDOWN_MS = 60000;        // 60s - ganti ke 30000 untuk lebih agresif
const SKIP_PATHS = [              // Path yang gak trigger vignette
  "/chapter",
  "/hentai/episode", 
  "/donghua/episode",
  "/premium",
  "/premium-pay",
  "/setting"
];
const PREMIUM_SKIP = true;        // Skip untuk premium users
```

### Recommended Settings:
| Scenario | Cooldown | Skip Paths |
|----------|----------|------------|
| Agresif | 30s | Reader only |
| Normal | 60s | Reader + premium pages |
| Konservatif | 120s | Reader + premium + settings |

---

## 🧪 Testing Plan

### Test Cases:
1. **Fresh load** → Vignette gak muncul langsung (cooldown 0 → pertama kali boleh)
2. **Navigasi ke manga detail** → Vignette muncul (setelah cooldown)
3. **Navigasi ke chapter** → Vignette **gak muncel** (skip reader)
4. **Rapid clicks** (5x dalam 10 detik) → Vignette cuma muncul 1x (cooldown works)
5. **Premium user** → Vignette gak pernah muncel
6. **Back button** → Vignette muncel kalau cooldown udah lewat
7. **Hard refresh** → Popunder tetap jalan normal

### Browser Testing:
- [ ] Chrome mobile (Android)
- [ ] Safari mobile (iOS) 
- [ ] Chrome desktop
- [ ] Firefox (adblock scenario)

### Metrics to Monitor:
- [ ] Revenue per 1000 pageviews (sebelum vs sesudah)
- [ ] Bounce rate (jangan naik > 5%)
- [ ] Average session duration (jangan turun signifikan)
- [ ] Premium conversion rate (idealnya naik)

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Ad fatigue | User kabur | Cooldown minimum 60s, skip reader |
| Revenue gak naik | Wasted effort | A/B test dengan 10% traffic dulu |
| Script error | Site broken | try-catch wrapping, fallback ke popunder only |
| Premium users annoyed | Churn | Auto-skip untuk premium |
| Google penalty | SEO drop | Vignette gak block konten dari crawl |
| Mobile UX degradation | Bounce naik | Skip di mobile, atau cooldown lebih panjang |

---

## 📈 Expected Impact

### Conservative Estimate:
```
Current: 100% revenue (popunder only)
After:   +20-35% revenue (popunder + vignette)
```

### Revenue Calculation:
```
If current popunder revenue = Rp 100rb/day
Expected vignette revenue  = Rp 20-35rb/day
Total                      = Rp 120-135rb/day
Monthly uplift             = Rp 600rb - 1jt
```

---

## 🚀 Deployment Steps

1. Buat zone Vignette di Monetag dashboard
2. Copy Zone ID
3. Implementasi kode sesuai plan ini
4. Build & deploy ke VPS
5. Monitor 3 hari pertama
6. Adjust cooldown jika perlu
7. Full rollout setelah validasi

---

## 📝 Notes

- **Jangan implementasi di reader pages** — user baca manga, iklan fullscreen ganggu banget
- **Cooldown is key** — terlalu sering = user install adblock
- **Premium value meningkat** — kalau banyak iklan, orang lebih tertarik beli premium
- **Re-injection approach** works karena Monetag script punya internal "page view counter" yang reset saat script baru di-inject
- **Alternative**: Kalau re-injection gak works, fallback ke `window.location.reload()` di wrapper component (tapi UX jelek)

---

*Created: 2026-07-27*
*For: Codex implementation*
*Project: Ryukomik (ryukomik.my.id)*
