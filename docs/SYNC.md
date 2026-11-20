# Akun & sinkronisasi (Supabase)

Login di FlexStudy **opsional**. Tanpa akun, aplikasi tetap berjalan penuh dan semua data tinggal di perangkat (IndexedDB). Akun hanya dipakai untuk menyinkronkan data antara PC dan Android.

## Cara kerjanya

- **Local-first.** Setiap perangkat tetap memakai IndexedDB sebagai sumber utama. Server hanya menyimpan salinan bersama.
- **Satu tabel `sync_rows`** berisi semua data per user: kategori, template, blok, jurnal, riwayat geser jadwal, dan sebagian setelan.
- **Last write wins per baris.** Kalau dua perangkat mengubah blok yang sama, versi dengan `updatedAt` terbaru yang dipakai. Keputusannya ada di server (`push_sync_rows`), bukan di klien.
- **Realtime.** Perubahan lokal dikirim setelah ±300 ms (beberapa ketikan digabung jadi satu tulisan), lalu Supabase Realtime meneruskannya ke perangkat lain. Timer yang dimulai di PC muncul di HP dalam waktu kurang dari satu detik pada koneksi normal.
- **Offline aman.** Perubahan saat offline tetap tersimpan lokal dan dikirim saat online lagi, dengan coba ulang otomatis (2 s → 60 s).
- **Login pertama di perangkat yang sudah punya data.** Aplikasi bertanya: *pakai data akun* (cocok untuk HP baru) atau *gabungkan keduanya*.
- **Yang tidak ikut sinkron:** tema, bahasa, animasi, lebar konten, status onboarding, sakelar notifikasi dan alarm. Itu urusan masing-masing layar dan OS.

Kode ada di:

| Berkas | Isi |
|---|---|
| `src/domain/sync.ts` | Logika murni: baris, hash, `planSync`, id blok deterministik, pembersih duplikat |
| `src/data/sync/engine.ts` | Loop sinkronisasi (pull, push, realtime, coba ulang). Tidak mengenal Supabase maupun React |
| `src/data/sync/supabase.ts` | Satu-satunya modul yang memanggil Supabase. Diimpor secara dinamis |
| `src/data/sync/sync-store.ts` | Penghubung ke store aplikasi dan state UI login |
| `src/features/settings/sync-panel.tsx` | Panel Atur → Akun & sinkronisasi |
| `supabase/migrations/0001_flexstudy_sync.sql` | Tabel, RLS, fungsi push, realtime |
| `supabase/migrations/0002_sync_rows_grants.sql` | Izin tabel untuk user login (wajib di project baru) |
| `supabase/config.toml`, `supabase/templates/` | Pengaturan Auth, SMTP, dan email kode |
| `tests/sync.test.ts`, `tests/sync-engine.test.ts` | Unit test dan simulasi dua perangkat |

## Setup (sekali saja, lewat CLI)

Semua pengaturan server ada di repo (`supabase/`), jadi project baru cukup disiapkan dari terminal.

1. `npx supabase login`, lalu buat project (atau pakai yang sudah ada) dan tautkan:

   ```
   npx supabase link --project-ref <ref>
   npx supabase db push --remote        # migration 0001 (tabel, RLS, realtime) + 0002 (izin tabel)
   ```

   Migration 0002 wajib: project Supabase baru tidak lagi memberi izin tabel ke role API secara otomatis. Tanpanya login berhasil tapi setiap sinkron gagal dengan "permission denied".

2. Isi `.env.local` (tidak ikut git):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...   # publishable key, aman di klien
   SUPABASE_AUTH_SMTP_USER=akun@gmail.com              # pengirim email kode
   SUPABASE_AUTH_SMTP_PASS=sandiaplikasi16huruf        # Google App Password, tanpa spasi
   ```

   Sandi aplikasi dibuat di <https://myaccount.google.com/apppasswords> (butuh Verifikasi 2 Langkah aktif).

3. Kirim pengaturan Auth (SMTP, template email kode, masa berlaku 10 menit, kode 6 digit, batas 30 email/jam):

   ```
   set -a; . ./.env.local; set +a        # Git Bash: muat variabel SMTP ke shell
   npx supabase config diff               # tinjau dulu
   npx supabase config push --yes
   ```

   Supabase gratis menolak template email kustom selama masih memakai pengirim bawaannya, jadi SMTP harus aktif bersamaan dengan template. Template ada di `supabase/templates/`; judul email memuat kodenya langsung.

4. Jalankan ulang `npm run dev`. Build Tauri membaca `NEXT_PUBLIC_*` saat `npm run build:desktop`, jadi `.env.local` harus terisi sebelum build.

Catatan:
- *Publishable/anon key* memang untuk klien. Yang menjaga data tiap orang tetap privat adalah RLS di `sync_rows`. Jangan pernah memasukkan *secret/service_role key* ke aplikasi.
- Mengetes dari HP di Wi-Fi yang sama: `npm run dev -- -H 0.0.0.0`, buka `http://<IP-laptop>:3000`. `next.config.ts` otomatis mengizinkan IP laptop sebagai origin dev.

## Catatan untuk versi Android

Logika sinkronisasi tidak bergantung pada Tauri, jadi build Android (Tauri mobile atau WebView lain) cukup memakai kode yang sama dan `.env.local` yang sama. Login dengan kode OTP tidak butuh deep link atau redirect. Saat aplikasi kembali dari background, sinkron langsung menarik perubahan yang terlewat (lihat `hookResume` di `sync-store.ts`).
