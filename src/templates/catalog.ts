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
    { title: { id: "Refleksi mingguan", en: "Weekly reflection" }, categoryId: "reflection", durationMin: 30, days: [0], plannedStart: null },
  ],
};

/**
 * "Empty" still ships one category, so the very first block can be created
 * without a detour through settings.
 */
const empty: StudyTemplate = {
  templateId: "empty",
  name: { id: "Kosong", en: "Empty" },
  description: {
    id: "Mulai dari nol: satu kategori, tanpa blok. Kamu yang menentukan.",
    en: "Start from scratch: one category, no blocks. You decide the rest.",
  },
  audienceKey: "template.empty.audience",
  categories: [
    { id: "focus", name: { id: "Sesi fokus", en: "Focus session" }, icon: "star", weeklyTargetMinutes: 300 },
  ],
  blocks: [],
};

export const TEMPLATES: StudyTemplate[] = [utbkPkl, selfStudy, empty];

export function findTemplate(templateId: string): StudyTemplate | null {
  return TEMPLATES.find((template) => template.templateId === templateId) ?? null;
}
