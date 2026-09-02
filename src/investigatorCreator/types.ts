export type Gender = "male" | "female";

export type CharKey = "СИЛ" | "СТА" | "СПР" | "РОЗ" | "ВОЛ" | "ПРИ" | "ІНТ" | "ОСВ";

export type Characteristics = Record<CharKey, number>;

export interface WeaponDef {
  name: string;
  skill: string;
  damage: string;
  range?: string;
}

export interface Occupation {
  id: string;
  name: string;
  /** Emoji icon shown next to the occupation name. */
  icon: string;
  /** Short one-sentence description of what this occupation is about. */
  description: string;
  /** Characteristic used alongside ОСВ for the occupation skill-point formula. */
  secondaryStat: CharKey | null;
  /** Multiplier applied to ОСВ (2 for EDU*2+X*2 pattern, 4 for EDU*4-only professions). */
  eduMultiplier: 2 | 4;
  /** The 8 suggested occupation skills (names must match SKILL_LIST, or be a "variant:label" free-text skill). */
  skills: string[];
  /** Extra flat gear this occupation always starts with. */
  startingGear: string[];
  /** Weapon(s) automatically granted by this occupation, beyond bare fists. */
  startingWeapons: WeaponDef[];
  /** How many extra items the player may additionally pick from the general catalog. */
  extraGearPicks: number;
  /** If true, unarmed damage is upgraded to reflect combat training. */
  toughFists?: boolean;
}

export interface SkillDef {
  name: string;
  base: number;
  /** Marks skills that are not part of normal point allocation (fixed/derived instead). */
  fixed?: boolean;
}

export interface Homeplace {
  city: string;
  country: string;
}

export interface SuccessLevels {
  regular: number;
  hard: number;
  extreme: number;
}

export interface InvestigatorDraft {
  gender: Gender;
  firstName: string;
  lastName: string;
  age: number;
  homeplace: string;
  occupationId: string;
  customOccupation: string;
  characteristics: Characteristics;
  creditRating: number;
  luckVariance: number;
  foreignLanguage: string;
  occupationSkillPoints: Record<string, number>;
  personalSkillPoints: Record<string, number>;
  extraGear: string[];
}
