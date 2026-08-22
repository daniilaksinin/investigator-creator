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
  skillIcon,
  skillDescription,
  gearIcon,
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
  successLevels,
  computeHP,
  computeDodge,
  computeMove,
  computeBuild,
  computeStartingSanity,
  MAX_SANITY_AT_CREATION,
  creditRating,
  computeLuck,
  computeWealth,
  weaponsFor,
  occupationDisplayName,
  buildSummaryText,
} from "./logic";
import "./InvestigatorCreator.css";

const SKILL_STEP = 5;
const SPOT_HIDDEN = "Пошук прихованого";

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
  const [activeSkill, setActiveSkill] = useState(SPOT_HIDDEN);

  const occ = useMemo(() => getOccupation(draft.occupationId), [draft.occupationId]);
  const occSkills = useMemo(
    () => (occ.skills.includes(SPOT_HIDDEN) ? occ.skills : [...occ.skills, SPOT_HIDDEN]),
    [occ]
  );
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

  function randomizeHomeplace() {
    const h = randomOf(HOMEPLACES);
    update({ homeplace: `${h.city}, ${h.country}` });
  }

  function setAge(value: number) {
    if (Number.isNaN(value)) return;
    update({ age: Math.min(90, Math.max(15, Math.round(value))) });
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
                <h3 className="investigator-creator__step-title">Вік</h3>
                <div className="investigator-creator__age-row">
                  <input
                    type="range"
                    min={15}
                    max={90}
                    value={draft.age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="investigator-creator__slider"
                  />
                  <input
                    type="number"
                    min={15}
                    max={90}
                    value={draft.age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="investigator-creator__age-input"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="investigator-creator__panel">
                <h3 className="investigator-creator__step-title">Місце проживання</h3>
                <div className="investigator-creator__name-row">
                  <input
                    className="investigator-creator__input"
                    placeholder="Наприклад, Київ, Україна"
                    value={draft.homeplace}
                    onChange={(e) => update({ homeplace: e.target.value })}
                  />
                  <button type="button" className="investigator-creator__random-btn" onClick={randomizeHomeplace}>
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
                      <span className="investigator-creator__occupation-icon">{o.icon}</span>
                      {o.name}
                    </button>
                  ))}
                </div>
                <div className="investigator-creator__occupation-description">
                  <span className="investigator-creator__occupation-icon investigator-creator__occupation-icon--lg">{occ.icon}</span>
                  <div>
                    <strong>{occ.name}</strong>
                    <p>{occ.description}</p>
                  </div>
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

                <div className="investigator-creator__skill-description">
                  <span className="investigator-creator__skill-icon investigator-creator__skill-icon--lg">
                    {skillIcon(activeSkill)}
                  </span>
                  <div>
                    <strong>{activeSkill}</strong>
                    <p>{skillDescription(activeSkill) || "Опис недоступний."}</p>
                  </div>
                </div>

                <div className="investigator-creator__pool-header">
                  <span className="investigator-creator__skill-group-title">Очки професії ({occ.name})</span>
                  <span className={`investigator-creator__pool-badge ${occUsed === occPool ? "investigator-creator__pool-badge--done" : ""}`}>
                    {occPool - occUsed} / {occPool}
                  </span>
                </div>
                <div className="investigator-creator__skill-list">
                  {occSkills.map((name) => (
                    <SkillRow
                      key={name}
                      name={name}
                      value={draft.occupationSkillPoints[name] ?? 0}
                      onInc={() => adjustOccSkill(name, SKILL_STEP)}
                      onDec={() => adjustOccSkill(name, -SKILL_STEP)}
                      onHover={() => setActiveSkill(name)}
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
                      onHover={() => setActiveSkill(s.name)}
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
                    <li key={g}>
                      <span className="investigator-creator__gear-icon">{gearIcon(g)}</span> {g}
                    </li>
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
                        <span className="investigator-creator__gear-icon">{gearIcon(item)}</span> {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 8 && <ResultPanel draft={draft} onDownload={handleDownload} />}
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
  onHover: () => void;
  occupationPoints: Record<string, number>;
  personalPoints: Record<string, number>;
}

function SkillRow({ name, value, onInc, onDec, onHover, occupationPoints, personalPoints }: SkillRowProps) {
  const final = skillFinalValue(name, occupationPoints, personalPoints);
  return (
    <div className="investigator-creator__skill-row" onMouseEnter={onHover}>
      <span className="investigator-creator__skill-icon">{skillIcon(name)}</span>
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
}

function ResultPanel({ draft, onDownload }: ResultPanelProps) {
  const chars = draft.characteristics;
  const occ = getOccupation(draft.occupationId);
  const build = computeBuild(chars);
  const weapons = weaponsFor(draft);
  const genderLabel = draft.gender === "male" ? "Чоловіча" : "Жіноча";
  const luck = computeLuck(chars, occ);
  const wealth = computeWealth(creditRating(draft.occupationId));

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
        {genderLabel} · {draft.age} років · {occ.icon} {occupationDisplayName(draft)} · {draft.homeplace}
      </p>

      <div className="investigator-creator__result-block">
        <h4>Похідні показники</h4>
        <div className="investigator-creator__result-chars">
          <span>ОЗ: <b>{computeHP(chars)}</b></span>
          <span>
            Глузд: <b>{computeStartingSanity(chars)}</b> / Макс {MAX_SANITY_AT_CREATION}
          </span>
          <span>Талан: <b>{luck}</b></span>
          <span>Ухиляння: <b>{computeDodge(chars)}%</b></span>
          <span>Переміщення: <b>{computeMove(chars)}</b></span>
          <span>Будова: <b>{build.build}</b></span>
          <span>Бонусні пошкодження: <b>{build.damageBonus}</b></span>
          <span>Достаток: <b>{creditRating(draft.occupationId)}%</b></span>
        </div>
      </div>

      <div className="investigator-creator__result-block">
        <h4>Характеристики та уміння</h4>
        <div className="investigator-creator__stat-table">
          {CHAR_ORDER.map((k) => {
            const lvl = successLevels(chars[k]);
            return (
              <div key={k} className="investigator-creator__stat-row">
                <span className="investigator-creator__stat-icon">📊</span>
                <span className="investigator-creator__stat-name">
                  {k} <span className="investigator-creator__char-fullname">({CHAR_FULL_NAMES[k]})</span>
                </span>
                <span className="investigator-creator__stat-values">
                  <b>{lvl.regular}</b>
                  <span>{lvl.hard} / {lvl.extreme}</span>
                </span>
              </div>
            );
          })}
          {allocatedSkills.map((name) => {
            const value = skillFinalValue(name, draft.occupationSkillPoints, draft.personalSkillPoints);
            const lvl = successLevels(value);
            return (
              <div key={name} className="investigator-creator__stat-row">
                <span className="investigator-creator__stat-icon">{skillIcon(name)}</span>
                <span className="investigator-creator__stat-name">{name}</span>
                <span className="investigator-creator__stat-values">
                  <b>{lvl.regular}%</b>
                  <span>{lvl.hard}% / {lvl.extreme}%</span>
                </span>
              </div>
            );
          })}
        </div>
        <p className="investigator-creator__hint investigator-creator__hint--spaced">
          Перше число — звичайний успіх, друге — складний / екстремальний.
        </p>
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

      <div className="investigator-creator__result-block">
        <h4>Спорядження і майно</h4>
        <div className="investigator-creator__result-chars">
          {[...occ.startingGear, ...draft.extraGear].map((g, i) => (
            <span key={`${g}-${i}`}>
              {gearIcon(g)} {g}
            </span>
          ))}
        </div>
      </div>

      <div className="investigator-creator__result-block">
        <h4>Багатство</h4>
        <div className="investigator-creator__result-chars">
          <span>У кишені: <b>{wealth.cash}</b></span>
          <span>Заощадження: <b>{wealth.savings}</b></span>
          <span>Активи: <b>{wealth.assets}</b></span>
        </div>
      </div>

      <button type="button" className="investigator-creator__download-btn" onClick={onDownload}>
        ⬇ Завантажити лист персонажа
      </button>
      <div className="investigator-creator__transfer-note">
        <span className="investigator-creator__transfer-note-icon">✒️</span>
        <div>
          <strong>Персонажа створено! Перенесіть ці дані собі в лист.</strong>
          <p>
            Файл містить усі згенеровані дані у зручному текстовому вигляді — перепишіть їх власноруч на офіційний
            лист дослідника (розділ "Створення" → "Лист дослідника"), а поля "Моя історія" й "Передісторія"
            допишіть самі.
          </p>
        </div>
      </div>
    </div>
  );
}

export default InvestigatorCreator;
