export type UnitKey =
  | 'PIMPINAN'
  | 'PAWAS'
  | 'SAMAPTA'
  | 'LANTAS'
  | 'BHABIN'
  | 'INTEL'
  | 'RESKRIM'
  | 'STANBY'
  | 'SPK'
  | 'JAGA_BANK'
  | 'SIUM';

export type ShiftCode =
  | ''
  | 'X'
  | 'L'
  | 'S'
  | 'M'
  | 'P'
  | 'C'
  | 'C1'
  | 'C2';

export type CycleType =
  | 'NONE'
  | 'INTERVAL_X'     // 1 shift 'X' every N days (PAWAS, BHABIN)
  | 'CYCLE_SML'      // Continuous 3-day S -> M -> L (SAMAPTA, LANTAS, SPK)
  | 'CYCLE_INTEL'    // Continuous 4-day C1 -> C2 -> P -> L
  | 'CYCLE_RESKRIM'; // Continuous 3-day C -> P -> L

export type HighlightColor = 'none' | 'red' | 'yellow';

export interface Personnel {
  id: string;
  unit: UnitKey;
  unitNo: number;
  name: string;
  pangkat: string;
  nrp: string;
  jabatan: string;
  ket: string;
  cycleType: CycleType;
  cycleLength: number;
  phaseOnOct31: number;
  highlightColor?: HighlightColor;
  dutyPaused?: boolean;
  pausedFromDate?: string; // YYYY-MM-DD
}

export interface PawasAnchor {
  dateKey: string; // YYYY-MM-DD
  personnelId: string;
}

export interface RosterOrgHeader {
  line1: string;
  line2: string;
  line3: string;
  documentPrefix: string;
  signerTitle: string;
  signerRank: string;
  signerName: string;
  signerNrp: string;
}

export type ShiftOverrides = Record<string, ShiftCode>; // key: `${personnelId}__${YYYY-MM-DD}`

export type AppTab =
  | 'dashboard'
  | 'matrix'
  | 'daily'
  | 'rengiat'
  | 'pam'
  | 'buat-sprin'
  | 'personnel'
  | 'export'
  | 'backup';

export type RengiatPlacePreset =
  | 'LAP. MAPOLRESTABES SMG'
  | 'AULA MAPOLRESTABES SMG'
  | 'R.RUPATAMA MAPOLRESTABES SMG'
  | 'MAPOLSEK SMG SELATAN'
  | 'TENTATIF'
  | 'LAINNYA';

export type RengiatExecutorPreset =
  | 'KAPOLSEK'
  | 'WAKAPOLSEK'
  | 'PAWAS'
  | 'ANGGOTA YG TERSEPRIN'
  | 'LAINNYA';

export interface RengiatItem {
  id: string;
  dateKey: string; // YYYY-MM-DD
  timeMode: 'WIB' | 'TENTATIF';
  timeValue: string; // e.g. '08.00'
  title: string;
  placePreset: RengiatPlacePreset;
  placeCustom: string;
  executorPresets: RengiatExecutorPreset[];
  executorCustom: string;
  notes?: string;
}

export type PamMode = 'AKSI' | 'GIAT';

export interface PamPersonEntry {
  id: string;
  sourcePersonnelId?: string;
  name: string;
  pangkat: string;
  nrp: string;
  jabatan: string;
  ket: string;
  unitLabel?: UnitKey | 'MANUAL';
  shiftCode?: ShiftCode | 'PAWAS' | 'MANUAL';
}

export interface SavedPamRoster {
  id: string;
  mode: PamMode;
  dateKey: string; // YYYY-MM-DD
  title: string;
  savedAt: string;
  entries: PamPersonEntry[];
}

export interface ScheduleRevision {
  effectiveFrom: string; // YYYY-MM-DD
  personnel: Personnel[];
  pawasAnchor: PawasAnchor;
}

export interface RosterBackupPayload {
  app: 'kuat-pers-jadwal-piket';
  version: number;
  exportedAt: string;
  data: {
    header: RosterOrgHeader;
    personnel: Personnel[];
    unitOrder: UnitKey[];
    pawasAnchor: PawasAnchor;
    overrides: ShiftOverrides;
    scheduleRevisions?: ScheduleRevision[];
  };
}

export interface LegendItem {
  code: string;
  label: string;
}
