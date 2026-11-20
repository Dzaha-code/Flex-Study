import type { StudyTemplate } from "./types";

const WEEKDAYS = [1, 2, 3, 4, 5];

/**
 * The "Persiapan UTBK + PKL" starter from the brief. It ships as data so anyone
 * can rename, retime or delete any part of it after applying.
 */
const utbkPkl: StudyTemplate = {
  templateId: "utbk-pkl",
  name: { id: "Persiapan UTBK + PKL", en: "Exam prep + internship" },
  description: {
    id: "Dua sesi belajar, satu blok proyek, jurnal harian, dan latihan bahasa pada hari kerja.",
    en: "Two study sessions, one project block, a daily journal and language practice on weekdays.",
  },
  audienceKey: "template.utbkPkl.audience",
  categories: [
    { id: "study", name: { id: "Belajar ujian", en: "Exam study" }, icon: "disc", weeklyTargetMinutes: 900 },
    { id: "project", name: { id: "Proyek", en: "Project" }, icon: "square", weeklyTargetMinutes: 450 },
    { id: "log", name: { id: "Jurnal", en: "Journal" }, icon: "diamond", weeklyTargetMinutes: 225 },
    { id: "language", name: { id: "Bahasa", en: "Language" }, icon: "triangle", weeklyTargetMinutes: 300 },
  ],
  blocks: [
    { title: { id: "Sesi belajar 1: TPS dan Literasi", en: "Study session 1: reasoning and literacy" }, categoryId: "study", durationMin: 90, days: WEEKDAYS, plannedStart: null },
    { title: { id: "Sesi belajar 2: Penalaran Matematika", en: "Study session 2: maths reasoning" }, categoryId: "study", durationMin: 90, days: WEEKDAYS, plannedStart: null },
    { title: { id: "Pengembangan proyek", en: "Project work" }, categoryId: "project", durationMin: 90, days: WEEKDAYS, plannedStart: null },
    { title: { id: "Jurnal harian", en: "Daily journal" }, categoryId: "log", durationMin: 45, days: WEEKDAYS, plannedStart: null },
    { title: { id: "Refleksi dan bahasa Inggris", en: "Reflection and English" }, categoryId: "language", durationMin: 60, days: WEEKDAYS, plannedStart: null },
    /**
     * A weekend block on purpose. Without one, applying this template on a
     * Saturday or Sunday left Today completely empty, which reads as "the
     * template never applied". A short review is also the honest thing for a
     * study plan to ask of a weekend.
     */
    { title: { id: "Review mingguan", en: "Weekly review" }, categoryId: "study", durationMin: 45, days: [0, 6], plannedStart: null },
  ],
};

/** Short evening blocks for someone with a full-time job. */
const selfStudy: StudyTemplate = {
  templateId: "belajar-mandiri",
  name: { id: "Belajar mandiri", en: "Self-study" },
  description: {
    id: "Blok pendek 25–45 menit yang muat di sela pekerjaan, dengan refleksi mingguan.",
    en: "Short 25–45 minute blocks that fit around work, plus a weekly reflection.",
  },
  audienceKey: "template.selfStudy.audience",
  categories: [
    { id: "focus", name: { id: "Sesi fokus", en: "Focus session" }, icon: "star", weeklyTargetMinutes: 300 },
    { id: "language", name: { id: "Bahasa", en: "Language" }, icon: "triangle", weeklyTargetMinutes: 150 },
    { id: "reflection", name: { id: "Refleksi & jurnal", en: "Reflection & journal" }, icon: "diamond", weeklyTargetMinutes: 105 },
  ],
  blocks: [
    { title: { id: "Fokus pagi", en: "Morning focus" }, categoryId: "focus", durationMin: 30, days: WEEKDAYS, plannedStart: null },
    { title: { id: "Blok fokus 25 menit", en: "25-minute focus block" }, categoryId: "focus", durationMin: 25, days: WEEKDAYS, plannedStart: null },
    { title: { id: "Latihan bahasa", en: "Language practice" }, categoryId: "language", durationMin: 30, days: WEEKDAYS, plannedStart: null },
    { title: { id: "Jurnal harian", en: "Daily journal" }, categoryId: "reflection", durationMin: 15, days: WEEKDAYS, plannedStart: null },
    { title: { id: "Refleksi mingguan", en: "Weekly reflection" }, categoryId: "reflection", durationMin: 30, days: [0, 6], plannedStart: null },
  ],
};

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKEND = [0, 6];

/**
 * A blank page. No blocks at all, and three plain categories so the very first
 * block can be filed somewhere without a detour through Settings. The names
 * are deliberately generic: this template is for people whose days look
 * nothing like the examples below.
 */
const empty: StudyTemplate = {
  templateId: "empty",
  name: { id: "Kosong", en: "Blank" },
  description: {
    id: "Tanpa blok sama sekali. Hanya tiga kategori umum (Fokus, Pribadi, Istirahat) supaya kamu bisa langsung menyusun sendiri.",
    en: "No blocks at all. Just three plain categories (Focus, Personal, Rest) so you can build your own days straight away.",
  },
  audienceKey: "template.empty.audience",
  categories: [
    { id: "focus", name: { id: "Fokus", en: "Focus" }, icon: "star", weeklyTargetMinutes: 300 },
    { id: "personal", name: { id: "Pribadi", en: "Personal" }, icon: "ring", weeklyTargetMinutes: 0 },
    { id: "rest", name: { id: "Istirahat", en: "Rest" }, icon: "square-open", weeklyTargetMinutes: 0 },
  ],
  blocks: [],
};

/**
 * A general-purpose day that fits most people: one deep block, one shallow
 * block for the small stuff, movement, reading and a short look at tomorrow.
 * Nothing in it assumes school, an exam or a particular job.
 */
const balancedDay: StudyTemplate = {
  templateId: "balanced-day",
  name: { id: "Hari seimbang", en: "Balanced day" },
  description: {
    id: "Satu blok kerja mendalam, satu blok urusan kecil, olahraga, membaca, dan 10 menit merencanakan besok. Akhir pekan lebih ringan.",
    en: "One deep-work block, one block for small tasks, exercise, reading and ten minutes planning tomorrow. Lighter at the weekend.",
  },
  audienceKey: "template.balancedDay.audience",
  categories: [
    { id: "deep", name: { id: "Kerja mendalam", en: "Deep work" }, icon: "disc", weeklyTargetMinutes: 450 },
    { id: "admin", name: { id: "Urusan kecil", en: "Small tasks" }, icon: "square", weeklyTargetMinutes: 150 },
    { id: "health", name: { id: "Kesehatan", en: "Health" }, icon: "plus", weeklyTargetMinutes: 210 },
    { id: "growth", name: { id: "Membaca & refleksi", en: "Reading & reflection" }, icon: "diamond", weeklyTargetMinutes: 210 },
  ],
  blocks: [
    { title: { id: "Kerja mendalam", en: "Deep work" }, categoryId: "deep", durationMin: 90, days: WEEKDAYS, plannedStart: null },
    { title: { id: "Email, pesan, dan urusan kecil", en: "Email, messages and small tasks" }, categoryId: "admin", durationMin: 30, days: WEEKDAYS, plannedStart: null },
    { title: { id: "Olahraga atau jalan kaki", en: "Exercise or a walk" }, categoryId: "health", durationMin: 30, days: EVERY_DAY, plannedStart: null },
    { title: { id: "Membaca", en: "Reading" }, categoryId: "growth", durationMin: 20, days: EVERY_DAY, plannedStart: null },
    { title: { id: "Rencanakan besok", en: "Plan tomorrow" }, categoryId: "growth", durationMin: 10, days: EVERY_DAY, plannedStart: null },
  ],
};

/** Small daily habits, every day of the week, nothing longer than half an hour. */
const dailyHabits: StudyTemplate = {
  templateId: "daily-habits",
  name: { id: "Kebiasaan harian", en: "Daily habits" },
  description: {
    id: "Blok pendek setiap hari: gerak pagi, belajar satu keterampilan, membaca, merapikan, dan jurnal malam.",
    en: "Short blocks every day: morning movement, practising one skill, reading, tidying up and an evening journal.",
  },
  audienceKey: "template.dailyHabits.audience",
  categories: [
    { id: "body", name: { id: "Tubuh", en: "Body" }, icon: "plus", weeklyTargetMinutes: 140 },
    { id: "mind", name: { id: "Belajar", en: "Learning" }, icon: "triangle", weeklyTargetMinutes: 280 },
    { id: "home", name: { id: "Rumah", en: "Home" }, icon: "square-open", weeklyTargetMinutes: 105 },
    { id: "journal", name: { id: "Jurnal", en: "Journal" }, icon: "diamond", weeklyTargetMinutes: 70 },
  ],
  blocks: [
    { title: { id: "Gerak pagi", en: "Morning movement" }, categoryId: "body", durationMin: 20, days: EVERY_DAY, plannedStart: "06:30" },
    { title: { id: "Latih satu keterampilan", en: "Practise one skill" }, categoryId: "mind", durationMin: 30, days: EVERY_DAY, plannedStart: null },
    { title: { id: "Membaca 10 halaman", en: "Read ten pages" }, categoryId: "mind", durationMin: 15, days: EVERY_DAY, plannedStart: null },
    { title: { id: "Merapikan rumah", en: "Tidy up" }, categoryId: "home", durationMin: 15, days: EVERY_DAY, plannedStart: null },
    { title: { id: "Jurnal malam", en: "Evening journal" }, categoryId: "journal", durationMin: 10, days: EVERY_DAY, plannedStart: "21:00" },
  ],
};

/** School or university in general: assignments, review and a weekly plan. */
const schoolWeek: StudyTemplate = {
  templateId: "school-week",
  name: { id: "Sekolah / kuliah", en: "School / university" },
  description: {
    id: "Mengerjakan tugas, mengulang materi hari itu, dan latihan soal di hari sekolah, ditambah persiapan pekan di akhir minggu.",
    en: "Assignments, reviewing the material of the day and practice on school days, plus getting the week ready at the weekend.",
  },
  audienceKey: "template.schoolWeek.audience",
  categories: [
    { id: "homework", name: { id: "Tugas", en: "Assignments" }, icon: "square", weeklyTargetMinutes: 300 },
    { id: "review", name: { id: "Mengulang materi", en: "Review" }, icon: "disc", weeklyTargetMinutes: 225 },
    { id: "practice", name: { id: "Latihan", en: "Practice" }, icon: "triangle", weeklyTargetMinutes: 150 },
    { id: "plan", name: { id: "Persiapan", en: "Planning" }, icon: "diamond", weeklyTargetMinutes: 60 },
  ],
  blocks: [
    { title: { id: "Kerjakan tugas", en: "Work on assignments" }, categoryId: "homework", durationMin: 60, days: WEEKDAYS, plannedStart: null },
    { title: { id: "Ulang materi hari ini", en: "Review the material of the day" }, categoryId: "review", durationMin: 45, days: WEEKDAYS, plannedStart: null },
    { title: { id: "Latihan soal", en: "Practice questions" }, categoryId: "practice", durationMin: 30, days: WEEKDAYS, plannedStart: null },
    { title: { id: "Cicil tugas besar", en: "Chip away at a big project" }, categoryId: "homework", durationMin: 60, days: [6], plannedStart: null },
    { title: { id: "Siapkan pekan depan", en: "Get next week ready" }, categoryId: "plan", durationMin: 30, days: [0], plannedStart: null },
    { title: { id: "Ulang materi sepekan", en: "Review the week" }, categoryId: "review", durationMin: 45, days: WEEKEND, plannedStart: null },
  ],
};

/**
 * Blank first, then the general examples, then the specific ones. Someone
 * scanning the list meets the plans that fit most people before the ones that
 * fit one situation.
 */
export const TEMPLATES: StudyTemplate[] = [
  empty,
  balancedDay,
  dailyHabits,
  schoolWeek,
  selfStudy,
  utbkPkl,
];

export function findTemplate(templateId: string): StudyTemplate | null {
  return TEMPLATES.find((template) => template.templateId === templateId) ?? null;
}
