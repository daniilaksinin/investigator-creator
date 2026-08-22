import type { CharKey, Characteristics, InvestigatorDraft, Occupation, SuccessLevels, WeaponDef } from "./types";
import { OCCUPATIONS, baseSkillValue } from "./data";

export const CHAR_ORDER: CharKey[] = ["СИЛ", "СТА", "СПР", "РОЗ", "ВОЛ", "ПРИ", "ІНТ", "ОСВ"];

export const CHAR_FULL_NAMES: Record<CharKey, string> = {
  СИЛ: "Сила",
  СТА: "Статура",
  СПР: "Спритність",
  РОЗ: "Розмір",
  ВОЛ: "Воля",
  ПРИ: "Привабливість",
  ІНТ: "Інтелект",
  ОСВ: "Освіченість",
};

export const CHAR_BOUNDS: Record<CharKey, { min: number; max: number }> = {
  СИЛ: { min: 15, max: 90 },
  СТА: { min: 15, max: 90 },
  СПР: { min: 15, max: 90 },
  ВОЛ: { min: 15, max: 90 },
  ПРИ: { min: 15, max: 90 },
  РОЗ: { min: 40, max: 90 },
  ІНТ: { min: 40, max: 90 },
  ОСВ: { min: 40, max: 90 },
};

export const CHAR_STEP = 5;
export const CHAR_POOL_TOTAL = 460;

export function defaultCharacteristics(): Characteristics {
  const result = {} as Characteristics;
  for (const key of CHAR_ORDER) result[key] = CHAR_BOUNDS[key].min;
  return result;
}

export function usedCharPoints(chars: Characteristics): number {
  return CHAR_ORDER.reduce((sum, k) => sum + chars[k], 0);
}

export function remainingCharPoints(chars: Characteristics): number {
  return CHAR_POOL_TOTAL - usedCharPoints(chars);
}

/**
 * Талан is derived from Волю (the classic 7e Luck-equals-POW rule) with a bonus
 * for occupations whose secondary skill-point stat is Воля, reflecting an
 * occupation-driven force of will/fortune rather than a pure dice roll.
 */
export function computeLuck(chars: Characteristics, occ: Occupation): number {
  const bonus = occ.secondaryStat === "ВОЛ" ? 10 : 0;
  return Math.min(99, chars.ВОЛ + bonus);
}

export function successLevels(value: number): SuccessLevels {
  return {
    regular: value,
    hard: Math.floor(value / 2),
    extreme: Math.floor(value / 5),
  };
}

export function computeHP(chars: Characteristics): number {
  return Math.floor((chars.СТА + chars.РОЗ) / 10);
}

export function computeDodge(chars: Characteristics): number {
  return Math.floor(chars.СПР / 2);
}

export const MAX_SANITY_AT_CREATION = 99;

export function computeStartingSanity(chars: Characteristics): number {
  return chars.ВОЛ;
}

export interface BuildInfo {
  damageBonus: string;
  build: number;
}

export function computeBuild(chars: Characteristics): BuildInfo {
  const total = chars.СИЛ + chars.РОЗ;
  if (total <= 64) return { damageBonus: "-2", build: -2 };
  if (total <= 84) return { damageBonus: "-1", build: -1 };
  if (total <= 124) return { damageBonus: "0", build: 0 };
  if (total <= 164) return { damageBonus: "+1д4", build: 1 };
  if (total <= 204) return { damageBonus: "+1д6", build: 2 };
  return { damageBonus: "+2д6", build: 3 };
}

export function computeMove(chars: Characteristics): number {
  const strGE = chars.СИЛ >= chars.РОЗ;
  const dexGE = chars.СПР >= chars.РОЗ;
  if (strGE && dexGE) return 9;
  if (strGE || dexGE) return 8;
  return 7;
}

export function getOccupation(occupationId: string): Occupation {
  return OCCUPATIONS.find((o) => o.id === occupationId) ?? OCCUPATIONS[OCCUPATIONS.length - 1];
}

export function occupationSkillPointPool(chars: Characteristics, occ: Occupation): number {
  const secondary = occ.secondaryStat ? chars[occ.secondaryStat] : 0;
  return chars.ОСВ * occ.eduMultiplier + (occ.eduMultiplier === 2 ? secondary * 2 : 0);
}

export function personalSkillPointPool(chars: Characteristics): number {
  return chars.ІНТ * 2;
}

const CREDIT_RATING_TIERS: Record<string, number> = {
  antiquarian: 40, lawyer: 45, physician: 50, architect: 40, scholar: 30,
  journalist: 20, "private-investigator": 20, accountant: 30, librarian: 20,
  nurse: 20, actor: 25, musician: 20, student: 10, "police-detective": 25,
  "beat-cop": 15, driver: 15, sailor: 15, farmer: 15, hunter: 15, veteran: 20,
  boxer: 15, butler: 15, priest: 25, performer: 15, gangster: 35, other: 20,
};

export function creditRating(occupationId: string): number {
  return CREDIT_RATING_TIERS[occupationId] ?? 20;
}

export function sumAllocated(record: Record<string, number>): number {
  return Object.values(record).reduce((a, b) => a + b, 0);
}

export function skillFinalValue(
  name: string,
  occupationPoints: Record<string, number>,
  personalPoints: Record<string, number>
): number {
  const base = baseSkillValue(name);
  const occ = occupationPoints[name] ?? 0;
  const personal = personalPoints[name] ?? 0;
  return Math.min(90, base + occ + personal);
}

export function weaponsFor(draft: InvestigatorDraft): WeaponDef[] {
  const occ = getOccupation(draft.occupationId);
  const fistDamage = occ.toughFists ? "1д4 + БП" : "1д3 + БП";
  const fists: WeaponDef = { name: "Кулаки (рукопашний)", skill: "Бій (рукопашний)", damage: fistDamage };
  return [fists, ...occ.startingWeapons];
}

export function createEmptyDraft(): InvestigatorDraft {
  return {
    gender: "male",
    firstName: "",
    lastName: "",
    age: 30,
    homeplace: "",
    occupationId: OCCUPATIONS[0].id,
    customOccupation: "",
    characteristics: defaultCharacteristics(),
    occupationSkillPoints: {},
    personalSkillPoints: {},
    extraGear: [],
  };
}

export function occupationDisplayName(draft: InvestigatorDraft): string {
  const occ = getOccupation(draft.occupationId);
  if (occ.id === "other" && draft.customOccupation.trim()) return draft.customOccupation.trim();
  return occ.name;
}

export function buildSummaryText(draft: InvestigatorDraft): string {
  const chars = draft.characteristics;
  const occ = getOccupation(draft.occupationId);
  const build = computeBuild(chars);
  const weapons = weaponsFor(draft);
  const gender = draft.gender === "male" ? "Чоловіча" : "Жіноча";
  const luck = computeLuck(chars, occ);

  const allSkillNames = new Set<string>([
    ...Object.keys(draft.occupationSkillPoints).filter((k) => draft.occupationSkillPoints[k] > 0),
    ...Object.keys(draft.personalSkillPoints).filter((k) => draft.personalSkillPoints[k] > 0),
  ]);
  const skillLines = Array.from(allSkillNames)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const value = skillFinalValue(name, draft.occupationSkillPoints, draft.personalSkillPoints);
      const lvl = successLevels(value);
      return `  ${name}: ${lvl.regular}% (Складно: ${lvl.hard}%, Екстремально: ${lvl.extreme}%)`;
    });

  const lines = [
    `ЛИСТ ДОСЛІДНИКА — ${draft.firstName} ${draft.lastName}`,
    "=".repeat(40),
    "",
    "ОСОБИСТІ ДАНІ",
    `  Ім'я: ${draft.firstName}`,
    `  Прізвище: ${draft.lastName}`,
    `  Стать: ${gender}`,
    `  Вік: ${draft.age}`,
    `  Місце проживання: ${draft.homeplace}`,
    `  Рід занять: ${occupationDisplayName(draft)}`,
    "",
    "ХАРАКТЕРИСТИКИ",
    ...CHAR_ORDER.map((k) => {
      const lvl = successLevels(chars[k]);
      return `  ${k} (${CHAR_FULL_NAMES[k]}): ${lvl.regular} (Складно: ${lvl.hard}, Екстремально: ${lvl.extreme})`;
    }),
    "",
    "ПОХІДНІ ПОКАЗНИКИ",
    `  Очки здоров'я: ${computeHP(chars)}`,
    `  Глузд (Початковий/Поточний): ${computeStartingSanity(chars)}`,
    `  Макс. глузд: ${MAX_SANITY_AT_CREATION}`,
    `  Талан: ${luck}`,
    `  Ухиляння: ${computeDodge(chars)}%`,
    `  Переміщення: ${computeMove(chars)}`,
    `  Будова: ${build.build}`,
    `  Бонусні пошкодження: ${build.damageBonus}`,
    `  Достаток: ${creditRating(draft.occupationId)}%`,
    "",
    "УМІННЯ",
    ...(skillLines.length ? skillLines : ["  (не розподілено)"]),
    "",
    "БІЙ (ЗБРОЯ)",
    ...weapons.map((w) => `  ${w.name} — ${w.skill} — Пошкодж.: ${w.damage}`),
    "",
    "СПОРЯДЖЕННЯ І МАЙНО",
    ...[...occ.startingGear, ...draft.extraGear].map((g) => `  - ${g}`),
    "",
    "Моя історія, Передісторія, Переконання, Фобії та манії тощо —",
    "допишіть власноруч на аркуші листа дослідника.",
  ];

  return lines.join("\n");
}
