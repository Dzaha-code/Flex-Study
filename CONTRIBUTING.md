# Berkontribusi

Terima kasih sudah mampir. FlexStudy adalah aplikasi kecil dengan aturan yang
cukup ketat, dan hampir semuanya berasal dari keputusan yang sudah dibayar
mahal. Dokumen ini menjelaskan cara kerja di dalamnya tanpa merusak apa pun.

## Menyiapkan

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 273 uji, ± 2–5 detik
```

Butuh Node.js 22+. Untuk aplikasi desktop dan Android, lihat **Menjalankan** di
[README.md](README.md).

## Sebelum membuka pull request

Semua ini harus lulus di mesin Anda. Tidak ada CI yang menjalankannya untuk Anda.

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Kalau perubahan menyentuh jalur desktop (`src-tauri/`, `src/lib/desktop.ts`),
jalankan juga `npm run build:desktop` dan, bila memungkinkan, `npm run tauri dev`.

## Aturan kode yang tidak boleh dilanggar

1. **`src/domain/` tetap murni.** Tanpa React, tanpa storage, tanpa membaca jam
   sendiri — waktu dan pembuat id selalu argumen. Ini yang membuat logikanya
   bisa diuji dalam hitungan detik dan nanti dipanggil dari tempat lain.
2. **Hanya `src/lib/desktop.ts` yang boleh menyentuh `@tauri-apps/*`**, dan
   impornya dinamis. Build web Vercel harus tetap jalan tanpa perubahan.
3. **Token desain hanya di `src/app/globals.css`.** Komponen tidak menulis nilai
   heksadesimal. Satu warna aksen; status punya warnanya sendiri.
4. **Tanpa `backdrop-filter`** di jalur render, dan gerak hanya menjawab aksi
   pengguna. `prefers-reduced-motion` dipatuhi.
5. **Setiap teks baru masuk ke dua kamus** (`src/i18n/messages/id.ts` dan
   `en.ts`). Kunci yang hilang adalah galat kompilasi, bukan teks kosong.
6. **Tidak ada rahasia di repo.** Kunci, sandi, dan keystore tidak pernah masuk
   git; `.env.local`, `*.jks`, dan `*.keystore` sudah di-ignore.

Penjelasan lengkap beserta alasannya ada di [`AI-HANDOFF.md`](AI-HANDOFF.md) §3.

## Kontributor adalah manusia

Riwayat proyek ini sudah pernah memuat trailer `Co-Authored-By: Claude` dan
`Generated with Codebuff`. GitHub menghitung trailer itu ke daftar kontributor,
dan hasilnya terlihat seperti proyek yang ditulis bot — padahal tidak.

Karena itu:

- **Jangan menambahkan trailer co-author untuk agen AI.** Alat boleh membantu
  menulis kode; yang menanggung jawabannya manusia yang mengirim commit.
- Pesan commit cukup satu baris judul bergaya Conventional Commits, misalnya
  `fix(notes): keep a failed write on the queue`, ditambah isi bila perlu
  menjelaskan *mengapa*.
- Hook sudah disediakan untuk menegakkan ini:

  ```bash
  git config core.hooksPath .githooks
  ```

  Hook `commit-msg` akan menolak commit yang menyebut agen AI sebagai co-author
  atau memuat jejak `Claude-Session`. Aktifkan sekali per klon.

## Rilis

Installer tidak di-commit. Setelah build, salin hasilnya ke `installers/`
(di-ignore git) lalu:

```bash
npm run release:publish
```

Skripnya memeriksa kesamaan versi di `package.json` dan `tauri.conf.json`,
mengambil catatan rilis dari `RELEASE-NOTES.md`, dan mengunggah asetnya lewat
GitHub CLI. Butuh `gh auth login` sekali.

## Melaporkan masalah

Sertakan versi (`package.json`), sistem operasi, dan langkah yang bisa diulang.
Untuk masalah data, sebutkan apakah aplikasi sedang tersinkron ke akun — banyak
gejala hanya muncul pada kombinasi dua perangkat.
