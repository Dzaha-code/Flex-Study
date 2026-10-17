import type { DialogueScript } from "../engine/types";

/**
 * Naskah Indonesia. Ditulis sebagai ucapan, bukan terjemahan dari bahasa
 * Inggris: partikel ("lho", "ya~") dan pemendekan sehari-hari adalah bagian dari
 * suaranya, dan menerjemahkannya harfiah akan membuatnya terdengar kaku.
 *
 * `{{name}}` sudah memuat koma di depannya (", Rani" atau ""), supaya kalimat
 * salam tetap benar saat nama dikosongkan.
 *
 * Aturan yang dipegang di sini (tourStabilo.md §3): kengerian diarahkan ke
 * situasi permainan — kuis, jeda canggung — tidak pernah ke kehidupan pengguna.
 */

export const INTRO_ID: DialogueScript = {
  id: "intro",
  lang: "id",
  start: "i01",
  nodes: {
    i01: {
      id: "i01",
      text: "Halo, halo~ Akhirnya ketemu juga! Aku Stabilo, penunggu FlexStudy.",
      next: "i02",
    },
    i02: {
      id: "i02",
      text: "Boleh aku tahu namamu? Boleh dikosongkan, kok.",
      next: "i03",
    },
    i03: {
      id: "i03",
      text: "Salam kenal{{name}}~ ✿",
      fx: ["sparkle"],
      next: "i04",
    },
    i04: {
      id: "i04",
      text: "Satu hal lagi: kamu mau aku manis banget, atau dengan sedikit... bumbu?",
      next: "i05",
    },
    i05: {
      id: "i05",
      text: "Jadwal di sini memaafkan: harimu jadi blok, dan kalau berantakan, tinggal digeser.",
      next: "i06",
    },
    i06: {
      id: "i06",
      text: "Sekarang pilih template yang paling mirip hidupmu, ya~",
      next: "i07",
    },
    i07: {
      id: "i07",
      text: "Aku tunggu di sana. Kalau bingung, panggil saja~",
      fx: ["sparkle"],
    },
  },
};

export const TOUR_ID: DialogueScript = {
  id: "tour",
  lang: "id",
  start: "t01",
  nodes: {
    t01: {
      id: "t01",
      route: "/",
      target: "nav",
      text: "Ini menu utama. Kamu akan paling sering ada di {{today}}.",
      ask: "understood",
      onUnsure: "t01b",
      next: "t02",
    },
    t01b: {
      id: "t01b",
      route: "/",
      target: "nav",
      slow: true,
      text: "Menu ada di kiri. Yang paling sering kamu buka: {{today}}.",
      next: "t02",
    },
    t02: {
      id: "t02",
      route: "/",
      target: "focus",
      text: "Blok pertamamu ada di sini. Tekan {{start}} dan timernya langsung jalan.",
      ask: "understood",
      onUnsure: "t02b",
      next: "q1",
    },
    t02b: {
      id: "t02b",
      route: "/",
      target: "focus",
      slow: true,
      text: "Ini blok yang sedang berjalan. Tombol {{start}} ada di dalamnya.",
      next: "q1",
    },
    q1: {
      id: "q1",
      route: "/",
      target: "focus",
      text: "Eh, tunggu dulu!",
      fx: ["pause"],
      quiz: {
        id: "quiz-start",
        kind: "choice",
        prompt: "Kalau mau memulai timer, kamu tekan yang mana?",
        options: [
          { label: "{{start}}", correct: true },
          { label: "{{finish}}" },
          { label: "{{skip}}" },
        ],
      },
      next: "t03",
    },
    t03: {
      id: "t03",
      route: "/",
      target: "progress",
      text: "Garis ini menunjukkan berapa blok yang sudah beres hari ini.",
      ask: "understood",
      onUnsure: "t03b",
      next: "t04",
    },
    t03b: {
      id: "t03b",
      route: "/",
      target: "progress",
      slow: true,
      text: "Garis di atas itu kemajuan hari ini.",
      next: "t04",
    },
    t04: {
      id: "t04",
      route: "/",
      target: "shift",
      text: "Kalau hari berantakan, ada {{shift}}: sisa blok pindah, target tetap aman.",
      ask: "understood",
      onUnsure: "t04b",
      next: "q2",
    },
    t04b: {
      id: "t04b",
      route: "/",
      target: "shift",
      slow: true,
      text: "Tombol {{shift}} memindahkan sisa blok. Target tidak ikut turun.",
      next: "q2",
    },
    q2: {
      id: "q2",
      route: "/",
      target: "shift",
      text: "Eh, tunggu dulu!",
      fx: ["pause"],
      quiz: {
        id: "quiz-shift",
        kind: "choice",
        prompt: "Hari ini nggak keburu. Kamu pilih apa?",
        options: [
          { label: "{{shift}}", correct: true },
          { label: "Hapus semua blok" },
          { label: "Pura-pura nggak lihat" },
        ],
      },
      next: "t05",
    },
    t05: {
      id: "t05",
      route: "/week",
      target: "week-targets",
      accent: true,
      text: "Di {{week}}, lihat target tiap kategori. Pelan-pelan aja, yang penting konsisten.",
      next: "q3",
    },
    q3: {
      id: "q3",
      route: "/week",
      target: "week-targets",
      text: "Eh, tunggu dulu!",
      fx: ["pause"],
      quiz: {
        id: "quiz-week",
        kind: "choice",
        prompt: "Di layar mana kamu melihat target minggu ini?",
        options: [
          { label: "{{week}}", correct: true },
          { label: "{{journal}}" },
          { label: "{{settings}}" },
        ],
      },
      next: "t06",
    },
    t06: {
      id: "t06",
      route: "/journal",
      target: "journal-entry",
      text: "Di {{journal}}, dua kalimat saja sudah cukup. Aku suka kalau kamu bercerita~",
      next: "t07",
    },
    t07: {
      id: "t07",
      route: "/settings",
      target: "settings-appearance",
      text: "Kalau kamu lebih suka tanpa aku, matikan aku di {{settings}} → Stabilo.",
      mode: {
        sweet: "Kalau kamu lebih suka tanpa aku, matikan di {{settings}} → Stabilo. Aku nggak marah, kok.",
        spooky:
          "Matikan di {{settings}} → Stabilo kalau kamu mau. Aku nggak marah... mungkin. Hehe.",
      },
      accent: true,
      next: "t08",
    },
    t08: {
      id: "t08",
      route: "/guide",
      target: "guide-quick",
      text: "Itu saja. Kalau lupa, panggil aku lewat {{guide}}. Selamat belajar, ya~ ✿",
      fx: ["sparkle"],
    },
  },
};
