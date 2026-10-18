# FlexStudy v2 — Konteks Lengkap untuk AI Penerus

> Dokumen ini ditulis 17 Oktober 2026 untuk menyerahkan pekerjaan ke AI/agen lain.
> Semua angka dan jalur di bawah **diverifikasi langsung dari repo pada tanggal itu**, bukan dari ingatan.
> Bila ada yang bertentangan dengan dokumen ini saat kamu membacanya, percayai repo — lalu perbarui dokumen ini.

---

## 1. Apa proyek ini

**FlexStudy v2** — aplikasi manajemen waktu belajar berbasis *time-blocking* untuk pelajar Indonesia.
Bahasa UI: **Indonesia** (ada kamus Inggris di kode, tapi default `id`).

Janji produknya satu kalimat: menyusun hari dalam blok waktu yang realistis, lalu **menyesuaikannya tanpa rasa bersalah ketika hari tidak berjalan sesuai rencana**.

Bentuknya dua: **web** (Vercel, dibangun dengan `npm run build`) dan **desktop Windows** (Tauri 2, installer `.msi`/`.exe`).
Semua data lokal. Tidak ada akun, tidak ada server, tidak ada telemetri.

- Nama paket: `flexstudy-dashboard`
- Identifier Tauri: `com.creepix.flexstudy`
- Folder data pengguna: `%LOCALAPPDATA%\com.creepix.flexstudy` (profil WebView2, tempat IndexedDB hidup)

---

## 2. Keadaan repo (terverifikasi)

| | |
|---|---|
| Working dir | `C:\laragon\www\flexstudy-dashboard` |
| Branch | `feat/desktop-tauri` |
| HEAD | `c94a44a739966b5de3c5055c788f0d44798c0307` — `feat(journal): lay the archive out by year, then month` (2026-10-16 07:57 +0700) |
| Remote | `https://github.com/Dzaha-code/Flex-Study.git` |
| Sinkron | ya — `origin/feat/desktop-tauri` = HEAD lokal |
| Working tree | bersih |
| Versi | **0.4.1** di tiga tempat: `package.json:3`, `src-tauri/tauri.conf.json:5`, `src-tauri/Cargo.toml:3` (+ `package-lock.json` root) |
| Uji | **139 test / 10 berkas**, semua lulus (`npm test`, ± 6 detik) |

Dua rilis terakhir: `f60c6a9` (0.4.0, 45 berkas, +2611/−111) dan `c94a44a` (0.4.1, 16 berkas, +316/−134).

---

## 3. Aturan yang tidak boleh dilanggar

Ini keputusan yang sudah dibayar mahal. Jangan diubah tanpa alasan yang lebih kuat dari yang sudah ada.

1. **Bukan Electron, bukan Node runtime.** Desktop = Tauri 2 + WebView2. Jangan menambah dependensi yang butuh proses Node saat runtime.
2. **Build web harus tetap jalan.** `next.config.ts` menyalakan `output: "export"` hanya bila `TAURI_BUILD=1`. Jangan pernah membuat konfigurasi yang mengasumsikan desktop selalu aktif. Jangan menambah `assetPrefix` untuk produksi.
3. **Hanya `src/lib/desktop.ts` yang boleh mengimpor `@tauri-apps/*`**, dan impornya dinamis. Ini yang menjaga bundel web bersih.
4. **`src/domain/` murni.** Tidak mengimpor React, tidak menyentuh penyimpanan, tidak membaca jam sendiri. Semua fungsi menerima waktu dan pembuat id sebagai argumen. Karena itu ia bisa diuji cepat dan nanti dipanggil agen dengan jalur data yang sama.
5. **Token desain hanya di `src/app/globals.css`.** Komponen tidak boleh menulis nilai heksadesimal.
6. **Satu warna aksen.** Status punya warnanya sendiri, dipakai hanya untuk status. Kategori dibedakan lewat ikon + label + pola garis — bukan lima hue.
7. **Tidak ada `backdrop-filter`** di jalur render, dan tidak ada animasi masuk di setiap kartu. Gerak hanya menjawab aksi pengguna. `prefers-reduced-motion` dipatuhi aturan global (`globals.css:215-223`).
8. **Tidak ada rahasia di repo.** Tidak ada kunci tanda tangan, tidak ada `.env` yang di-commit.
9. **Jangan mengklaim sesuatu sudah diuji visual** kalau belum dilihat mata manusia. Bagian 13 memuat daftar yang memang belum dicek.

Catatan `AGENTS.md` di root: blok `nextjs-agent-rules` ditulis ulang otomatis oleh `next dev`. Jangan dihapus manual dari diff — ia akan muncul lagi.

---

## 4. Stack

| Lapisan | Pilihan | Versi |
|---|---|---|
| Framework | Next.js App Router | 16.4.0 |
| UI | React | 19.3.0 |
| Bahasa | TypeScript | 5.x |
| Gaya | Tailwind CSS | 4.x (`@tailwindcss/turbopack`) |
| State | Zustand | 5.0.15 |
| Penyimpanan | Dexie (IndexedDB) | 4.4.6 |
| Validasi | Zod | 4.6.7 |
| Uji | Vitest (node env) | 5.0.4 |
| Desktop | Tauri | 2.12.4 (CLI 2.12.3) |
| Animasi intro | GSAP | 3.15.0 — **satu-satunya** yang diimpor dinamis |

Terpasang tapi **tidak** dipakai di jalur render: `framer-motion`, `motion`, `lucide-react`, `@hugeicons/*`. Ada juga `@radix-ui/*`, `vaul`, `sonner` yang terpasang sementara primitif yang benar-benar dipakai masih `@base-ui/react` — migrasi ini belum selesai (lihat §11).

---

## 5. Peta berkas

Baris = jumlah baris saat dokumen ini ditulis. Pakai ini untuk navigasi, bukan sebagai kontrak.

### Rute (`src/app/`)

| Rute | Berkas | Isi |
|---|---|---|
| `/` | `page.tsx` (5) | Hari ini |
| `/week` | `week/page.tsx` (4) | Pekan |
| `/recap` | `recap/page.tsx` (10) | Rekap bulan/tahun |
| `/journal` | `journal/page.tsx` (4) | Jurnal |
| `/settings` | `settings/page.tsx` (4) | Atur |
| `/guide` | `guide/page.tsx` (4) | Panduan |

Halaman rute sengaja tipis — semuanya hanya me-render komponen dari `features/`.

### Domain (logika murni, teruji)

| Berkas | Baris | Isi |
|---|---|---|
| `domain/types.ts` | 205 | Semua tipe inti: `BlockInstance`, `BlockStatus`, `Reflection`, `Settings` |
| `domain/time.ts` | 115 | `todayISO`, `addDays`, parsing/format tanggal |
| `domain/schedule.ts` | 133 | Materialisasi blok untuk satu hari |
| `domain/status.ts` | 88 | `isOpen`, `isSettled`, transisi status |
| `domain/targets.ts` | 86 | Target harian/mingguan |
| `domain/week.ts` | 93 | Agregasi pekan, `creditedMinutes` |
| `domain/recap.ts` | 219 | `periodRecap`, `monthRecap`, `yearRecap`, `totalRecap`, `monthKey`, `yearKey` |
| `domain/reflection.ts` | 141 | Jurnal + `archiveByYearMonth()` |
| `domain/shift.ts` | 454 | `planShift()` (pratinjau) dan `applyShift()` (terapkan) — satu mesin untuk keduanya |
| `domain/propagate.ts` | 99 | Penyebaran suntingan template ke blok yang sudah ada |
| `domain/ids.ts` | 26 | Pembuat id |
| `domain/index.ts` | 11 | Permukaan publik untuk pemanggil luar (termasuk agen nanti) |

### Data

| Berkas | Baris | Isi |
|---|---|---|
| `data/db.ts` | 53 | Dexie `"flexstudy"`, `version(1)`, 6 tabel |
| `data/schema.ts` | 167 | Skema Zod, termasuk `intro` dengan `.default("once")` |
| `data/repository.ts` | 147 | Baca/tulis per tabel |
| `data/store.ts` | 632 | Store Zustand: hidrasi, aksi, undo |
| `data/workspace-io.ts` | 64 | Ekspor/impor JSON |

**Indeks IndexedDB** (`db.ts:32-39`) — sudah ada, jangan bikin tabel baru tanpa menaikkan `version(n)`:

```
categories: "id, order"
templates:  "id, categoryId, order"
instances:  "id, date, status, categoryId, templateId"
reflections:"id, date"
shiftEvents:"id, date"
meta:       "key"
```

Perhatikan: `version(n)` Dexie adalah versi **skema penyimpanan**; setiap baris juga punya `schemaVersion` sendiri untuk migrasi data. Dua hal berbeda.

**Titik aksi di `store.ts`** (line refs stabil, dipakai sebagai titik sambung event):

| Baris | Aksi |
|---|---|
| 111 | `hydrate` |
| 114 | `updateSettings` |
| 124 | `applyTemplate` |
| 129 | `ensureRange(from, to)` |
| 132 | `startBlock` |
| 133 | `completeBlock` |
| 134 | `resetBlock` |
| 135 | `skipBlock` |
| 138 | `runShift(plan)` |
| 139 | `undoShiftEvent(id)` |

### Fitur (`src/features/`)

| Berkas | Baris | Catatan |
|---|---|---|
| `today/today-screen.tsx` | 229 | Menangkap tanggal **sekali saat mount** (baris 33) |
| `today/timeline.tsx` | 431 | Linimasa + penanda "sekarang" |
| `today/running-timer.tsx` | 105 | Timer satu detik, hanya hidup di komponen ini |
| `today/focus-complete.tsx` | 62 | Layar penuh saat waktu habis, `fixed inset-0 z-90` |
| `today/shift-sheet.tsx` | 271 | Geser jadwal |
| `today/use-reminders.ts` | 63 | Pengingat |
| `week/week-screen.tsx` | 209 | |
| `recap/recap-screen.tsx` | 233 | |
| `journal/journal-screen.tsx` | 528 | Arsip dua tingkat: tahun → bulan → entri |
| `journal/export-markdown.ts` | 38 | |
| `settings/settings-screen.tsx` | 369 | 6 panel |
| `settings/plan-editor.tsx` | 313 | |
| `plan/block-template-form.tsx` | 159 | |
| `plan/edit-block-sheet.tsx` | 142 | |
| `guide/guide-screen.tsx` | 160 | |
| `onboarding/onboarding-screen.tsx` | 141 | 3 langkah |
| `intro/Intro.tsx` | 299 | Animasi pembuka, GSAP impor dinamis di baris 93 |
| `intro/IntroGate.tsx` | 93 | Gerbang di atas seluruh aplikasi |
| `intro/intro-mode.ts` | 39 | **Murni**: `resolveIntroPhase(mode, seen, force)` |
| `intro/copy.ts` | 47 | |
| `intro/intro.css` | 193 | Kanvas selalu gelap, tidak ikut tema |
| `tour/guided-tour.tsx` | 393 | 14 langkah, overlay `z-[70]` |
| `tour/tour-store.ts` | 53 | State di memori saja |

### Komponen & lib

| Berkas | Baris |
|---|---|
| `components/app-boundary.tsx` | 78 — urutan boot sebenarnya |
| `components/app-shell.tsx` | 181 |
| `components/app-providers.tsx` | 39 |
| `components/storage-notice.tsx` | 48 |
| `components/ui/surface.tsx` | 273 |
| `components/ui/field.tsx` | 178 |
| `components/ui/icons.tsx` | 136 — ikon SVG buatan sendiri |
| `components/ui/button.tsx` | 73 |
| `components/ui/dialog.tsx` | 68 — `@base-ui/react/dialog` |
| `components/ui/toast.tsx` | 45 |
| `components/ui/confirm.tsx` | 54 |
| `lib/desktop.ts` | 73 — satu-satunya modul yang mengenal Tauri |
| `lib/preferences.ts` | 78 — cermin `localStorage` |
| `lib/markdown.tsx` | 87 |
| `lib/use-now.ts` | 52 |
| `lib/utils.ts` | 69 — `cn()` |

---

## 6. Alur data

```
Boot
 └─ AppBoundary (app-boundary.tsx:67-87)
     ├─ belum mount / status "loading" → BootScreen (skeleton)
     ├─ status "error"                → ErrorScreen + tombol coba lagi
     ├─ !onboardingCompleted          → OnboardingScreen
     └─ selain itu                    → AppShell → halaman rute
     └─ SEMUA dibungkus <IntroGate>  ← intro menimpa apa pun di bawahnya
```

Store memanggil `ensureRange(today, addDays(today, MATERIALISE_DAYS))` saat hidrasi (`store.ts:213-214`) untuk materialisasi blok ke depan.

**Setelan** (`domain/types.ts:190-206`): `locale`, `theme`, `intro`, `weekStart`, `remindersEnabled`, `dayStart` (`"08:00"`), `dayEnd` (`"21:30"`), `contentWidth`, `onboardingCompleted`, `tourCompleted`, `activeTemplateId`.

**Cermin `localStorage`** — hanya untuk keputusan yang harus diambil *sebelum* IndexedDB menjawab:

| Kunci | Isi |
|---|---|
| `flexstudy.theme` | tema |
| `flexstudy.locale` | bahasa |
| `flexstudy.intro` | mode intro |
| `fs.intro.v1` | penanda "sudah pernah lihat" (ditulis saat animasi selesai/dilewati) |
| `fs.intro.force` | penanda sekali-pakai dari tombol *Putar sekarang* |

IndexedDB tetap sumber kebenaran. `localStorage` hanya cermin; kalau keduanya berbeda, IndexedDB menang setelah hidrasi.

---

## 7. Yang sudah jadi, per layar

- **Hari ini** — linimasa vertikal, penanda "sekarang", satu blok berjalan punya tombol *Mulai fokus* dengan riak, timer, streak 7 kotak, tambah blok, geser jadwal dengan pratinjau + Urungkan 10 detik.
- **Pekan** — grid 7 hari, target mingguan dari `creditedMinutes` status `done`. Menunda blok memindahkan kesempatan, **tidak** mengurangi target (diuji di `tests/shift.test.ts`).
- **Rekap** — bulan/tahun, seperti raport, target diprorata.
- **Jurnal** — entri harian (tiga hal yang dipelajari + catatan markdown), pencarian, penanda favorit, arsip dua tingkat tahun → bulan, ekspor markdown.
- **Atur** — 6 panel berurutan: **Tampilan** (107), **Bantuan** (222), **Kategori** (239), **Blok** (244), **Template** (249), **Data** (285-286). Panel Tampilan memuat tema + kontrol intro (`data-tour="settings-appearance"`).
- **Panduan** — dokumentasi dalam aplikasi, tombol putar tur.
- **Onboarding** — 3 langkah: pilih template → sesuaikan → buka Hari ini.
- **Tur** — 14 langkah berpindah sendiri antar 6 layar, sorotan + kartu yang memilih sisi dengan ruang terbanyak, Esc/←/→, fokus ke kartu, `aria-modal`.
- **Intro** — tiga mode: `once` (bawaan), `always`, `off`; bisa dilewati kapan saja; `prefers-reduced-motion` dapat versi fade.

---

## 8. Sistem desain ringkas

Semua di `src/app/globals.css` (324 baris). **MIGRATION BRIDGE masih hidup di baris 73-108** — jembatan token lama; ~188 pemakaian token lama belum diganti. Jangan hapus tanpa menyelesaikan migrasinya.

- Token inti: `--ink`, `--bg`, `--surface`, `--surface-raised`, `--line`, `--line-strong`, `--ink-muted`, `--mute`, `--accent`, `--accent-ink`, `--accent-surface`, `--hl`, `--ok`, `--warn`, `--danger`.
- Radius berhierarki: kontrol 8 px (`rounded-ctl`/`rounded-control`), panel 12 px (`rounded-panel`), modal 16 px.
- Huruf: Bricolage Grotesque (judul) + Figtree (isi), keduanya `.woff2` lokal di `src/assets/fonts/`, subset latin. Angka `tabular-nums`.
- Utilitas khas: `.surface-panel`, `.surface-floating`, `.stabilo` (baris ~250 — **nama kelas CSS lama, bukan fitur karakter**), `.measure`, `.text-display`, `.text-title`, `.text-meta`, `.text-label`, `.text-caption`, `.text-mute`.
- **Tangga z-index yang berlaku**: backdrop dialog `z-40`, popup dialog `z-50`, tur `z-[70]`, layar penuh selesai-fokus `z-90`. Overlay layar penuh baru harus di atas `z-50`; preseden penuh di repo ini adalah `z-90`.
- Gerak: `recap-enter` (306-319), `focus-ripple` (322-339), `focus-complete` (344-359, membalik `--ink`/`--bg`).

---

## 9. i18n

Bukan `next-intl`. Mesin sendiri: `src/i18n/index.ts` (83 baris), kamus `messages/id.ts` (414) dan `messages/en.ts` (402), kunci bertipe `MessageKey` sehingga kunci yang hilang jadi **galat kompilasi**.

- Dua bahasa: `id` (default), `en`. Tidak ada rute ber-locale — bahasa hanya setelan.
- `<html lang="id">` di `layout.tsx:38`, lalu `app-providers.tsx:34` menyetel `document.documentElement.lang = locale`.
- API: `useI18n()` → `{ t, locale, formatMinutes, formatWeekdayShort, formatDateShort, formatMonthName }`.
- **Menambah teks berarti menambah di kedua kamus**, atau `tsc` gagal.
- Placeholder memakai interpolasi `{count}`, `{current}/{total}`.

---

## 10. Desktop (Tauri)

- Konfigurasi: `src-tauri/tauri.conf.json` — **satu jendela**, judul `FlexStudy`, 1100×740, min 960×640, `resizable`, tidak fullscreen.
- `frontendDist: "../out"`, `beforeBuildCommand: npm run build:desktop` (yaitu `scripts/build-desktop.mjs`, `TAURI_BUILD=1`).
- `security.csp: null` — belum diperketat.
- Plugin: `notification`, `log`, `single-instance`. **`updater` belum diaktifkan** (butuh pasangan kunci; kunci privat tidak boleh masuk repo, dan kalau hilang kamu tidak bisa lagi mengirim pembaruan ke pemasangan yang sudah ada).
- Tidak ada proses latar: menutup jendela = menutup aplikasi.

**Installer yang ada sekarang** (`installers/`, **di-track di git** sebagai blob biner — bukan folder yang diabaikan):

| Berkas | Ukuran | SHA256 |
|---|---|---|
| `FlexStudy_0.4.1_x64-setup.exe` (NSIS, per-user, tanpa admin) | 1.715.142 B | `ED29A1050DA7F55F511FE9929073E41AB72DD3231B1CDFF11D06A7E8D5A2F5BE` |
| `FlexStudy_0.4.1_x64_en-US.msi` (per-mesin, butuh admin) | 2.236.416 B | `1B186C7FF319EC584FF8D3CC0FC4A357DD9EA28E92CB1063D5653FB39AE1C1DB` |

Karena keduanya di-track, setiap build baru yang di-commit akan menambah ~3,9 MB permanen ke riwayat repo.

**Waktu build terukur**: 0.4.0 = 692 detik; 0.4.1 = 413 detik (ekspor Next ± 60 detik termasuk kompilasi 30,5 detik dan TypeScript 20,8 detik; Rust release 4 m 36 s; sisanya MSI + NSIS). Menaikkan versi **selalu** memaksa crate Rust di-rebuild penuh — 5–7 menit — sekecil apa pun diff-nya.

---

## 11. Fitur lanjutan yang mau dikerjakan berikutnya

**Status: belum ada satu baris kode pun, dan spesifikasinya belum ditulis.** Bagian ini memisahkan apa yang *sudah pasti* dari apa yang *masih harus diputuskan*.

### 11.1 Yang sudah pasti

Pemilik proyek menyebut ini sebagai "fitur lanjutan yang belum ada" dan langkah pertamanya adalah **menaruh aset gambar**. Ia juga menyatakan audio akan dicari sumbernya nanti, boleh dari internet, asalkan jelas lisensinya.

Keputusan yang sudah diambil (17 Okt 2026):

- Aset runtime masuk ke **`public/`**, bukan `src/assets/`.
- Pola yang disepakati: `public/stabilo/` untuk sprite karakter, satu berkas per ekspresi, `.webp` dengan alpha, digambar 2× ukuran tampil, nama berkas huruf kecil tanpa spasi.
- Sumber master (PSD/AI/PNG resolusi penuh) **di luar bundel**, mis. `design/`, dan tidak masuk `public/`.
- Audio nanti di `public/audio/` dengan pola yang sama.

### 11.2 Yang tersirat dari audit, tapi belum dikonfirmasi

Pada audit read-only sebelumnya, pemilik proyek menanyakan hal-hal berikut. Ini **indikasi arah**, bukan spesifikasi:

- karakter bernama **Stabilo**, dengan **beberapa ekspresi**;
- kekhawatiran soal **luminans / risiko jumpscare** (artinya mungkin ada momen mengejutkan — perlu kebijakan, bukan cuma art);
- kebutuhan **sumber 2x / PSD**;
- **audio** (klip, pemicu, pengaturan volume);
- komponen **percakapan / dialog** — ia menyebut visual novel, efek ketik, dan tombol pilihan;
- **event harian** (apa yang memicu kemunculan karakter);
- label tur yang perlu diperbarui bila fitur ini menambah layar.

**Jangan menganggap daftar ini spesifikasi.** Sebelum menulis kode, konfirmasi ke pemilik proyek.

### 11.3 Pertanyaan yang harus dijawab sebelum kode

1. Karakter muncul **di mana**: mengambang di atas layar yang sudah ada, di satu rute sendiri, atau hanya di momen tertentu?
2. **Dipicu apa**: pembukaan aplikasi, penyelesaian blok, blok terlewat, pembukaan jurnal, acak, atau kombinasi?
3. Apakah ada **dialog**? Kalau ya: berapa baris, siapa yang "berbicara", apakah pemain memilih?
4. Apakah ada **momen mengejutkan**? Kalau ada, bagaimana ia berinteraksi dengan `prefers-reduced-motion`, dan apakah pengguna bisa mematikannya? Ini keputusan kebijakan, bukan estetika.
5. **Berapa ekspresi** yang dibutuhkan, dan adakah yang khusus tema terang/gelap?
6. Audio: berapa klip, diputar saat apa, ada kontrol volume/mute? Apakah autoplay perlu (WebView2 memblokir autoplay bersuara tanpa interaksi)?
7. Fitur ini **opsional atau selalu aktif**? Kalau selalu, bagaimana ia memengaruhi orang yang tidak menginginkannya?
8. Apakah ia harus di-cover tur, dan apakah tur jadi 15+ langkah?

### 11.4 Batasan teknis yang akan langsung terasa

| Batasan | Fakta |
|---|---|
| Ruang installer | 1,7 MB (exe) sekarang. Payload frontend hanya 343,3 KB gzip / 1.142,6 KB mentah (12 berkas, diukur 16 Okt 2026). Setiap gambar dan audio menambah langsung ke installer. Anggaran wajar: tiap sprite 100–200 KB. |
| Tidak ada infrastruktur audio | Nol berkas audio, nol `new Audio`, nol `AudioContext`, nol setelan volume di seluruh repo. Semuanya harus dibangun dari nol. |
| Tidak ada event bus | Titik sambung yang ada: aksi di `store.ts` (baris 111–139) dan `ensureRange` (213-214). Tidak ada pub/sub, tidak ada emitter. |
| Tanggal Hari ini beku saat mount | `today-screen.tsx:33` — `useState(() => todayISO(Date.now()))`. Jendela yang dibiarkan terbuka melewati tengah malam akan tetap menampilkan kemarin. Fitur "event harian" butuh jam pergantian hari; ini belum ada. |
| Tidak ada konsep "akhir hari" | `dayEnd` (`"21:30"`) hanya batas penjadwalan, bukan pemicu apa pun. |
| Plafon z-index | Di atas `z-50`; preseden layar penuh repo ini `z-90` (`focus-complete.tsx:43`), tur `z-[70]`. |
| `deferred` bukan status tutup maupun selesai | Status `deferred` tidak memenuhi `isOpen` maupun `isSettled` — hati-hati kalau logika pemicu menghitung "blok yang belum selesai". |
| Progres tur hanya boolean | `tourCompleted` tidak menyimpan langkah terakhir; `tour-store.ts` hidup di memori. |
| CSP masih `null` | Aset lokal aman sekarang. Kalau CSP diperketat nanti, `media-src` dan `img-src` `'self'` harus diingat. |
| `prefers-reduced-motion` global | `globals.css:215-223`. Apa pun yang bergerak wajib menghormatinya. |
| Web build tidak boleh rusak | Aset di `public/` berlaku untuk web dan desktop sekaligus — ini alasan lain memilih `public/`. |

### 11.5 Di mana asetnya ditaruh (jawaban final)

```
public/
  stabilo/
    neutral.webp        # 600×900 (ditampilkan 300×450)
    happy.webp
    annoyed.webp
    ...
  audio/
    <nama-klip>.mp3     # atau .ogg
```

Alasan singkat: `public/` disalin apa adanya ke `out/`, lalu `out/` dibungkus Tauri (`frontendDist: "../out"`), jadi `/stabilo/neutral.webp` berfungsi di `tauri dev` maupun di aplikasi terpasang. `images: { unoptimized: true }` (`next.config.ts:52`) berarti tidak ada optimasi gambar — kompres sendiri, pakai `<img>` biasa dengan `width`/`height` eksplisit. Jangan taruh art di `src-tauri/` (itu untuk sisi Rust dan ikon aplikasi).

Catatan: `public/` saat ini hanya berisi lima SVG bawaan Next yang tidak dipakai (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`). Tidak ada satu pun aset gambar produk di sana. `flexstudy-logo-1024.png` di root repo **tidak ikut ter-bundle** — ia hanya sumber untuk `npx tauri icon` (dijelaskan `README.md:142`).

### 11.6 Status implementasi Fase 1 (17 Okt 2026)

Sudah dibangun dan lolos `tsc`, ESLint, `npm run build`, serta 161 uji (139 lama + 22 baru):

| Bagian | Berkas |
|---|---|
| Layar bahasa, sebelum IntroGate | `src/features/language/language-gate.tsx`, `app-boundary.tsx` |
| Mesin dialog murni (tangga ph1–ph3, `sweet` tanpa eskalasi) | `src/features/stabilo/engine/dialogue.ts` |
| Mesin ketik + lip-flap + jeda tanda baca | `engine/typewriter.ts` |
| Interpolasi `{{token}}` | `engine/text.ts` |
| Naskah id & en (node id identik) | `script/id.ts`, `script/en.ts` |
| Kontrak aset + placeholder | `assets.ts`, `ui/Sprite.tsx` |
| Kotak dialog, gauge, efek | `ui/DialogueBox.tsx`, `ui/Gauge.tsx`, `stabilo.css` |
| Orkestrasi: sorotan, navigasi, kuis, simpan kemajuan | `StabiloHost.tsx` |
| Preferensi di tabel `meta` (kunci `stabilo`) + ikut ekspor/impor | `domain/types.ts`, `data/repository.ts`, `data/schema.ts`, `data/store.ts` |
| Panel Atur → Stabilo | `settings-screen.tsx` |

**Enam koreksi yang diminta sudah masuk:** `data-tour="shift"` di `today-screen.tsx`, `useI18n` memakai cermin `flexstudy.locale` selama hidrasi, interpolasi `{{...}}`, preferensi di `meta` + ikut ekspor, tanpa rujukan ke `src/lib/backup.ts` atau dokumen yang tidak ada, dan `Ctrl+Shift+S` tidak dipakai.

**Penyimpangan yang disengaja:**
- Kuis Q3 memakai `choice`, bukan `point` — hit-test elemen hidup ditunda ke Fase 3 sesuai kesepakatan.
- S05 (pertanyaan suara) belum ada karena audio baru masuk Fase 3; tanpa audio, pertanyaannya akan jadi janji kosong.
- Perkenalan **tidak** dipaksakan pada pengguna yang sudah menyelesaikan onboarding; ia tersedia lewat Atur → Stabilo.
- Tangga `ph1–ph3` di luar tur (Fase 2) belum ada, karena `DayClock` belum ada.

**Yang belum bisa dilihat:** belum ada satu pun berkas gambar. Di `npm run dev` tampil siluet placeholder berlabel; di build produksi, kegagalan memuat aset inti menyembunyikan Stabilo dan tur jatuh kembali ke versi klasik. Karena itu Fase 1 belum bisa dinilai secara visual sampai aset masuk ke `public/stabilo/` dengan nama yang terdaftar di `assets.ts`.

### 11.7 Rilis 0.5.0 — aset dan audio

**Aset.** Sebelas berkas `.webp` 1670×1670 dengan kanal alpha ada di `public/stabilo/`, total ± 953 KB. Nama sesuai `assets.ts`, termasuk `scaryClose`, `ph4`, dan `ph5`.

Aslinya hanya `stabilo_flat.png` yang diekspor dengan transparansi; sepuluh sisanya JPG (JPEG tidak punya kanal alpha) dengan latar hitam pekat. Alpha direkonstruksi dengan memakai kanal alpha `flat` sebagai topeng siluet — semua ekspresi memakai kanvas dan pose yang sama. **Keterbatasan yang diketahui:** tanda yang berada di luar siluet tubuh ikut hilang, mis. tanda tanya mengambang di `ph2`. Kalau itu penting, ekspor ulang kesepuluhnya sebagai PNG ber-alpha lalu jalankan ulang konversi. Sumber asli disimpan di `design/stabilo-source/` (di luar `public/`, jadi tidak ikut installer).

**Audio.** Enam klip OGG CC0 dari Kenney "Interface Sounds" ada di `public/audio/`, total 39 KB, provenance di `public/audio/LICENSE.txt`. Disambungkan lewat `src/features/stabilo/audio.ts`: malas (tidak ada unduhan sampai diputar), volume 0 / 0,35 / 0,7, dan `play()` yang gagal dibiarkan senyap. Preferensi `sound` bawaannya `"normal"`, kontrolnya di Atur → Stabilo.

**Belum dikerjakan dari Fase 3:** izin gestur eksplisit (sekarang mengandalkan `play()` yang menolak sendiri), dan stinger ph5 (masih di balik `STABILO_FULL_HORROR = false`).

### 11.8 Rilis 0.5.1 — satu pemandu, satu panggung

**Tabrakan yang diperbaiki.** Sebelumnya tur klasik (`features/tour/`) dan Stabilo (`features/stabilo/`) punya status sendiri-sendiri dan bisa terbuka bersamaan: `AppShell` memulai tur klasik 700 ms setelah layar Hari ini tampil, sementara `StabiloHost` juga membuka turnya sendiri. Hasilnya dua scrim (layar jadi dua kali lebih gelap), dua sorotan, dan dua listener `keydown` — menekan Enter memajukan kedua kartu. Sekarang:

- `src/features/guide/guide-coordinator.ts` adalah satu-satunya pintu masuk: `showStabilo(flow)` menutup tur klasik lebih dulu, `showClassicTour()` menutup Stabilo lebih dulu. Semua pemanggil (Panduan, Atur, fallback aset, alur pertama) lewat sini.
- `GuidedTour` membaca `useStabiloHost().flow` dan berhenti menggambar *serta* berhenti mendengarkan tombol selama Stabilo aktif.
- `AppShell` tidak memulai tur klasik selama `stabilo.enabled`; tur klasik tetap menjadi fallback saat karakternya dimatikan atau asetnya gagal dimuat.
- Menyelesaikan tur Stabilo juga menulis `settings.tourCompleted = true`, supaya mematikan karakter di kemudian hari tidak memunculkan tur 14 langkah yang belum pernah dilihat.

**Panggung tetap.** Posisi dialog tidak lagi berpindah atas/bawah mengikuti target (`placeTop` dihapus). Kotak dialog selalu di bawah-tengah, karakternya di slot kanan panggung yang sama, rata bawah dengan kotak — ia tidak lagi muncul di tengah layar dan tidak berpindah antar baris. Sorotan tidak lagi memakai `scrollIntoView({ block: "center" })`; `scrollIntoBand()` menggeser target ke bagian jendela yang tidak tertutup panggung, jadi kartu tidak menimpa elemen yang sedang dijelaskan. Overlay juga tidak lagi di-unmount saat target sedang diukur — itu penyebab layar berkedip di setiap perpindahan halaman.

**Suara.** `src/features/stabilo/ambience.ts` menambahkan lapisan kontinu yang sebelumnya tidak ada: pad pelan (tiga osilator + filter yang bernapas) dan melodi kotak musik pentatonik, disintesis dengan Web Audio, bukan berkas loop — loop yang cukup panjang agar tidak terasa berulang akan memakan megabyte di installer. Ditambah `voiceBlip()` tiap tiga karakter saat mengetik. Semua konstanta rasa ada di berkas itu; `sound: "off"` mematikan keduanya.

**Kategori di dalam form blok.** `features/plan/category-picker.tsx` menambahkan pembuatan kategori langsung dari form blok (nama + lambang, target awal 5 jam), dan `saveCategory` sekarang mengembalikan id supaya kategori baru langsung terpilih. Saat panel itu dibuka, `StabiloAside` tampil di dalam sheet — bentuk kecil tanpa scrim, bukan dialog penuh — dengan tautan "Ambil dari nama blok". `BlockListEditor` tidak lagi menonaktifkan "Blok baru" ketika daftar kategori kosong.

### 11.9 Rilis 0.5.2 — tur yang tahu keadaan layar

**Kenapa tur tidak muncul sendiri.** Syaratnya dulu `onboardingCompleted && introSeen && !tourDone`. Profil yang di-upgrade dari 0.4.x sudah `onboardingCompleted` tetapi belum pernah melihat perkenalan, jadi `introSeen` tetap `false` — dan kedua cabang auto-open tidak terpenuhi. Tur hanya bisa dibuka manual. Sekarang cabang tur cukup `onboardingCompleted && !tourDone`; perkenalan tetap hanya untuk pemasangan baru.

**Tur membaca keadaan, bukan mengasumsikan.** `scriptFor()` menerima `TourContext { hasBlocks }` dan memilih `TOUR_*_EMPTY` bila hari ini belum punya blok. Hanya tiga simpul yang berbeda (`t02`, `t02b`, `q1`): targetnya `[data-tour="first-block"]` — tombol **Buat blok pertama** di empty state, yang sebelumnya tidak punya penanda — dan kuisnya menanyakan tombol itu, bukan tombol Mulai fokus yang belum ada. Sebelumnya langkah pertama menyorot `[data-tour="focus"]` yang hanya dirender `FocusCard`; tanpa blok, sorotan tidak punya elemen dan layar hanya jadi gelap.

**Ekspresi.** `visualPhaseFor()` di `engine/dialogue.ts` memisahkan wajah dari tangga fase. Di `sweet` tangga memang sengaja beku, dan itu membuat jawaban salah tampak tidak bereaksi sama sekali; sekarang wajahnya tetap berubah satu langkah setelah salah kedua, tanpa pernah masuk frame yang menyeramkan. Di `spooky` wajah mengikuti `state.phase` seperti sebelumnya.

**Getaran.** `stabilo-recoil` adalah sentakan satu kali pada setiap jawaban salah (berlaku di kedua temperamen, karena animasi kelas hanya jalan sekali per mount, wadah sprite di-*key* dengan `wrongRun`). `stabilo-tremble-soft` / `stabilo-tremble-hard` menahan getaran selama fase 2 / 3. Semuanya dimatikan `prefers-reduced-motion` dan preferensi `fx`.

**Catatan aset.** Perbedaan `flat` → `ph1` → `ph3` ada di lengkung mulut, sangat halus pada tinggi 170–215 px. Karena itu getaran dan sentakan bukan hiasan: itulah yang membuat perubahan fase terbaca.

---

## 12. Pekerjaan terbuka (belum dikerjakan, sudah diketahui)

| Item | Status |
|---|---|
| Hapus MIGRATION BRIDGE `globals.css:73-108` | ~188 pemakaian token lama masih ada |
| Perketat `csp: null` | Belum; perlu uji ulang aplikasi setelahnya |
| Ganti Base UI di `dialog.tsx` / `toast.tsx` | Paket pengganti (`@radix-ui/*`, `vaul`, `sonner`) sudah terpasang, migrasi belum |
| `npm audit` | **9 high severity** (terverifikasi 17 Okt 2026), rantai `shadcn` → `ts-morph` → `@ts-morph/common` → `fast-glob`. Perkakas build, bukan runtime aplikasi — tapi belum dibereskan |
| Tanda tangan installer | Belum. SmartScreen akan memperingatkan |
| Plugin `updater` | Belum aktif; butuh keypair |
| Hapus blok dari linimasa Hari ini | Belum ada |
| PWA / service worker | Belum; pengingat hanya jalan saat aplikasi terbuka |
| Ekspor `.ics`, mode fokus layar penuh | Belum |
| Sinkronisasi multi-perangkat | Belum (ekspor/impor JSON satu-satunya jalur) |
| Lapisan tool untuk agen (fase 4 brief) | Fondasi siap: skema Zod, fungsi domain murni, `ShiftEvent`, ekspor/impor |
| Anggaran JS ≤ 150 KB gzip | **Belum terbukti.** README menyebut baseline ± 129 KB gzip; pengukuran `out/` 16 Okt menghasilkan 343,3 KB gzip untuk 12 berkas awal. Selisih ini **belum dijelaskan** — jangan pakai salah satunya sebagai kebenaran sebelum diukur ulang per rute |

---

## 13. Yang belum diverifikasi (jangan diklaim sudah diuji)

Yang **sudah** terverifikasi otomatis: `tsc`, ESLint, 139 uji unit, build web, build desktop, build installer, checksum installer.

Yang **belum** dan butuh mata manusia:

- arsip jurnal dua tingkat (kepadatan, indentasi, baris tahun dengan jumlah entri & favorit, pencarian membuka kedua tingkat);
- susunan kontrol intro di panel Tampilan, mode *Setiap buka*, dan tombol *Putar sekarang* saat pilihannya *Mati*;
- riak pada *Mulai fokus*, dan layar penuh saat waktu habis di kedua tema;
- angka di layar Rekap;
- strip 14 titik tur, dan sorotan tur jatuh tepat di elemen yang dimaksud;
- penanda "sekarang" tidak lagi tertutup sidebar;
- tiga lebar konten;
- seluruh fitur karakter/audio (belum ada).

Metrik yang **belum diukur**: RAM saat diam, RAM saat timer jalan, waktu buka dingin, CPU saat diam, Lighthouse, axe, ukuran JS per rute.

---

## 14. Jebakan yang sudah memakan waktu (baca ini sebelum mulai)

1. **Naikkan versi sebelum build.** Windows Installer mengenali produk dari versinya; memasang versi yang sama menawarkan Repair/Remove, bukan mengganti. Naikkan di **tiga** tempat + `package-lock.json` root.
2. **Setiap kenaikan versi = relink Rust penuh, 5–7 menit.** Bukan tanda ada yang salah.
3. **Jangan mem-pipe build panjang.** `npm run tauri build | Select-Object -Last 25` menahan seluruh output di buffer; kalau prosesnya dibunuh, tidak ada jejak diagnostik sama sekali. Alihkan ke berkas log.
4. **`git ls-files <folder>` bisa mengembalikan kosong** di git bawaan sandbox ini meski foldernya dilacak. Pakai `git ls-tree -r HEAD <folder>` untuk memastikan. (Kesalahan ini pernah membuat saya menyimpulkan `installers/` tidak dilacak — padahal dilacak.)
5. **`git push` bisa gagal** dengan `schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS` → tambahkan `-c http.sslBackend=openssl`.
6. **Kalau muncul `sh.exe: *** fatal error - NtCreateDirectoryObject(...): 0xC0000022`**, itu keadaan sesi sandbox, bukan perintah yang salah. Ulangi dari sesi shell baru.
7. **Hapus ke Recycle Bin butuh** `Add-Type -AssemblyName Microsoft.VisualBasic` lebih dulu; tanpa itu penghapusan gagal diam-diam.
8. **`installers/` dilacak git.** Ganti installer = ganti blob biner; repo tumbuh permanen.
9. **Tauri menambal exe per jenis bundel** (`Info Patching … FlexStudy.exe with bundle type information: msi`). Karena itu exe terpasang bisa berbeda 3 byte dari `target/release/FlexStudy.exe` — bukan korupsi.
10. **`npm run build` (web) dan `npm run build:desktop` berbeda jalur.** Jangan menguji satu lalu menyimpulkan yang lain.
11. **Jangan mengubah `src/domain/` menjadi tidak murni** hanya untuk mempercepat satu fitur. Itu merusak fondasi pengujian dan rencana lapisan agen.
12. **`AGENTS.md` ditulis ulang otomatis oleh `next dev`.** Jangan hapus bloknya dari diff.

---

## 15. Cara memakai dokumen ini

Kalau kamu AI penerus, urutan yang aman:

1. Baca §3 (aturan), §5 (peta berkas), §11 (fitur berikutnya).
2. Verifikasi keadaan: `git log -1`, `npm test`, cek versi di tiga tempat.
3. **Jangan menulis kode fitur karakter sebelum §11.3 dijawab pemilik proyek.** Yang paling aman dikerjakan lebih dulu adalah aset dan struktur folder, karena itu tidak mengubah perilaku aplikasi.
4. Sebelum commit: `tsc` bersih, ESLint bersih, 139+ uji lulus, build web lulus, build desktop lulus.
5. Kalau menyentuh versi rilis: naikkan versi, build, salin installer ke `installers/`, perbarui checksum, perbarui README, commit, push.
6. Perbarui dokumen ini kalau ada keputusan baru. Ia hanya berguna selama jujur.

### Prompt siap pakai untuk AI penerus

> Kamu melanjutkan proyek FlexStudy v2 di `C:\laragon\www\flexstudy-dashboard` (branch `feat/desktop-tauri`, versi 0.4.1). Baca `AI-HANDOFF.md` dan `README.md` lebih dulu. Patuhi aturan di §3 handoff — terutama: jangan menambah Electron/Node runtime, build web Vercel harus tetap jalan, hanya `src/lib/desktop.ts` yang boleh mengimpor `@tauri-apps/*`, `src/domain/` harus tetap murni, token desain hanya di `src/app/globals.css`. Tugas berikutnya adalah fitur lanjutan "Stabilo" (karakter + ekspresi + audio). Spesifikasinya **belum ada**: mulai dengan menanyakan delapan pertanyaan di §11.3, jangan mengarang jawabannya. Aset gambar akan ditaruh di `public/stabilo/`, audio di `public/audio/`. Jangan mengklaim sesuatu sudah diuji visual kalau belum dilihat.
