import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { saveBlob } from "./export/save";
import type {
  AppSettings,
  AppState,
  DocumentSet,
  OrgInfo,
  SignatoryMap,
  StepId,
} from "../types";
import {
  SETTINGS_DEFAULT,
  blankSet,
  personFullName,
} from "../data/defaults";
import {
  monthDates,
  dateRange,
  sortDates,
  THAI_MONTHS,
} from "./thai";

const STORAGE_KEY = "otform.state.v1";

export interface NewSetInput {
  month: number;
  year: number;
  issueDate: string;
  dateMode: DocumentSet["dateMode"];
  rangeStart?: string;
  rangeEnd?: string;
  selectedDates: string[];
  staffIds: string[];
  org: OrgInfo;
  controllerId: string;
  title?: string;
}

interface AppContextValue {
  state: AppState;
  settings: AppSettings;
  sets: DocumentSet[];
  sessionProfile: AppState["session"];
  currentProfile: AppSettings["profiles"][number] | null;
  login: (profileId: string) => void;
  logout: () => void;
  createSet: (input: NewSetInput) => DocumentSet;
  updateSet: (id: string, updater: (set: DocumentSet) => DocumentSet) => void;
  deleteSet: (id: string) => void;
  duplicateSet: (id: string) => DocumentSet | null;
  updateSettings: (updater: (settings: AppSettings) => AppSettings) => void;
  resetSettings: () => void;
  markStepComplete: (id: string, step: StepId) => void;
  reopenStep: (id: string, step: StepId) => void;
  exportBackup: () => void;
  importBackup: (file: File) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function renderNumberPattern(
  pattern: string,
  values: { run: number; year: number; month: number },
): string {
  return pattern
    .replaceAll("{run}", String(values.run))
    .replaceAll("{year}", String(values.year))
    .replaceAll("{month}", String(values.month).padStart(2, "0"))
    .replaceAll("{monthName}", THAI_MONTHS[values.month - 1]);
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { settings: structuredClone(SETTINGS_DEFAULT), sets: [], session: null };
    }
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const settings = mergeSettings(parsed.settings);
    return {
      settings,
      sets: Array.isArray(parsed.sets) ? (parsed.sets as DocumentSet[]) : [],
      session: parsed.session ?? null,
    };
  } catch {
    return { settings: structuredClone(SETTINGS_DEFAULT), sets: [], session: null };
  }
}

function migrateNumbering(
  input?: Partial<AppSettings["numbering"]>,
): AppSettings["numbering"] {
  const numbering = { ...SETTINGS_DEFAULT.numbering, ...(input ?? {}) };
  // Migrate the old default to the new blank order-number format.
  if (numbering.orderPattern === "{run}/{year}") {
    numbering.orderPattern = "......./{year}";
  }
  return numbering;
}

export function mergeSettings(input?: Partial<AppSettings>): AppSettings {
  if (!input) return structuredClone(SETTINGS_DEFAULT);
  return {
    org: { ...SETTINGS_DEFAULT.org, ...(input.org ?? {}) },
    staff: input.staff?.length ? input.staff : structuredClone(SETTINGS_DEFAULT.staff),
    shifts: input.shifts?.length ? input.shifts : structuredClone(SETTINGS_DEFAULT.shifts),
    signatories: {
      ...SETTINGS_DEFAULT.signatories,
      ...(input.signatories ?? {}),
    } as SignatoryMap,
    numbering: migrateNumbering(input.numbering),
    profiles: input.profiles?.length ? input.profiles : structuredClone(SETTINGS_DEFAULT.profiles),
  };
}

function persist(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Unable to persist OT-Form state", error);
  }
}

function allocateNumbers(settings: AppSettings, month: number, year: number) {
  const orderNumber = renderNumberPattern(settings.numbering.orderPattern, {
    run: settings.numbering.nextOrder,
    year,
    month,
  });
  const memoNumber = renderNumberPattern(settings.numbering.memoPattern, {
    run: settings.numbering.nextMemo,
    year,
    month,
  });
  const nextSettings: AppSettings = structuredClone(settings);
  if (settings.numbering.orderPattern.includes("{run}")) {
    nextSettings.numbering.nextOrder += 1;
  }
  if (settings.numbering.memoPattern.includes("{run}")) {
    nextSettings.numbering.nextMemo += 1;
  }
  return { orderNumber, memoNumber, nextSettings };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    persist(state);
  }, [state]);

  const currentProfile = useMemo(() => {
    if (!state.session) return null;
    return state.settings.profiles.find((p) => p.id === state.session?.profileId) ?? null;
  }, [state.session, state.settings.profiles]);

  const login = (profileId: string) => {
    setState((prev) => ({
      ...prev,
      session: { profileId, loginAt: new Date().toISOString() },
    }));
  };

  const logout = () => {
    setState((prev) => ({ ...prev, session: null }));
  };

  const createSet = (input: NewSetInput): DocumentSet => {
    const base = blankSet(state.settings);
    let selectedDates = sortDates(input.selectedDates);
    if (selectedDates.length === 0) {
      selectedDates =
        input.dateMode === "month"
          ? monthDates(input.year, input.month)
          : input.dateMode === "range"
            ? dateRange(input.rangeStart ?? "", input.rangeEnd ?? "")
            : [];
    }

    const { orderNumber, memoNumber, nextSettings } = allocateNumbers(
      state.settings,
      input.month,
      input.year,
    );

    const staff = state.settings.staff.filter((person) => input.staffIds.includes(person.id));
    const controllerPerson =
      staff.find((person) => person.id === input.controllerId) ?? staff[0] ?? null;

    const title =
      input.title?.trim() ||
      `ค่าตอบแทนนอกเวลา ${THAI_MONTHS[input.month - 1]} ${input.year}`;

    const signatories = structuredClone(state.settings.signatories);
    if (controllerPerson) {
      signatories.controller = {
        name: personFullName(controllerPerson),
        position: controllerPerson.position,
      };
    }

    const set: DocumentSet = {
      ...base,
      id: uid(),
      title,
      month: input.month,
      year: input.year,
      issueDate: input.issueDate,
      dateMode: input.dateMode,
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      selectedDates,
      org: { ...input.org },
      orderNumber,
      memoNumber,
      staffIds: input.staffIds,
      controllerId: input.controllerId,
      rateOverrides: Object.fromEntries(
        staff.map((person) => [person.id, person.ratePerHour]),
      ),
      signatories,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      settings: nextSettings,
      sets: [set, ...prev.sets],
    }));

    return set;
  };

  const updateSet = (id: string, updater: (set: DocumentSet) => DocumentSet) => {
    setState((prev) => ({
      ...prev,
      sets: prev.sets.map((set) =>
        set.id === id ? { ...updater(set), updatedAt: new Date().toISOString() } : set,
      ),
    }));
  };

  const deleteSet = (id: string) => {
    setState((prev) => ({ ...prev, sets: prev.sets.filter((set) => set.id !== id) }));
  };

  const duplicateSet = (id: string): DocumentSet | null => {
    const source = state.sets.find((set) => set.id === id);
    if (!source) return null;
    const { orderNumber, memoNumber, nextSettings } = allocateNumbers(
      state.settings,
      source.month,
      source.year,
    );
    const copy: DocumentSet = {
      ...structuredClone(source),
      id: uid(),
      title: `${source.title} (สำเนา)`,
      orderNumber,
      memoNumber,
      completedSteps: [],
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      settings: nextSettings,
      sets: [copy, ...prev.sets],
    }));
    return copy;
  };

  const updateSettings = (updater: (settings: AppSettings) => AppSettings) => {
    setState((prev) => ({ ...prev, settings: updater(prev.settings) }));
  };

  const resetSettings = () => {
    setState((prev) => ({ ...prev, settings: structuredClone(SETTINGS_DEFAULT) }));
  };

  const markStepComplete = (id: string, step: StepId) => {
    updateSet(id, (set) => {
      const completed = new Set<StepId>(set.completedSteps);
      completed.add(step);
      const sorted = [...completed].sort((a, b) => a - b) as StepId[];
      return {
        ...set,
        completedSteps: sorted,
        status: sorted.length >= 5 ? "completed" : "in_progress",
      };
    });
  };

  const reopenStep = (id: string, step: StepId) => {
    updateSet(id, (set) => ({
      ...set,
      completedSteps: set.completedSteps.filter((s) => s < step),
      status: "in_progress",
    }));
  };

  const exportBackup = () => {
    const payload = {
      app: "ot-form",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: state.settings,
      sets: state.sets,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    void saveBlob(blob, `ot-form-backup-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const importBackup = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as {
      app?: string;
      settings?: Partial<AppSettings>;
      sets?: DocumentSet[];
    };
    if (parsed.app && parsed.app !== "ot-form") {
      throw new Error("ไฟล์สำรองไม่ใช่ของ OT-Form");
    }
    if (!Array.isArray(parsed.sets)) {
      throw new Error("ไม่พบรายการชุดเอกสารในไฟล์สำรอง");
    }
    const settings = mergeSettings(parsed.settings);
    setState((prev) => ({
      ...prev,
      settings,
      sets: parsed.sets as DocumentSet[],
    }));
  };

  const value: AppContextValue = {
    state,
    settings: state.settings,
    sets: state.sets,
    sessionProfile: state.session,
    currentProfile,
    login,
    logout,
    createSet,
    updateSet,
    deleteSet,
    duplicateSet,
    updateSettings,
    resetSettings,
    markStepComplete,
    reopenStep,
    exportBackup,
    importBackup,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}

export function setProgress(set: DocumentSet): number {
  return Math.round((set.completedSteps.length / 5) * 100);
}

export function isStepUnlocked(set: DocumentSet, step: StepId): boolean {
  if (step === 1) return true;
  return set.completedSteps.includes((step - 1) as StepId);
}
