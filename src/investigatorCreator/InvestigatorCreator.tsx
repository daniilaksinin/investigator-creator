import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Gender, InvestigatorDraft } from "./types";
import {
  OCCUPATIONS,
  MALE_FIRST_NAMES,
  FEMALE_FIRST_NAMES,
  LAST_NAMES,
  HOMEPLACES,
  GENERAL_EQUIPMENT,
  SKILL_LIST,
} from "./data";
import {
  CHAR_ORDER,
  CHAR_FULL_NAMES,
  CHAR_BOUNDS,
  CHAR_STEP,
  CHAR_POOL_TOTAL,
  usedCharPoints,
  remainingCharPoints,
  createEmptyDraft,
  getOccupation,
  occupationSkillPointPool,
  personalSkillPointPool,
  sumAllocated,
  skillFinalValue,
  computeHP,
  computeDodge,
  computeMove,
  computeBuild,
  computeStartingSanity,
  MAX_SANITY_AT_CREATION,
  creditRating,
  weaponsFor,
  occupationDisplayName,
  buildSummaryText,
  rollLuck,
} from "./logic";
import "./InvestigatorCreator.css";

const SKILL_STEP = 5;

const STEPS = [
  "Стать",
  "Ім'я",
  "Вік",
  "Місце проживання",
  "Рід занять",
  "Характеристики",
  "Уміння",
  "Спорядження",
  "Результат",
];

function randomOf<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function InvestigatorCreator() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<InvestigatorDraft>(() => createEmptyDraft());

  const occ = useMemo(() => getOccupation(draft.occupationId), [draft.occupationId]);
  const charsUsed = usedCharPoints(draft.characteristics);
  const charsRemaining = remainingCharPoints(draft.characteristics);
  const occPool = occupationSkillPointPool(draft.characteristics, occ);
  const occUsed = sumAllocated(draft.occupationSkillPoints);
  const personalPool = personalSkillPointPool(draft.characteristics);
  const personalUsed = sumAllocated(draft.personalSkillPoints);

  function update(patch: Partial<InvestigatorDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function setGender(gender: Gender) {
    update({ gender });
  }

  function randomizeName() {
    const pool = draft.gender === "male" ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES;
    update({ firstName: randomOf(pool), lastName: randomOf(LAST_NAMES) });
  }

  function adjustChar(key: (typeof CHAR_ORDER)[number], delta: number) {
    setDraft((prev) => {
      const bounds = CHAR_BOUNDS[key];
      const next = prev.characteristics[key] + delta;
      if (next < bounds.min || next > bounds.max) return prev;
      if (delta > 0 && remainingCharPoints(prev.characteristics) < delta) return prev;
      return { ...prev, characteristics: { ...prev.characteristics, [key]: next } };
    });
  }

  function adjustOccSkill(name: string, delta: number) {
    setDraft((prev) => {
      const current = prev.occupationSkillPoints[name] ?? 0;
      const next = current + delta;
      if (next < 0) return prev;
      const pool = occupationSkillPointPool(prev.characteristics, getOccupation(prev.occupationId));
      if (delta > 0 && sumAllocated(prev.occupationSkillPoints) + delta > pool) return prev;
      const base = SKILL_LIST.find((s) => s.name === name)?.base ?? 0;
      if (base + next > 90) return prev;
      return { ...prev, occupationSkillPoints: { ...prev.occupationSkillPoints, [name]: next } };
    });
  }

  function adjustPersonalSkill(name: string, delta: number) {
    setDraft((prev) => {
      const current = prev.personalSkillPoints[name] ?? 0;
      const next = current + delta;
      if (next < 0) return prev;
      const pool = personalSkillPointPool(prev.characteristics);
      if (delta > 0 && sumAllocated(prev.personalSkillPoints) + delta > pool) return prev;
      const base = SKILL_LIST.find((s) => s.name === name)?.base ?? 0;
      const occAlready = prev.occupationSkillPoints[name] ?? 0;
      if (base + occAlready + next > 90) return prev;
      return { ...prev, personalSkillPoints: { ...prev.personalSkillPoints, [name]: next } };
    });
  }

  function toggleGear(item: string) {
    setDraft((prev) => {
      const has = prev.extraGear.includes(item);
      if (has) return { ...prev, extraGear: prev.extraGear.filter((g) => g !== item) };
      if (prev.extraGear.length >= occ.extraGearPicks) return prev;
      return { ...prev, extraGear: [...prev.extraGear, item] };
    });
  }

  function canGoNext(): boolean {
    switch (step) {
      case 1:
        return draft.firstName.trim().length > 0 && draft.lastName.trim().length > 0;
      case 3:
        return draft.homeplace.trim().length > 0;
      case 4:
        return occ.id !== "other" || draft.customOccupation.trim().length > 0;
      case 5:
        return charsRemaining === 0;
      default:
        return true;
    }
  }

  function goNext() {
    if (step < STEPS.length - 1 && canGoNext()) setStep(step + 1);
  }

  function goBack() {
    if (step > 0) setStep(step - 1);
  }

  function handleDownload() {
    const text = buildSummaryText(draft);
    const safeName = `${draft.firstName}_${draft.lastName}`.replace(/\s+/g, "_") || "investigator";
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const availableGear = GENERAL_EQUIPMENT.filter((g) => !occ.startingGear.includes(g));

  return (
    <div className="investigator-creator">
      <div className="investigator-creator__progress">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`investigator-creator__progress-dot ${i === step ? "investigator-creator__progress-dot--active" : ""} ${i < step ? "investigator-creator__progress-dot--done" : ""}`}
            title={label}
          />
        ))}
      </div>

      <div className="investigator-creator__stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="investigator-creator__step"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {step === 0 && (
              <div className="investigator-creator__panel">
                <h3 className="investigator-creator__step-title">Оберіть стать персонажа</h3>
                <div className="investigator-creator__gender-row">
                  <button
                    type="button"
                    className={`investigator-creator__choice-btn ${draft.gender === "male" ? "investigator-creator__choice-btn--active" : ""}`}
                    onClick={() => setGender("male")}
                  >
                    Чоловіча
                  </button>
                  <button
                    type="button"
                    className={`investigator-creator__choice-btn ${draft.gender === "female" ? "investigator-creator__choice-btn--active" : ""}`}
                    onClick={() => setGender("female")}
                  >
                    Жіноча
                  </button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="investigator-creator__panel">
                <h3 className="investigator-creator__step-title">Ім'я та прізвище</h3>
                <div className="investigator-creator__name-row">
                  <input
                    className="investigator-creator__input"
                    placeholder="Ім'я"
                    value={draft.firstName}
                    onChange={(e) => update({ firstName: e.target.value })}
                  />
                  <input
                    className="investigator-creator__input"
                    placeholder="Прізвище"
                    value={draft.lastName}
                    onChange={(e) => update({ lastName: e.target.value })}
                  />
                  <button type="button" className="investigator-creator__random-btn" onClick={randomizeName}>
                    Згенерувати
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="investigator-creator__panel">
                <h3 className="investigator-creator__step-title">Вік: {draft.age}</h3>
                <input
                  type="range"
                  min={15}
                  max={90}
                  value={draft.age}
                  onChange={(e) => update({ age: Number(e.target.value) })}
                  className="investigator-creator__slider"
                />
              </div>
            )}

            {step === 3 && (
              <div className="investigator-creator__panel">
                <h3 className="investigator-creator__step-title">Місце проживання</h3>
                <div className="investigator-creator__name-row">
                  <input
                    className="investigator-creator__input"
                    placeholder="Наприклад, Аркхем"
                    value={draft.homeplace}
                    onChange={(e) => update({ homeplace: e.target.value })}
                  />
                  <button
                    type="button"
                    className="investigator-creator__random-btn"
                    onClick={() => update({ homeplace: randomOf(HOMEPLACES) })}
                  >
                    Згенерувати
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="investigator-creator__panel">
                <h3 className="investigator-creator__step-title">Рід занять</h3>
                <div className="investigator-creator__occupation-grid">
                  {OCCUPATIONS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className={`investigator-creator__occupation-btn ${draft.occupationId === o.id ? "investigator-creator__occupation-btn--active" : ""}`}
                      onClick={() => update({ occupationId: o.id })}
                    >
                      {o.name}
                    </button>
                  ))}
                </div>
                {occ.id === "other" && (
                  <input
                    className="investigator-creator__input investigator-creator__custom-occupation"
                    placeholder="Впишіть рід занять"
                    value={draft.customOccupation}
                    onChange={(e) => update({ customOccupation: e.target.value })}
                  />
                )}
              </div>
            )}

            {step === 5 && (
              <div className="investigator-creator__panel">
                <div className="investigator-creator__pool-header">
                  <h3 className="investigator-creator__step-title">Характеристики</h3>
                  <span className={`investigator-creator__pool-badge ${charsRemaining === 0 ? "investigator-creator__pool-badge--done" : ""}`}>
                    Залишилось очок: {charsRemaining} / {CHAR_POOL_TOTAL} (використано {charsUsed})
                  </span>
                </div>
                <div className="investigator-creator__char-grid">
                  {CHAR_ORDER.map((key) => (
                    <div key={key} className="investigator-creator__char-row">
                      <span className="investigator-creator__char-label">
                        {key} <span className="investigator-creator__char-fullname">({CHAR_FULL_NAMES[key]})</span>
                      </span>
                      <div className="investigator-creator__stepper">
                        <button type="button" onClick={() => adjustChar(key, -CHAR_STEP)}>
                          −
                        </button>
                        <span className="investigator-creator__stepper-value">{draft.characteristics[key]}</span>
                        <button type="button" onClick={() => adjustChar(key, CHAR_STEP)}>
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="investigator-creator__panel">
                <h3 className="investigator-creator__step-title">Уміння</h3>

                <div className="investigator-creator__pool-header">
                  <span className="investigator-creator__skill-group-title">Очки професії ({occ.name})</span>
                  <span className={`investigator-creator__pool-badge ${occUsed === occPool ? "investigator-creator__pool-badge--done" : ""}`}>
                    {occPool - occUsed} / {occPool}
                  </span>
                </div>
                <div className="investigator-creator__skill-list">
                  {occ.skills.map((name) => (
                    <SkillRow
                      key={name}
                      name={name}
                      value={draft.occupationSkillPoints[name] ?? 0}
                      onInc={() => adjustOccSkill(name, SKILL_STEP)}
                      onDec={() => adjustOccSkill(name, -SKILL_STEP)}
                      occupationPoints={draft.occupationSkillPoints}
                      personalPoints={draft.personalSkillPoints}
                    />
                  ))}
                </div>

                <div className="investigator-creator__pool-header investigator-creator__pool-header--spaced">
                  <span className="investigator-creator__skill-group-title">Очки особистих інтересів</span>
                  <span className={`investigator-creator__pool-badge ${personalUsed === personalPool ? "investigator-creator__pool-badge--done" : ""}`}>
                    {personalPool - personalUsed} / {personalPool}
                  </span>
                </div>
                <div className="investigator-creator__skill-list investigator-creator__skill-list--scroll">
                  {SKILL_LIST.map((s) => (
                    <SkillRow
                      key={s.name}
                      name={s.name}
                      value={draft.personalSkillPoints[s.name] ?? 0}
                      onInc={() => adjustPersonalSkill(s.name, SKILL_STEP)}
                      onDec={() => adjustPersonalSkill(s.name, -SKILL_STEP)}
                      occupationPoints={draft.occupationSkillPoints}
                      personalPoints={draft.personalSkillPoints}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="investigator-creator__panel">
                <h3 className="investigator-creator__step-title">Спорядження і майно</h3>
                <p className="investigator-creator__hint">Автоматично від роду занять:</p>
                <ul className="investigator-creator__fixed-gear">
                  {occ.startingGear.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
                <p className="investigator-creator__hint">
                  Оберіть додатково ще {occ.extraGearPicks} предмет(и) ({draft.extraGear.length}/{occ.extraGearPicks}):
                </p>
                <div className="investigator-creator__gear-grid">
                  {availableGear.map((item) => {
                    const checked = draft.extraGear.includes(item);
                    const disabled = !checked && draft.extraGear.length >= occ.extraGearPicks;
                    return (
                      <button
                        key={item}
                        type="button"
                        disabled={disabled}
                        className={`investigator-creator__gear-chip ${checked ? "investigator-creator__gear-chip--active" : ""}`}
                        onClick={() => toggleGear(item)}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 8 && <ResultPanel draft={draft} onDownload={handleDownload} onRerollLuck={() => update({ luck: rollLuck() })} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="investigator-creator__nav">
        <button type="button" className="investigator-creator__nav-btn" onClick={goBack} disabled={step === 0}>
          ← Назад
        </button>
        <span className="investigator-creator__nav-step">
          Крок {step + 1} з {STEPS.length}: {STEPS[step]}
        </span>
        {step < STEPS.length - 1 && (
          <button type="button" className="investigator-creator__nav-btn investigator-creator__nav-btn--primary" onClick={goNext} disabled={!canGoNext()}>
            Далі →
          </button>
        )}
      </div>
    </div>
  );
}

interface SkillRowProps {
  name: string;
  value: number;
  onInc: () => void;
  onDec: () => void;
  occupationPoints: Record<string, number>;
  personalPoints: Record<string, number>;
}

function SkillRow({ name, value, onInc, onDec, occupationPoints, personalPoints }: SkillRowProps) {
  const final = skillFinalValue(name, occupationPoints, personalPoints);
  return (
    <div className="investigator-creator__skill-row">
      <span className="investigator-creator__skill-name">{name}</span>
      <span className="investigator-creator__skill-final">{final}%</span>
      <div className="investigator-creator__stepper investigator-creator__stepper--small">
        <button type="button" onClick={onDec} disabled={value <= 0}>
          −
        </button>
        <span className="investigator-creator__stepper-value">+{value}</span>
        <button type="button" onClick={onInc}>
          +
        </button>
      </div>
    </div>
  );
}

interface ResultPanelProps {
  draft: InvestigatorDraft;
  onDownload: () => void;
  onRerollLuck: () => void;
}

function ResultPanel({ draft, onDownload, onRerollLuck }: ResultPanelProps) {
  const chars = draft.characteristics;
  const occ = getOccupation(draft.occupationId);
  const build = computeBuild(chars);
  const weapons = weaponsFor(draft);
  const genderLabel = draft.gender === "male" ? "Чоловіча" : "Жіноча";

  const allocatedSkills = Array.from(
    new Set([
      ...Object.keys(draft.occupationSkillPoints).filter((k) => draft.occupationSkillPoints[k] > 0),
      ...Object.keys(draft.personalSkillPoints).filter((k) => draft.personalSkillPoints[k] > 0),
    ])
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="investigator-creator__panel investigator-creator__result">
      <h3 className="investigator-creator__step-title">
        {draft.firstName} {draft.lastName}
      </h3>
      <p className="investigator-creator__result-subtitle">
        {genderLabel} · {draft.age} років · {occupationDisplayName(draft)} · {draft.homeplace}
      </p>

      <div className="investigator-creator__result-grid">
        <div className="investigator-creator__result-block">
          <h4>Характеристики</h4>
          <div className="investigator-creator__result-chars">
            {CHAR_ORDER.map((k) => (
              <span key={k}>
                {k}: <b>{chars[k]}</b>
              </span>
            ))}
          </div>
        </div>

        <div className="investigator-creator__result-block">
          <h4>Похідні показники</h4>
          <div className="investigator-creator__result-chars">
            <span>ОЗ: <b>{computeHP(chars)}</b></span>
            <span>
              Глузд: <b>{computeStartingSanity(chars)}</b> / Макс {MAX_SANITY_AT_CREATION}
            </span>
            <span>
              Талан: <b>{draft.luck}</b>{" "}
              <button type="button" className="investigator-creator__reroll-btn" onClick={onRerollLuck} title="Перекинути Талан">
                ⟳
              </button>
            </span>
            <span>Ухиляння: <b>{computeDodge(chars)}%</b></span>
            <span>Переміщення: <b>{computeMove(chars)}</b></span>
            <span>Будова: <b>{build.build}</b></span>
            <span>Бонусні пошкодження: <b>{build.damageBonus}</b></span>
            <span>Достаток: <b>{creditRating(draft.occupationId)}%</b></span>
          </div>
        </div>

        <div className="investigator-creator__result-block">
          <h4>Уміння</h4>
          {allocatedSkills.length === 0 ? (
            <p className="investigator-creator__hint">Не розподілено</p>
          ) : (
            <div className="investigator-creator__result-chars">
              {allocatedSkills.map((name) => (
                <span key={name}>
                  {name}: <b>{skillFinalValue(name, draft.occupationSkillPoints, draft.personalSkillPoints)}%</b>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="investigator-creator__result-block">
          <h4>Бій</h4>
          <div className="investigator-creator__result-chars">
            {weapons.map((w) => (
              <span key={w.name}>
                {w.name}: <b>{w.damage}</b>
              </span>
            ))}
          </div>
        </div>

        <div className="investigator-creator__result-block investigator-creator__result-block--wide">
          <h4>Спорядження і майно</h4>
          <div className="investigator-creator__result-chars">
            {[...occ.startingGear, ...draft.extraGear].map((g, i) => (
              <span key={`${g}-${i}`}>{g}</span>
            ))}
          </div>
        </div>
      </div>

      <button type="button" className="investigator-creator__download-btn" onClick={onDownload}>
        ⬇ Завантажити лист персонажа
      </button>
      <p className="investigator-creator__hint">
        Файл містить усі згенеровані дані у зручному текстовому вигляді — перенесіть їх власноруч на офіційний лист
        дослідника (розділ "Створення" → "Лист дослідника"), а поля "Моя історія" й "Передісторія" допишіть самі.
      </p>
    </div>
  );
}

export default InvestigatorCreator;
