# Catatan Rilis

Semua tanggal memakai waktu lokal pengembang (WIB). Berkas installer ada di folder
`installers/` dan ikut tersimpan di repositori ini, jadi tautan di bawah bisa
diunduh langsung dari GitHub.

---

## 0.5.2 — 18 Oktober 2026

Tur sekarang muncul sendiri, tahu apakah hari ini sudah punya blok, dan Stabilo
benar-benar bereaksi saat kamu salah menjawab.

### Yang diperbaiki

- **Tur muncul otomatis lagi.** Syaratnya dulu meminta perkenalan sudah dilihat
  *dan* onboarding selesai. Profil yang di-upgrade dari 0.4.x sudah menyelesaikan
  onboarding tetapi belum pernah melihat perkenalan, jadi kedua cabang auto-open
  tidak terpenuhi dan tur hanya bisa dibuka manual. Sekarang cukup onboarding
  selesai dan tur belum pernah dituntaskan.
- **Sorotan ada di langkah pertama.** Langkah "blok pertamamu" menyorot kartu fokus
  yang hanya dirender kalau sudah ada blok; tanpa blok, tidak ada elemen untuk
  disorot dan layar hanya menggelap. Tur sekarang membaca keadaan: kalau hari ini
  kosong, ia menyorot tombol **Buat blok pertama** dan kuisnya menanyakan tombol
  itu — bukan tombol Mulai fokus yang belum ada.
- **Ekspresi berubah saat salah menjawab.** Di mode *Manis*, tangga fase memang
  sengaja beku, dan itu membuat jawaban salah tampak tidak bereaksi sama sekali.
  Sekarang wajahnya tetap berubah satu langkah setelah salah kedua, tanpa pernah
  masuk frame yang menyeramkan. Di mode *Seram ringan* wajah mengikuti fase
  seperti sebelumnya, dan ada sentakan singkat pada **setiap** jawaban salah.
- **Getaran di fase 2 dan 3.** Selama Stabilo kesal, gambarnya ikut bergetar —
  lebih kuat dan lebih cepat di fase 3. Mengikuti preferensi *Efek getar & glitch*
  dan `prefers-reduced-motion`.

### Pemasangan

| Berkas | Ukuran | Untuk siapa |
|---|---|---|
| `FlexStudy_0.5.2_x64-setup.exe` | 2.615.776 B (2,49 MiB) | **Disarankan.** Terpasang per pengguna, tidak butuh hak admin |
| `FlexStudy_0.5.2_x64_en-US.msi` | 3.141.632 B (3,00 MiB) | Terpasang mesin-luas di `Program Files`, butuh admin |

```text
A6B821C279A34085D8D0D7FE88FFEDBE129BEEF2E2E6A93E9DD9B6DE5FA6A401  FlexStudy_0.5.2_x64-setup.exe
9730D0294DFC7DBB5B9C09EC89126C3F97893F982E121FA8FC17ECE4A8A66AE9  FlexStudy_0.5.2_x64_en-US.msi
```

### Yang perlu diketahui

- **Profil yang sudah pernah menuntaskan tur tidak akan melihatnya lagi secara
  otomatis** — itu memang disengaja. Untuk memutarnya lagi: **Atur → Stabilo →
  Putar tur interaktif**, atau **Atur ulang kemajuan**.
- **Installer belum ditandatangani**; SmartScreen akan memperingatkan.
- Perubahan wajah antar-fase halus (perbedaannya di lengkung mulut), jadi getaran
  dan sentakan adalah penanda yang sebenarnya — keduanya belum pernah dilihat
  berjalan di layar sungguhan.

---

## 0.5.1 — 18 Oktober 2026

Rilis ini membereskan hal yang paling mengganggu di 0.5.0: dua pemandu yang muncul
bersamaan, dan karakter yang berpindah-pindah tempat. Sekalian, bagian yang
sebelumnya terasa kosong — musik dan suara saat berbicara — sekarang terisi.

### Yang diperbaiki

- **Tur klasik dan Stabilo tidak pernah lagi tampil bersamaan.** Sebelumnya
  keduanya punya status sendiri dan sama-sama terbuka otomatis: layar jadi dua
  kali lebih gelap, ada dua sorotan, dan menekan Enter memajukan kedua kartu.
  Sekarang ada satu pintu masuk (`guide-coordinator.ts`): meminta Stabilo menutup
  tur klasik, meminta tur klasik menutup Stabilo. Selama Stabilo aktif, tur klasik
  tidak dimulai otomatis sama sekali.
- **Posisi karakter tidak berubah-ubah lagi.** Dialog selalu di bawah-tengah dan
  Stabilo selalu di slot kanan panggung yang sama, rata bawah dengan kotak dialog.
  Sebelumnya kotak berpindah atas/bawah mengikuti target, jadi karakternya
  terlihat melompat dan kadang berdiri di tengah layar.
- **Kartu tidak lagi menimpa yang sedang dijelaskan.** Sorotan menggeser target ke
  bagian jendela yang tidak tertutup panggung, bukan menaruhnya di tengah viewport.
  Tur klasik (versi cadangan) juga tidak lagi mendarat di tengah panel lebar.
- **Tidak ada kedipan antar-layar.** Overlay tidak lagi dilepas saat target sedang
  diukur, jadi perpindahan halaman tidak memperlihatkan halaman kosong sekejap.
- **Menyelesaikan tur Stabilo menandai tur selesai.** Kalau nanti karakternya
  dimatikan, tur 14 langkah tidak muncul lagi seolah belum pernah dilihat.

### Yang baru

- **Musik latar dan suara ketikan.** Lapisan ambience (pad pelan dan melodi kotak
  musik) disintesis langsung dengan Web Audio, bukan berkas loop, ditambah bunyi
  halus tiap tiga karakter saat dialog ditulis. Ikut aturan Suara: *Tanpa suara*,
  *Pelan*, atau *Normal*.
- **Kategori baru langsung dari form blok.** Tombol **Kategori baru** di samping
  pilihan kategori membuka nama dan lambang di tempat; kategori langsung tersimpan
  dan terpilih. Saat panel itu terbuka, Stabilo muncul kecil di dalam form — tanpa
  scrim, tanpa menutupi isian — dan bisa mengisikan nama dari judul blok.
- **"Blok baru" tidak lagi terkunci** ketika daftar kategori kosong, karena
  kategorinya bisa dibuat dari form itu sendiri.

### Pemasangan

| Berkas | Ukuran | Untuk siapa |
|---|---|---|
| `FlexStudy_0.5.1_x64-setup.exe` | 2.615.823 B (2,49 MiB) | **Disarankan.** Terpasang per pengguna, tidak butuh hak admin |
| `FlexStudy_0.5.1_x64_en-US.msi` | 3.141.632 B (3,00 MiB) | Terpasang mesin-luas di `Program Files`, butuh admin |

```text
0D098566062DA11A107A5DC57F949F35A2052476004F880DC4F6E5A58C988812  FlexStudy_0.5.1_x64-setup.exe
E67304A82CB9BE99FAE450B671B30CAF4AB365F384922C2C4214B11BD3F1286E  FlexStudy_0.5.1_x64_en-US.msi
```

### Yang perlu diketahui

- **Installer belum ditandatangani.** SmartScreen akan memperingatkan; pilih
  *More info → Run anyway*.
- **Musik dan suara belum pernah didengar manusia.** Nada, tempo, dan campurannya
  disusun dari perhitungan. Kalau terasa terlalu ramai atau terlalu pelan, semua
  penyetelannya ada di satu berkas: `src/features/stabilo/ambience.ts`.
- **Posisi dan ukuran panggung juga belum dilihat di layar sungguhan.** Tata
  letaknya dihitung dari ukuran aset (kanvas persegi 1670×1670), bukan dari
  tangkapan layar.

---

## 0.5.0 — 18 Oktober 2026

Rilis ini menambahkan **Stabilo**: pemandu tur yang benar-benar berbicara, dengan
sorotan di layar asli, kuis pendek, dan temperamen yang bisa berubah — lalu
mengalah sendiri supaya tidak ada yang terjebak. Aplikasinya tetap sama: data
lokal, tanpa akun, tanpa server.

### Yang baru

- **Tur interaktif bersama Stabilo.** Dua belas langkah melintasi Hari ini,
  Pekan, Jurnal, Atur, dan Panduan. Setiap penjelasan punya pilihan jujur
  *Paham / Belum paham*; tiga jawaban salah beruntun membawanya ke fase kesal
  (getar, glitch, vinyet), lalu ia memberi petunjuk dan menawarkan jalan keluar.
  Melewati tur kapan saja tidak pernah dimarahi.
- **Layar bahasa di awal.** Sebelum kata pertama diucapkan, kamu memilih
  Indonesia atau English. Pilihannya dipakai seluruh aplikasi dan bisa diubah
  di Atur.
- **Nama panggilan.** Stabilo menanyakannya di dalam dialog, dan kamu bisa
  mengosongkannya. Bisa diganti kapan saja di Atur → Stabilo.
- **Intensitas.** *Manis* (tanpa getar dan glitch) atau *Seram ringan* (bawaan).
  Pilihannya ditanyakan di awal dan tersimpan.
- **Enam bunyi antarmuka** — klik, benar, salah, glitch, kemunculan, dan aksen.
  Semuanya CC0, jadi tidak ada kewajiban atribusi. Volume bisa dimatikan,
  dipelankan, atau dinormalkan di Atur → Stabilo. Bawaannya menyala.
- **Panel Atur → Stabilo**: tampilkan/sembunyikan, intensitas, efek getar,
  suara, nama panggilan, putar ulang perkenalan, putar tur, dan atur ulang
  kemajuan.
- **Animasi pembuka** kini berjalan setiap aplikasi dibuka (bawaan baru); pilihan
  *sekali saja* dan *mati* tetap ada.

### Perbaikan

- Tombol **Hari ini berantakan** punya target sorotan sendiri, jadi tur tidak
  lagi menyorot seluruh kepala halaman dua kali.
- Tombol tur di **Panduan** dan di **Atur** sama-sama memakai tur Stabilo;
  sebelumnya Panduan masih memulai tur klasik 14 langkah yang teksnya panjang.
- Kotak dialog dipadatkan dan dipersempit ke 680 px, dan Stabilo digeser ke
  kanan supaya tidak menutupi kartu yang sedang dibaca.
- Seluruh naskah Indonesia dan Inggris ditulis ulang: tanpa kalimat berkolon,
  panjangnya hampir separuh.

### Pemasangan

| Berkas | Ukuran | Untuk siapa |
|---|---|---|
| `FlexStudy_0.5.0_x64-setup.exe` | 2.611.817 B (2,49 MiB) | **Disarankan.** Terpasang per pengguna, tidak butuh hak admin |
| `FlexStudy_0.5.0_x64_en-US.msi` | 3.137.536 B (2,99 MiB) | Terpasang mesin-luas di `Program Files`, butuh admin |

Pilih satu format dan pakai konsisten — keduanya menghasilkan pemasangan yang
terpisah, jadi memasang keduanya berarti punya dua aplikasi.

```
3081EDE68CE83E51B205D413B9D36A60986C957BEFB92C6FF32F71A302EAF5F2  FlexStudy_0.5.0_x64-setup.exe
6AAC07189FB274AF4A430EFC051EAB4DB606998590C6243DCC9462B2BBC0CE7A  FlexStudy_0.5.0_x64_en-US.msi
```

Kebutuhan: Windows 10/11 64-bit dengan WebView2 (sudah ada di Windows 11 dan
sebagian besar Windows 10; kalau belum, installer resmi Microsoft memasangnya).

### Yang perlu diketahui

- **Installer belum ditandatangani.** Windows SmartScreen akan menampilkan
  peringatan "Unknown publisher". Pilih *More info* → *Run anyway*. Sertifikat
  code signing berbayar, jadi ini disengaja untuk sekarang.
- **Pemasangan lama tidak berubah setelannya.** Bawaan baru (animasi setiap buka,
  suara menyala) hanya berlaku untuk pemasangan bersih. Untuk profil lama, ubah
  di Atur → Tampilan dan Atur → Stabilo → Suara.
- **Satu tanda pada ekspresi `ph2` hilang.** Sepuluh dari sebelas gambar asli
  dikirim sebagai JPG, yang tidak punya kanal transparansi; alpha-nya
  direkonstruksi dari siluet `stabilo_flat`. Akibatnya tanda tanya yang
  mengambang di luar tubuh tidak ikut. Sumber aslinya tersimpan di
  `design/stabilo-source/` bila ingin diekspor ulang sebagai PNG.
- **Stabilo belum diuji secara visual oleh pengembang** sebelum rilis ini.
  Logika, tipe, dan 161 uji lolos; tata letak di layar belum.

### Pengujian

`tsc` bersih, ESLint bersih, 161 uji unit lulus (11 berkas), build web, build
desktop, dan kedua installer berhasil dibuat.

---

## 0.4.1 — 17 Oktober 2026

- Arsip jurnal dua tingkat: tahun, lalu bulan di dalamnya, dengan jumlah entri
  dan favorit pada baris tahun.

## 0.4.0 — 16 Oktober 2026

- Pencarian dan penanda favorit di jurnal.
- Halaman **Rekap** bulan/tahun seperti raport, dengan target diprorata.
- Gerak pada timer: riak saat *Mulai fokus* dan layar penuh saat waktu habis.
- Animasi pembuka yang bisa diatur: sekali saja, setiap buka, atau mati.
- 139 uji unit; halaman Panduan dan tur terpandu 14 langkah.
