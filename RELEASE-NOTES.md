# Catatan Rilis

Semua tanggal memakai waktu lokal pengembang (WIB). Berkas installer ada di folder
`installers/` dan ikut tersimpan di repositori ini, jadi tautan di bawah bisa
diunduh langsung dari GitHub.

---

## 0.5.5 — 18 Oktober 2026

Stabilo bisa dinyalakan sendiri di perangkat yang mematikan animasi, dan lebar konten
mengikuti jendela tanpa perlu diatur manual lagi.

### Yang diperbaiki

- **"Stabilo beku di laptop lain" akhirnya punya penjelasan.** Bukan build yang rusak:
  Windows di mesin itu melaporkan *kurangi gerak* (`prefers-reduced-motion`) tanpa
  pernah kamu pilih — biasanya karena *Animation effects* dimatikan, profil daya
  disetel "best performance", atau sesi berjalan lewat Remote Desktop. Aplikasi
  menuruti: seluruh animasi CSS berhenti dan mesin ketik diganti teks yang muncul
  sekaligus, jadi frame-nya tidak pernah berganti. Itu juga sebabnya hanya animasi
  pembuka yang masih terasa — ia memakai jalur JavaScript, bukan CSS.
- **Sekarang aplikasi mengatakannya.** Panel **Atur → Stabilo** menampilkan satu baris
  penjelasan hanya ketika sistem benar-benar meminta gerak dikurangi, jadi tidak ada
  lagi teka-teki "kenapa di sini diam".

### Yang baru

- **Saklar "Animasi tetap jalan".** Di panel yang sama, tepat di bawah efek getar.
  Bawaannya mati, jadi preferensi sistem tetap menang untuk semua orang; menyalakannya
  adalah pilihan sadar, hanya berlaku di perangkat itu, dan bisa dimatikan lagi kapan
  saja. Yang ikut hidup: napas, kedipan, getaran fase, sentakan saat salah menjawab,
  animasi kartu, dan mengetik per huruf.
- **Lebar konten otomatis penuh saat jendela dimaksimalkan.** Tidak ada lagi klik
  tombol lebar setiap kali jendela dibuka penuh. Pilihan lebar di Atur tetap tersimpan
  dan dipakai lagi begitu jendela diperkecil — mengubah ukuran jendela tidak mengedit
  pengaturanmu. Tombol lebar di navigasi menampilkan "Penuh · otomatis" selama
  maximize, dan berhenti menerima klik supaya tidak terlihat seperti tombol rusak.
- **Aplikasi desktop dibuka maksimal**, bukan 1100×740 lagi.

### Yang perlu diketahui

- Ini **maximize**, bukan fullscreen eksklusif: title bar dan taskbar tetap ada.
  Alasannya, fullscreen sejati tidak punya jalan keluar yang jelas di aplikasi desktop
  dan tidak dibutuhkan untuk tujuan awalnya — lebar penuh. Tombol **Layar penuh** yang
  lama tetap ada kalau kamu memang mau tanpa title bar.
- Saklar animasi tidak mengubah animasi pembuka. Pembuka tetap mengikuti preferensi
  sistem, karena ia bukan bagian dari Stabilo.

### Pemasangan

| Berkas | Ukuran | Untuk siapa |
|---|---|---|
| `FlexStudy_0.5.5_x64-setup.exe` | 2.620.692 B (2,50 MiB) | **Disarankan.** Terpasang per pengguna, tidak butuh hak admin |
| `FlexStudy_0.5.5_x64_en-US.msi` | 3.145.728 B (3,00 MiB) | Terpasang mesin-luas di `Program Files`, butuh admin |

```text
02A37AFD33E9A946FB2E4940EA4CAE8EABA6C601363F747F0C7AFF5FA1C78776  FlexStudy_0.5.5_x64-setup.exe
0E0FB1257B797138479408D332B26F8DD20E494BE3AA751A05A501CF8EC736B4  FlexStudy_0.5.5_x64_en-US.msi
```

---

## 0.5.4 — 18 Oktober 2026

Template benar-benar terpasang dan terlihat, kamu bisa menyimpan rencanamu sendiri
sebagai template, dan jam di header akhirnya hidup.

### Yang diperbaiki

- **Template tidak lagi terlihat "gagal terpasang".** Rencana bawaan hanya mengisi
  hari kerja, jadi menerapkannya pada Sabtu atau Minggu meninggalkan Hari ini
  kosong tanpa penjelasan. Kedua template sekarang punya satu blok akhir pekan
  (review/refleksi 30–45 menit), jadi selalu ada sesuatu di hari pertama.
- **Tidak lagi diam-diam gagal.** Tombol template di onboarding hanya maju ke
  langkah berikutnya kalau template benar-benar terpasang. Sebelumnya, kegagalan
  apa pun tetap membawa pengguna ke layar "sudah siap" yang kosong.
- **Layar "sudah siap" tidak lagi berbohong.** Kalau yang dipilih template kosong,
  judulnya "Belum ada blok", bukan "Blok pertamamu sudah siap".
- **Hari kosong dibedakan.** Kalau rencana sudah ada tetapi tidak ada blok pada
  hari ini, Hari ini mengatakan itu — berapa blok yang tersimpan, dan tautan ke
  Pekan. Sebelumnya pesannya sama dengan "belum pernah menyusun apa pun".

### Yang baru

- **Simpan rencanamu sebagai template.** Di **Atur → Template** ada bagian
  *Template buatanmu*: susun blok seperti biasa, tekan **Simpan sebagai template**,
  beri nama, dan susunan itu bisa diterapkan lagi kapan saja. Template buatanmu
  ikut dalam Ekspor/Impor JSON, dan menghapusnya tidak menghapus blok yang sudah
  ada di kalender.
- **Stabilo menjelaskannya.** Satu perhentian baru di tur menyorot bagian itu, dan
  saat panel simpan dibuka ia muncul kecil di dalam form — tanpa menutupi isian.
- **Jam di header Hari ini.** Jam 24 jam dengan detik, angka `tabular-nums` supaya
  tidak bergoyang, dan titik aksen sebagai penanda hidup. Ia berhenti menghitung
  saat jendela disembunyikan, dan menghilang di jendela sempit.

### Pemasangan

| Berkas | Ukuran | Untuk siapa |
|---|---|---|
| `FlexStudy_0.5.4_x64-setup.exe` | 2.619.277 B (2,50 MiB) | **Disarankan.** Terpasang per pengguna, tidak butuh hak admin |
| `FlexStudy_0.5.4_x64_en-US.msi` | 3.145.728 B (3,00 MiB) | Terpasang mesin-luas di `Program Files`, butuh admin |

```text
5AEE55C9F2073353932206F47289E15DB0EB98AAF758EE9A112595F2CECF0993  FlexStudy_0.5.4_x64-setup.exe
BF119634C0C0562A4E8D31EE0E13452BFBD234428340DCA28D9BCF1F87E78C60  FlexStudy_0.5.4_x64_en-US.msi
```

### Yang perlu diketahui

- **Template adalah potret, bukan tautan.** Menyimpan template mengambil susunan
  blok saat itu; mengubah blok sesudahnya tidak mengubah template tersimpan.
- **Profil lama tidak mendapat blok akhir pekan secara otomatis** — template hanya
  berubah saat diterapkan. Kalau Hari ini masih kosong, terapkan ulang dari Atur.
- Installer belum ditandatangani; SmartScreen akan memperingatkan.

---

## 0.5.3 — 18 Oktober 2026

Tur sekarang menyambut sendiri setelah onboarding, menjelaskan lebih banyak fitur,
dan percakapannya bergerak seperti percakapan. Bahasa bawaan: **Inggris**.

### Yang diperbaiki

- **Tur menyambut otomatis setelah "Buka Hari ini".** Penjaga auto-open-nya satu
  untuk dua alur: perkenalan memakainya lebih dulu saat onboarding, jadi ketika
  onboarding selesai — tepat saat tur seharusnya mulai — jatahnya sudah terpakai
  dan layar Hari ini terbuka tanpa disambut siapa pun. Sekarang perkenalan dan tur
  punya penjaga masing-masing, dan tur menunggu setengah detik agar perpindahan
  layar dari onboarding selesai lebih dulu.
- **Tur menjelaskan lebih banyak.** Enam perhentian baru: **Tambah blok**,
  **tujuh hari terakhir** (streak), **Rekap bulanan**, **riwayat jurnal**
  (cari dan bintang), **cadangkan data** di Atur, dan **panel Stabilo** tempat ia
  bisa dimatikan. Total 14 perhentian singkat, ditambah tiga kuis.

### Yang baru

- **Percakapan yang bergerak.** Kartu dialog masuk dengan lembut, karakternya
  masuk dari kanan, pilihan kuis muncul bertahap, umpan balik jawaban "pop",
  kursor ketik berkedip, dan ada titik kecil di sebelah nama yang berdenyut
  selama ia masih bicara.
- **Ia berkedip.** Frame `stabilo_blink.webp` sudah ada sejak awal tetapi belum
  pernah dipakai; sekarang ia berkedip tiap 2,6–5,2 detik pada frame tenang.
  Intervalnya tidak tetap supaya tidak terasa seperti metronom.
- **Bahasa bawaan Inggris.** Pilihan bahasa tetap ditanyakan sekali di awal, dan
  pilihan yang tersimpan selalu menang; ini hanya menentukan keadaan sebelum
  pertanyaan itu dijawab.

### Pemasangan

| Berkas | Ukuran | Untuk siapa |
|---|---|---|
| `FlexStudy_0.5.3_x64-setup.exe` | 2.616.834 B (2,50 MiB) | **Disarankan.** Terpasang per pengguna, tidak butuh hak admin |
| `FlexStudy_0.5.3_x64_en-US.msi` | 3.141.632 B (3,00 MiB) | Terpasang mesin-luas di `Program Files`, butuh admin |

```text
4C14C4DB4CC9D6F6AE68184A1A4F7AFF5961C62E4B4C2B127E3CBA83524FB83A  FlexStudy_0.5.3_x64-setup.exe
EF08B32C517A568227478ED8978C41FBF760240E66C936E73FCCA6745CAE6E21  FlexStudy_0.5.3_x64_en-US.msi
```

### Yang perlu diketahui

- **Tidak ada dependensi animasi baru.** Semua gerak di atas adalah CSS satu kali
  jalan, jadi tidak ada pustaka gerak yang ikut ke bundel. Kalau nanti butuh
  pegas/fisika sungguhan, Motion bisa ditambahkan — tetapi untuk efek sependek
  ini hasilnya sama dengan biaya ± 50 KB.
- **Profil yang sudah menuntaskan tur tidak melihatnya lagi secara otomatis.**
  Untuk mencoba: **Atur → Stabilo → Atur ulang kemajuan**, lalu buka ulang aplikasi.
- Installer belum ditandatangani; SmartScreen akan memperingatkan.

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
