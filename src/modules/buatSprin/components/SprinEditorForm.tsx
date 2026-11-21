import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  ChevronDown,
  FileSpreadsheet,
  Layers,
  Lock,
  Maximize2,
  PenTool,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Stamp,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react';
import { FullscreenBodyEditorModal, FullscreenBodyTab } from './FullscreenBodyEditorModal';
import {
  DEFAULT_LAMPIRAN_COL_WIDTHS,
  DEFAULT_STAMP_CONFIG,
  DEFAULT_STAMP_IMAGE_URL,
  getNormalizedLampiranColWidths,
  getSprinContinuationHeaderTitle,
  isLockedLampiranCol,
  LAMPIRAN_COL_MIN_WIDTHS,
  LOCKED_LAMPIRAN_COL_RULES,
  mergePersonnelByNrp,
  UNLOCKED_LAMPIRAN_TOTAL_MM,
} from '../data/defaultData';
import {
  LampiranColumnWidths,
  PersonnelRow,
  SprinDocument,
  StampSignatureConfig,
} from '../types/sprin';
import { parsePersonnelExcel } from '../utils/importExcel';
import { DefaultSignatureGraphic } from './PolriEmblems';
import {
  PawasAnchor,
  Personnel,
  ScheduleRevision,
  ShiftCode,
  ShiftOverrides,
  UnitKey,
} from '../../../types/polriRoster';
import {
  DAY_NAMES_FULL_ID,
  getEffectivePersonnelForDate,
  getEffectiveShift,
  getOrderedUnitMeta,
  isPersonPausedOnDate,
  MONTH_NAMES_ID,
} from '../../../utils/continuousRoster';

export type EditorSectionId = 'hal1' | 'hal2' | 'daftarPers' | 'pengesahan' | 'ttd';

type PiketFilterMode = 'ALL' | 'ON_DUTY' | 'OFF_DUTY';

interface MainRosterEntry {
  person: Personnel;
  unitLabel: string;
  shiftCode: ShiftCode;
  isPaused: boolean;
  isOnDuty: boolean;
  shiftLabel: string;
}

function parseDateKeyParts(dateKey: string): {
  year: number;
  monthIndex: number;
  day: number;
} {
  const [y, m, d] = dateKey.split('-').map(Number);
  return {
    year: y || 2026,
    monthIndex: (m || 1) - 1,
    day: d || 1,
  };
}

function formatIndonesianDateLabel(dateKey: string): string {
  const { year, monthIndex, day } = parseDateKeyParts(dateKey);
  const dt = new Date(year, monthIndex, day);
  const dayName = DAY_NAMES_FULL_ID[dt.getDay()] ?? '';
  const monthName = MONTH_NAMES_ID[monthIndex] ?? '';
  return `${dayName}, ${day} ${monthName} ${year}`;
}

function getShiftDisplayLabel(unit: UnitKey, code: ShiftCode, isPaused: boolean): string {
  if (isPaused) return 'JEDA PIKET';
  switch (code) {
    case 'X':
      return unit === 'PAWAS' ? 'PIKET PAWAS (X)' : 'PIKET 24 JAM (X)';
    case 'S':
      return 'PIKET SIANG (S)';
    case 'M':
      return 'PIKET MALAM (M)';
    case 'P':
      return 'PIKET 24 JAM (P)';
    case 'C':
      return 'CADANGAN (C)';
    case 'C1':
      return 'CADANGAN 1 (C1)';
    case 'C2':
      return 'CADANGAN 2 (C2)';
    case 'L':
      return 'LEPAS DINAS (L)';
    default:
      return 'JAM DINAS / NON-SHIFT';
  }
}

interface SprinEditorFormProps {
  doc: SprinDocument;
  onChange: (updated: SprinDocument) => void;
  mainPersonnel: Personnel[];
  unitOrder: UnitKey[];
  pawasAnchor: PawasAnchor;
  overrides: ShiftOverrides;
  scheduleRevisions?: ScheduleRevision[];
  todayDateKey: string;
  piketDateKey: string;
  onChangePiketDateKey: (dateKey: string) => void;
  activeSection: EditorSectionId;
  onChangeSection: (section: EditorSectionId) => void;
  autoCatchword?: string;
}

export const SprinEditorForm: React.FC<SprinEditorFormProps> = ({
  doc,
  onChange,
  mainPersonnel,
  unitOrder,
  pawasAnchor,
  overrides,
  scheduleRevisions,
  todayDateKey,
  piketDateKey,
  onChangePiketDateKey,
  activeSection,
  onChangeSection,
  autoCatchword,
}) => {
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [piketFilterMode, setPiketFilterMode] = useState<PiketFilterMode>('ALL');
  const [unitFilter, setUnitFilter] = useState<'ALL' | UnitKey>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMainIds, setSelectedMainIds] = useState<string[]>([]);
  const [includeShiftInKet, setIncludeShiftInKet] = useState(false);
  const [showSelectedPers, setShowSelectedPers] = useState(false);
  const [fullscreenTab, setFullscreenTab] = useState<FullscreenBodyTab | null>(null);
  const [excelError, setExcelError] = useState<string | null>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);
  const personnelExcelInputRef = useRef<HTMLInputElement>(null);

  const stampCfg: StampSignatureConfig = {
    ...DEFAULT_STAMP_CONFIG,
    ...(doc.stampConfig || {}),
  };

  const updateField = <K extends keyof SprinDocument>(key: K, value: SprinDocument[K]) => {
    onChange({
      ...doc,
      [key]: value,
      updatedAt: new Date().toISOString(),
    });
  };

  const updateStampConfig = <K extends keyof StampSignatureConfig>(
    key: K,
    value: StampSignatureConfig[K]
  ) => {
    onChange({
      ...doc,
      showStampAndSignature: true,
      stampConfig: {
        ...stampCfg,
        [key]: value,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleImageImport = (
    file: File | undefined,
    target: 'stampImageDataUrl' | 'signatureImageDataUrl'
  ) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateStampConfig(target, reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePersonnelExcelImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      setExcelError(null);
      const result = await parsePersonnelExcel(file);
      if (result.rows.length === 0) {
        setExcelError('Tidak ada data personel terbaca dari file Excel.');
        return;
      }
      const merged = mergePersonnelByNrp(doc.personelList, result.rows);
      onChange({
        ...doc,
        personelList: merged,
        useLampiran: doc.useLampiran || merged.length > 5,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setExcelError(
        err instanceof Error ? err.message : 'Gagal membaca file Excel (.xlsx/.xls/.csv).'
      );
    }
  };

  // List helpers for Dasar, Untuk, Tembusan
  const updateListItem = (
    key: 'dasarList' | 'untukList' | 'tembusanList',
    index: number,
    value: string
  ) => {
    const next = [...doc[key]];
    next[index] = value;
    updateField(key, next);
  };

  const addListItem = (key: 'dasarList' | 'untukList' | 'tembusanList', placeholder: string) => {
    updateField(key, [...doc[key], placeholder]);
  };

  const removeListItem = (key: 'dasarList' | 'untukList' | 'tembusanList', index: number) => {
    const next = doc[key].filter((_, i) => i !== index);
    updateField(key, next);
  };

  // Personnel table helpers
  const updatePersonnel = (id: string, field: keyof PersonnelRow, value: string) => {
    const next = doc.personelList.map((row) =>
      row.id === id ? { ...row, [field]: value } : row
    );
    updateField('personelList', next);
  };

  const addBlankPersonnel = () => {
    const newRow: PersonnelRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nama: '',
      pangkat: 'AIPDA',
      nrp: '',
      jabatan: '',
      ket: '',
    };
    const nextList = [...doc.personelList, newRow];
    onChange({
      ...doc,
      personelList: nextList,
      useLampiran: doc.useLampiran || nextList.length > 5,
      updatedAt: new Date().toISOString(),
    });
  };

  const orderedUnits = useMemo(() => getOrderedUnitMeta(unitOrder), [unitOrder]);

  const rosterEntries = useMemo<MainRosterEntry[]>(() => {
    const { year, monthIndex, day } = parseDateKeyParts(piketDateKey);
    const { personnel: monthPersonnel, pawasAnchor: datePawasAnchor } =
      getEffectivePersonnelForDate(
        mainPersonnel,
        year,
        monthIndex,
        day,
        scheduleRevisions,
        pawasAnchor
      );
    const entries: MainRosterEntry[] = [];

    for (const unitMeta of orderedUnits) {
      const members = monthPersonnel.filter((p) => p.unit === unitMeta.key);
      for (const person of members) {
        const isPaused = isPersonPausedOnDate(person, piketDateKey);
        const shiftCode: ShiftCode = isPaused
          ? ''
          : getEffectiveShift(
              person,
              year,
              monthIndex,
              day,
              overrides,
              monthPersonnel,
              datePawasAnchor
            ).code;
        const isOnDuty = !isPaused && shiftCode !== '' && shiftCode !== 'L';
        entries.push({
          person,
          unitLabel: unitMeta.label,
          shiftCode,
          isPaused,
          isOnDuty,
          shiftLabel: getShiftDisplayLabel(person.unit, shiftCode, isPaused),
        });
      }
    }

    return entries;
  }, [mainPersonnel, orderedUnits, piketDateKey, overrides, pawasAnchor, scheduleRevisions]);

  const onDutyCount = useMemo(
    () => rosterEntries.filter((e) => e.isOnDuty).length,
    [rosterEntries]
  );

  const offDutyCount = useMemo(
    () => rosterEntries.filter((e) => !e.isOnDuty).length,
    [rosterEntries]
  );

  const isAlreadyInDoc = (person: Personnel) => {
    const nrpNorm = person.nrp.trim();
    const nameNorm = person.name.trim().toUpperCase();
    return doc.personelList.some((p) => {
      if (nrpNorm && p.nrp.trim() === nrpNorm) return true;
      return !nrpNorm && p.nama.trim().toUpperCase() === nameNorm;
    });
  };

  const filteredRosterEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rosterEntries.filter((entry) => {
      if (piketFilterMode === 'ON_DUTY' && !entry.isOnDuty) return false;
      if (piketFilterMode === 'OFF_DUTY' && entry.isOnDuty) return false;
      if (unitFilter !== 'ALL' && entry.person.unit !== unitFilter) return false;
      if (!q) return true;
      return (
        entry.person.name.toLowerCase().includes(q) ||
        entry.person.pangkat.toLowerCase().includes(q) ||
        entry.person.nrp.toLowerCase().includes(q) ||
        entry.person.jabatan.toLowerCase().includes(q) ||
        entry.unitLabel.toLowerCase().includes(q) ||
        entry.shiftLabel.toLowerCase().includes(q)
      );
    });
  }, [rosterEntries, piketFilterMode, unitFilter, searchQuery]);

  const addMainPersonnelBatch = (entries: MainRosterEntry[]) => {
    const existingNrps = new Set(
      doc.personelList.map((p) => p.nrp.trim()).filter(Boolean)
    );
    const existingNames = new Set(
      doc.personelList.map((p) => p.nama.trim().toUpperCase()).filter(Boolean)
    );

    const addedRows: PersonnelRow[] = [];
    for (const entry of entries) {
      const nrpNorm = entry.person.nrp.trim();
      const nameNorm = entry.person.name.trim().toUpperCase();
      if (nrpNorm && existingNrps.has(nrpNorm)) continue;
      if (!nrpNorm && existingNames.has(nameNorm)) continue;

      if (nrpNorm) existingNrps.add(nrpNorm);
      if (nameNorm) existingNames.add(nameNorm);

      addedRows.push({
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        nama: entry.person.name,
        pangkat: entry.person.pangkat,
        nrp: entry.person.nrp,
        jabatan: entry.person.jabatan,
        ket:
          includeShiftInKet && entry.isOnDuty
            ? entry.shiftLabel
            : entry.person.ket || '',
      });
    }

    if (addedRows.length === 0) return;

    const nextList = [...doc.personelList, ...addedRows];
    onChange({
      ...doc,
      personelList: nextList,
      useLampiran: doc.useLampiran || nextList.length > 5,
      updatedAt: new Date().toISOString(),
    });
    setSelectedMainIds((prev) =>
      prev.filter((id) => !entries.some((e) => e.person.id === id))
    );
  };

  const toggleSelectMainId = (personId: string) => {
    setSelectedMainIds((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId]
    );
  };

  const openTambahPersonelModal = (initialFilter?: PiketFilterMode) => {
    if (initialFilter) setPiketFilterMode(initialFilter);
    setSelectedMainIds([]);
    setShowRosterModal(true);
  };

  const movePersonnel = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= doc.personelList.length) return;
    const next = [...doc.personelList];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    updateField('personelList', next);
  };

  const removePersonnel = (id: string) => {
    updateField(
      'personelList',
      doc.personelList.filter((r) => r.id !== id)
    );
  };

  const colWidths = getNormalizedLampiranColWidths(doc.lampiranColWidths);

  const LAMPIRAN_COLS_META: { key: keyof LampiranColumnWidths; label: string }[] = [
    { key: 'no', label: 'NO' },
    { key: 'nama', label: 'NAMA' },
    { key: 'pangkat', label: 'PANGKAT' },
    { key: 'nrp', label: 'NRP' },
    { key: 'jabatan', label: 'JABATAN' },
    { key: 'ket', label: 'KET' },
  ];

  const updateLampiranColWidth = (targetKey: keyof LampiranColumnWidths, rawValue: number) => {
    if (Number.isNaN(rawValue) || isLockedLampiranCol(targetKey)) return;
    const otherKeys = LAMPIRAN_COLS_META.map((c) => c.key).filter(
      (k) => k !== targetKey && !isLockedLampiranCol(k)
    );
    const otherMinSum = otherKeys.reduce((s, k) => s + LAMPIRAN_COL_MIN_WIDTHS[k], 0);
    const minVal = LAMPIRAN_COL_MIN_WIDTHS[targetKey];
    const maxVal = UNLOCKED_LAMPIRAN_TOTAL_MM - otherMinSum;
    const targetVal = +Math.max(minVal, Math.min(maxVal, rawValue)).toFixed(1);

    const remainingTotal = UNLOCKED_LAMPIRAN_TOTAL_MM - targetVal;
    const remainingSlack = remainingTotal - otherMinSum;
    const currentSlackSum = otherKeys.reduce(
      (s, k) => s + Math.max(0, colWidths[k] - LAMPIRAN_COL_MIN_WIDTHS[k]),
      0
    );

    const nextWidths: LampiranColumnWidths = { ...colWidths, [targetKey]: targetVal };
    otherKeys.forEach((k) => {
      const baseMin = LAMPIRAN_COL_MIN_WIDTHS[k];
      const ratio =
        currentSlackSum > 0.01
          ? Math.max(0, colWidths[k] - baseMin) / currentSlackSum
          : 1 / otherKeys.length;
      nextWidths[k] = +(baseMin + remainingSlack * ratio).toFixed(1);
    });

    // Distribute rounding residual onto the widest unlocked other column so unlocked sum === UNLOCKED_LAMPIRAN_TOTAL_MM
    const unlockedSumNow = nextWidths.nama + nextWidths.jabatan + nextWidths.ket;
    const residual = +(UNLOCKED_LAMPIRAN_TOTAL_MM - unlockedSumNow).toFixed(1);
    if (Math.abs(residual) > 0) {
      const adjustKey = otherKeys.reduce((best, k) =>
        nextWidths[k] > nextWidths[best] ? k : best
      );
      nextWidths[adjustKey] = +Math.max(
        LAMPIRAN_COL_MIN_WIDTHS[adjustKey],
        nextWidths[adjustKey] + residual
      ).toFixed(1);
    }

    updateField('lampiranColWidths', nextWidths);
  };

  const sections: { id: EditorSectionId; shortLabel: string }[] = [
    { id: 'hal1', shortLabel: '1. Hal 1' },
    { id: 'hal2', shortLabel: doc.useLampiran ? '2. Hal 2' : '2. Kepada' },
    { id: 'daftarPers', shortLabel: '3. Daftar Pers' },
    { id: 'pengesahan', shortLabel: '4. Pejabat' },
    { id: 'ttd', shortLabel: '5. TTD & Stempel' },
  ];

  const availableFilteredEntries = filteredRosterEntries.filter((e) => !isAlreadyInDoc(e.person));

  const renderTambahPersonelPicker = (isModal: boolean) => (
    <>
      {/* Pilihan Tanggal Piket & Filter Controls */}
      <div
        className={
          isModal
            ? 'px-5 py-3.5 bg-[#15110C] border-b border-[#32291E] space-y-3'
            : 'p-3.5 rounded-xl bg-[#15110C] border border-[#3D3225] space-y-3'
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F4C94D]">
              <Calendar className="w-3.5 h-3.5" />
              <span>Tanggal Piket:</span>
            </label>
            <input
              type="date"
              value={piketDateKey}
              onChange={(e) => {
                if (e.target.value) onChangePiketDateKey(e.target.value);
              }}
              aria-label="Tanggal piket daftar pers"
              className="rounded-lg bg-[#1E1812] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-2.5 py-1.5 text-xs text-[#F5F0E6] font-mono-num"
            />
            {piketDateKey !== todayDateKey && (
              <button
                type="button"
                onClick={() => onChangePiketDateKey(todayDateKey)}
                className="px-2.5 py-1.5 rounded-lg bg-[#251E16] border border-[#4A3D2C] hover:border-[#D4A017] text-xs font-semibold text-[#F4C94D] cursor-pointer"
              >
                Hari Ini
              </button>
            )}
            <span className="text-xs text-[#B5A894]">
              {formatIndonesianDateLabel(piketDateKey)}
            </span>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-[#C8BCA8] cursor-pointer">
            <input
              type="checkbox"
              checked={includeShiftInKet}
              onChange={(e) => setIncludeShiftInKet(e.target.checked)}
              className="accent-[#D4A017] rounded cursor-pointer"
            />
            <span>Isi kolom KET sesuai shift piket</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#1E1812] border border-[#32291E]">
            <button
              type="button"
              onClick={() => setPiketFilterMode('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                piketFilterMode === 'ALL'
                  ? 'bg-[#D4A017] text-[#14100C]'
                  : 'text-[#A89C89] hover:text-[#F5F0E6]'
              }`}
            >
              Semua ({rosterEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setPiketFilterMode('ON_DUTY')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                piketFilterMode === 'ON_DUTY'
                  ? 'bg-[#D4A017] text-[#14100C]'
                  : 'text-[#A89C89] hover:text-[#F5F0E6]'
              }`}
            >
              Yang Piket ({onDutyCount})
            </button>
            <button
              type="button"
              onClick={() => setPiketFilterMode('OFF_DUTY')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                piketFilterMode === 'OFF_DUTY'
                  ? 'bg-[#D4A017] text-[#14100C]'
                  : 'text-[#A89C89] hover:text-[#F5F0E6]'
              }`}
            >
              Lepas / Non-Shift ({offDutyCount})
            </button>
          </div>

          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value as 'ALL' | UnitKey)}
            aria-label="Filter satuan"
            className="rounded-lg bg-[#1E1812] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-2.5 py-1.5 text-xs text-[#F5F0E6] cursor-pointer"
          >
            <option value="ALL">Semua Satuan</option>
            {orderedUnits.map((u) => (
              <option key={u.key} value={u.key}>
                {u.label}
              </option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-[#8C7E69] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, pangkat, NRP, jabatan..."
              className="w-full rounded-lg bg-[#1E1812] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none pl-8 pr-3 py-1.5 text-xs text-[#F5F0E6]"
            />
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 text-xs text-[#9E907A]">
            <span>
              Menampilkan <strong className="text-[#F5F0E6]">{filteredRosterEntries.length}</strong> personel
            </span>
            {selectedMainIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedMainIds([])}
                className="text-[#D4A017] hover:underline cursor-pointer"
              >
                Batal pilih ({selectedMainIds.length})
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedMainIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const chosen = rosterEntries.filter((e) =>
                    selectedMainIds.includes(e.person.id)
                  );
                  addMainPersonnelBatch(chosen);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Tambahkan Terpilih ({selectedMainIds.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => addMainPersonnelBatch(availableFilteredEntries)}
              disabled={availableFilteredEntries.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#251E16] border border-[#D4A017]/60 hover:bg-[#D4A017] hover:text-[#14100C] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-[#F4C94D] transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambahkan Semua Hasil ({availableFilteredEntries.length})</span>
            </button>
          </div>
        </div>
      </div>

      <div
        className={
          isModal
            ? 'flex-1 overflow-y-auto divide-y divide-[#2E251B]'
            : 'max-h-[480px] overflow-y-auto rounded-xl bg-[#15110C] border border-[#32291E] divide-y divide-[#2E251B]'
        }
      >
        {filteredRosterEntries.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-[#9E907A]">
            Tidak ada personel yang sesuai filter pada tanggal piket ini.
          </div>
        ) : (
          filteredRosterEntries.map((entry) => {
            const { person, unitLabel, isOnDuty, isPaused, shiftLabel } = entry;
            const alreadyAdded = isAlreadyInDoc(person);
            const isSelected = selectedMainIds.includes(person.id);
            return (
              <div
                key={person.id}
                className={`${isModal ? 'px-5' : 'px-3.5'} py-3 flex items-center justify-between gap-3 hover:bg-[#251E16]`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    disabled={alreadyAdded}
                    checked={alreadyAdded || isSelected}
                    onChange={() => toggleSelectMainId(person.id)}
                    aria-label={`Pilih ${person.name}`}
                    className="accent-[#D4A017] rounded shrink-0 cursor-pointer disabled:opacity-40"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#F5F0E6] uppercase truncate">
                        {person.pangkat} {person.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#2A2218] border border-[#3D3225] text-[10px] font-semibold text-[#D6C8B4] uppercase">
                        {unitLabel}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          isPaused
                            ? 'bg-red-950/60 border border-red-700/50 text-red-300'
                            : isOnDuty
                              ? 'bg-emerald-950/70 border border-emerald-600/60 text-emerald-300'
                              : 'bg-[#15110C] border border-[#32291E] text-[#9E907A]'
                        }`}
                      >
                        {shiftLabel}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#9E907A] font-mono-num truncate mt-0.5">
                      NRP {person.nrp || '-'} · {person.jabatan}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => addMainPersonnelBatch([entry])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                    alreadyAdded
                      ? 'bg-[#2A2218] text-[#8C7E69] cursor-not-allowed'
                      : 'bg-[#D4A017] text-[#14100C] hover:bg-[#E5B022]'
                  }`}
                >
                  {alreadyAdded ? 'Terdaftar' : 'Tambahkan'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      {/* Interactive Section Switcher Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl bg-[#19140E] border border-[#3A3024]">
        {sections.map((sec) => {
          const active = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => onChangeSection(sec.id)}
              className={`flex-1 min-w-[112px] px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-[#D4A017] text-[#14100C]'
                  : 'text-[#B5A894] hover:text-[#F5F0E6] hover:bg-[#251E16]'
              }`}
            >
              {sec.shortLabel}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: SURAT PERINTAH HALAMAN 1 (Matches Image 2) */}
      {activeSection === 'hal1' && (
        <section className="rounded-xl bg-[#1E1812] border border-[#3A3024] p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold tracking-wide text-[#F7F2E8] uppercase">
              1. ISI SURAT PERINTAH (HALAMAN 1)
            </h2>
            <span className="text-xs text-[#9E907A] font-mono-num">
              {doc.useLampiran ? 'Sprin + Lampiran' : 'Tanpa Lampiran'}
            </span>
          </div>

          {/* Konsep Format Surat Toggle */}
          <div className="rounded-xl bg-[#15110C] border border-[#3D3225] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-[#F5F0E6]">Konsep Format Surat</div>
              <span className="text-[11px] text-[#9E907A]">Maks 5 pers langsung</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={doc.personelList.length > 5}
                onClick={() => updateField('useLampiran', false)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  doc.personelList.length > 5
                    ? 'bg-[#19140E] border-[#2C241B] text-[#6D6252] cursor-not-allowed'
                    : !doc.useLampiran
                      ? 'bg-[#D4A017]/20 border-[#D4A017] text-[#F4C94D] cursor-pointer'
                      : 'bg-[#1E1812] border-[#362C21] text-[#A89C89] hover:text-[#F5F0E6] cursor-pointer'
                }`}
              >
                Tanpa Lampiran (1–5 Pers)
              </button>
              <button
                type="button"
                onClick={() => updateField('useLampiran', true)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  doc.useLampiran || doc.personelList.length > 5
                    ? 'bg-[#D4A017]/20 border-[#D4A017] text-[#F4C94D]'
                    : 'bg-[#1E1812] border-[#362C21] text-[#A89C89] hover:text-[#F5F0E6]'
                }`}
              >
                Dengan Lampiran (&gt; 5 Pers)
              </button>
            </div>
            {doc.personelList.length > 5 && (
              <p className="text-[11px] text-[#D4A017]">
                Personel berjumlah {doc.personelList.length} (&gt; 5), otomatis menggunakan halaman Lampiran sesuai ketentuan naskah dinas.
              </p>
            )}
          </div>

          <div className="space-y-3.5">
            <div className="grid grid-cols-1 gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-medium text-[#B5A894]">
                  Kop Surat Kesatuan (3 Baris)
                </label>
                <span className="text-[11px] font-mono-num text-[#9E907A]">Arial 12pt</span>
              </div>
              <input
                type="text"
                value={doc.kopLine1}
                onChange={(e) => updateField('kopLine1', e.target.value)}
                className="w-full rounded-lg bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3 py-2 font-arial-12 leading-[1.15] text-[#F5F0E6] uppercase"
              />
              <input
                type="text"
                value={doc.kopLine2}
                onChange={(e) => updateField('kopLine2', e.target.value)}
                className="w-full rounded-lg bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3 py-2 font-arial-12 leading-[1.15] text-[#F5F0E6] uppercase"
              />
              <input
                type="text"
                value={doc.kopLine3}
                onChange={(e) => updateField('kopLine3', e.target.value)}
                className="w-full rounded-lg bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3 py-2 font-arial-12 leading-[1.15] text-[#F5F0E6] uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#B5A894] mb-1.5">
                Nomor Surat Perintah
              </label>
              <input
                type="text"
                value={doc.nomorSprin}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({
                    ...doc,
                    nomorSprin: val,
                    lampiranNomor: val.toUpperCase(),
                    updatedAt: new Date().toISOString(),
                  });
                }}
                className="w-full rounded-lg bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3.5 py-2.5 text-sm text-[#F5F0E6] font-mono-num"
              />
            </div>

            {/* Pertimbangan (Mode Layar Penuh) */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="text-xs font-medium text-[#B5A894]">Pertimbangan</label>
                <button
                  type="button"
                  onClick={() => setFullscreenTab('pertimbangan')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#251E16] border border-[#D4A017]/50 hover:border-[#D4A017] text-[11px] font-semibold text-[#F4C94D] transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Mode Layar Penuh</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setFullscreenTab('pertimbangan')}
                className="w-full text-left rounded-lg bg-[#15110C] border border-[#3D3225] hover:border-[#D4A017] px-3.5 py-2.5 transition-colors cursor-pointer group"
              >
                <p className="text-xs text-[#F5F0E6] leading-relaxed line-clamp-3">
                  {doc.pertimbangan.trim() || (
                    <span className="text-[#8C7E69] italic">
                      Belum diisi — klik untuk mengisi Pertimbangan dalam mode layar penuh...
                    </span>
                  )}
                </p>
                <div className="mt-2 pt-1.5 border-t border-[#2A2218] flex items-center justify-between text-[11px] text-[#9E907A] group-hover:text-[#F4C94D]">
                  <span>Klik untuk mengisi dalam mode layar penuh</span>
                  <span className="font-mono-num">{doc.pertimbangan.length} kar</span>
                </div>
              </button>
            </div>

            {/* Dasar List (Mode Layar Penuh) */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="text-xs font-medium text-[#B5A894]">
                  Dasar Hukum &amp; Surat ({doc.dasarList.length})
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      addListItem('dasarList', 'Dasar tambahan...');
                      setFullscreenTab('dasar');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#D4A017] hover:text-[#F4C94D] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFullscreenTab('dasar')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#251E16] border border-[#D4A017]/50 hover:border-[#D4A017] text-[11px] font-semibold text-[#F4C94D] transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Mode Layar Penuh</span>
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFullscreenTab('dasar')}
                className="w-full text-left rounded-lg bg-[#15110C] border border-[#3D3225] hover:border-[#D4A017] px-3.5 py-2.5 transition-colors cursor-pointer group space-y-1.5"
              >
                {doc.dasarList.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-[#F5F0E6] leading-relaxed">
                    <span className="font-mono-num text-[#D4A017] shrink-0">{idx + 1}.</span>
                    <span className="line-clamp-2">{item}</span>
                  </div>
                ))}
                <div className="pt-1.5 border-t border-[#2A2218] flex items-center justify-between text-[11px] text-[#9E907A] group-hover:text-[#F4C94D]">
                  <span>Klik untuk mengisi &amp; menyusun dasar dalam mode layar penuh</span>
                  <span className="font-mono-num">{doc.dasarList.length} item</span>
                </div>
              </button>
            </div>

            {doc.useLampiran ? (
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-xs font-medium text-[#B5A894]">Kepada</label>
                  <button
                    type="button"
                    onClick={() => openTambahPersonelModal()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#D4A017] hover:bg-[#E5B022] text-[11px] font-bold text-[#14100C] transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Tambah Personel ({doc.personelList.length})</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={doc.kepadaText}
                  onChange={(e) => updateField('kepadaText', e.target.value)}
                  className="w-full rounded-lg bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3.5 py-2 text-xs text-[#F5F0E6] uppercase leading-relaxed"
                />
              </div>
            ) : (
              <div className="rounded-lg bg-[#15110C] border border-[#3D3225] p-3 flex flex-wrap items-center justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[#B5A894]">
                    Kepada ({doc.personelList.length} Personel)
                  </div>
                  <div className="text-[11px] text-[#9E907A] truncate mt-0.5">
                    {doc.personelList.length > 0
                      ? doc.personelList.map((p) => `${p.pangkat} ${p.nama}`).join(', ')
                      : 'Belum ada personel dipilih'}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openTambahPersonelModal()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#D4A017] hover:bg-[#E5B022] text-xs font-bold text-[#14100C] transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Tambah Personel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeSection('daftarPers')}
                    className="px-2.5 py-1.5 rounded-lg bg-[#251E16] border border-[#4A3D2C] hover:border-[#D4A017] text-xs font-semibold text-[#F4C94D] cursor-pointer"
                  >
                    Atur
                  </button>
                </div>
              </div>
            )}

            {/* Untuk List (Mode Layar Penuh) */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="text-xs font-medium text-[#B5A894]">
                  Untuk (Poin Perintah Tugas) ({doc.untukList.length})
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      addListItem('untukList', 'Poin perintah tugas baru;');
                      setFullscreenTab('untuk');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#D4A017] hover:text-[#F4C94D] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFullscreenTab('untuk')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#251E16] border border-[#D4A017]/50 hover:border-[#D4A017] text-[11px] font-semibold text-[#F4C94D] transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Mode Layar Penuh</span>
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFullscreenTab('untuk')}
                className="w-full text-left rounded-lg bg-[#15110C] border border-[#3D3225] hover:border-[#D4A017] px-3.5 py-2.5 transition-colors cursor-pointer group space-y-1.5"
              >
                {doc.untukList.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-[#F5F0E6] leading-relaxed">
                    <span className="font-mono-num text-[#D4A017] shrink-0">{idx + 1}.</span>
                    <span className="line-clamp-2">{item}</span>
                  </div>
                ))}
                <div className="pt-1.5 border-t border-[#2A2218] flex items-center justify-between text-[11px] text-[#9E907A] group-hover:text-[#F4C94D]">
                  <span>Klik untuk mengisi &amp; menyusun poin perintah dalam mode layar penuh</span>
                  <span className="font-mono-num">{doc.untukList.length} poin</span>
                </div>
              </button>
            </div>

            {/* Tembusan List */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#B5A894]">Tembusan</label>
                <button
                  type="button"
                  onClick={() => addListItem('tembusanList', 'Kasi Propam Polrestabes Smg')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#D4A017] hover:text-[#F4C94D] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Tembusan</span>
                </button>
              </div>
              <div className="space-y-2">
                {doc.tembusanList.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="font-mono-num text-xs text-[#9E907A] w-5 shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateListItem('tembusanList', idx, e.target.value)}
                      className="flex-1 rounded-lg bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3 py-2 text-xs text-[#F5F0E6]"
                    />
                    {doc.tembusanList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeListItem('tembusanList', idx)}
                        aria-label="Hapus tembusan"
                        className="p-2 text-[#9E907A] hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Kata Sambung (Catchword) */}
            <div className="pt-2 border-t border-[#32291E]">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="text-xs font-medium text-[#B5A894]">
                  Kata Sambung Halaman Berikutnya (Opsional)
                </label>
                {(doc.kataSambung || '').trim() !== '' && (
                  <button
                    type="button"
                    onClick={() => updateField('kataSambung', '')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D4A017] hover:text-[#F4C94D] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Gunakan Otomatis</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={doc.kataSambung ?? ''}
                onChange={(e) => updateField('kataSambung', e.target.value)}
                placeholder="Otomatis saat > 1 halaman (misal: 4. melaporkan .....)"
                className="w-full rounded-lg bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3 py-2 text-xs text-[#F5F0E6]"
              />
              <p className="text-[11px] text-[#9E907A] mt-1">
                {autoCatchword
                  ? `Otomatis terdeteksi: "${autoCatchword}"`
                  : 'Ditampilkan di kanan bawah halaman yang bersambung ke halaman berikutnya.'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 2: LAMPIRAN & DAFTAR PERSONEL HALAMAN 2 (Matches Image 3) */}
      {activeSection === 'hal2' && (
        <section className="rounded-xl bg-[#1E1812] border border-[#3A3024] p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold tracking-wide text-[#F7F2E8] uppercase">
              {doc.useLampiran
                ? '2. LAMPIRAN PERSONEL'
                : '2. PERSONEL YANG DIPERINTAHKAN (KEPADA)'}
            </h2>
            <span className="text-xs text-[#9E907A] font-mono-num">
              {doc.personelList.length} Pers
            </span>
          </div>

          <div className="rounded-xl bg-[#15110C] border border-[#3D3225] p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#F5F0E6]">
                Header Kanan Atas (Halaman 2+)
              </span>
              <span className="text-[11px] text-[#9E907A]">
                Muncul otomatis setelah halaman 1
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#B5A894] mb-1">
                Judul Header Lanjutan Isi Sprin (Hal. 2+ Surat)
              </label>
              <input
                type="text"
                value={doc.sprinHeaderTitle ?? ''}
                onChange={(e) => updateField('sprinHeaderTitle', e.target.value)}
                placeholder={`Otomatis: ${getSprinContinuationHeaderTitle({ lampiranHeaderTitle: doc.lampiranHeaderTitle })}`}
                className="w-full rounded-lg bg-[#1E1812] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3 py-2 text-xs text-[#F5F0E6] uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#B5A894] mb-1">
                Judul Header Halaman Lampiran
              </label>
              <input
                type="text"
                value={doc.lampiranHeaderTitle}
                onChange={(e) => updateField('lampiranHeaderTitle', e.target.value)}
                placeholder="LAMP SPRIN KAPOLSEK SMG SELATAN"
                className="w-full rounded-lg bg-[#1E1812] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3 py-2 text-xs text-[#F5F0E6] uppercase"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#B5A894] mb-1">
                  Nomor Header (Hal. 2+)
                </label>
                <input
                  type="text"
                  value={doc.lampiranNomor}
                  onChange={(e) => updateField('lampiranNomor', e.target.value)}
                  className="w-full rounded-lg bg-[#1E1812] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3 py-2 text-xs text-[#F5F0E6] font-mono-num uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B5A894] mb-1">
                  Tanggal Header (Kapital)
                </label>
                <input
                  type="text"
                  value={doc.lampiranTanggalUpper}
                  onChange={(e) => updateField('lampiranTanggalUpper', e.target.value)}
                  className="w-full rounded-lg bg-[#1E1812] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3 py-2 text-xs text-[#F5F0E6] font-mono-num uppercase"
                />
              </div>
            </div>
          </div>

          {doc.useLampiran && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#B5A894] mb-1">
                  Judul Daftar Personel
                </label>
                <input
                  type="text"
                  value={doc.lampiranJudul}
                  onChange={(e) => updateField('lampiranJudul', e.target.value)}
                  className="w-full rounded-lg bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3 py-2 text-xs text-[#F5F0E6] uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#B5A894] mb-1">
                  Subjudul Hari & Tanggal Pelaksanaan
                </label>
                <input
                  type="text"
                  value={doc.lampiranSubjudul}
                  onChange={(e) => updateField('lampiranSubjudul', e.target.value)}
                  className="w-full rounded-lg bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3 py-2 text-xs text-[#F5F0E6] uppercase"
                />
              </div>

              {/* Pengaturan Lebar Kolom Tabel Lampiran */}
              <div className="rounded-xl bg-[#15110C] border border-[#3D3225] p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#D4A017]" />
                    <span className="text-xs font-semibold text-[#F5F0E6]">
                      Lebar Kolom Tabel (Total 170 mm)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField('lampiranColWidths', { ...DEFAULT_LAMPIRAN_COL_WIDTHS })}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D4A017] hover:text-[#F4C94D] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Default</span>
                  </button>
                </div>

                <p className="text-[11px] text-[#9E907A]">
                  Kolom <strong className="text-[#F4C94D]">NO (2 huruf)</strong>,{' '}
                  <strong className="text-[#F4C94D]">PANGKAT (7 huruf)</strong>, dan{' '}
                  <strong className="text-[#F4C94D]">NRP (8 huruf)</strong> dikunci otomatis. Geser slider kolom lainnya atau batas JABATAN &amp; KET di pratinjau.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LAMPIRAN_COLS_META.map(({ key, label }) => {
                    const locked = isLockedLampiranCol(key);
                    const lockedRule = LOCKED_LAMPIRAN_COL_RULES[key];
                    const otherUnlockedMinSum = LAMPIRAN_COLS_META.filter(
                      (c) => c.key !== key && !isLockedLampiranCol(c.key)
                    ).reduce((s, c) => s + LAMPIRAN_COL_MIN_WIDTHS[c.key], 0);
                    const minMm = LAMPIRAN_COL_MIN_WIDTHS[key];
                    const maxMm = locked
                      ? minMm
                      : UNLOCKED_LAMPIRAN_TOTAL_MM - otherUnlockedMinSum;
                    const currentMm = colWidths[key];

                    return (
                      <div
                        key={key}
                        className={`rounded-lg border px-2.5 py-2 space-y-1.5 ${
                          locked
                            ? 'bg-[#17120D] border-[#3A2E20]'
                            : 'bg-[#1E1812] border-[#362C21]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] font-semibold text-[#F5F0E6]">
                              {label}
                            </span>
                            {locked && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#2A2116] border border-[#D4A017]/40 text-[9px] font-semibold text-[#F4C94D] whitespace-nowrap">
                                <Lock className="w-2.5 h-2.5" />
                                <span>{lockedRule}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              min={minMm}
                              max={maxMm}
                              step={0.5}
                              disabled={locked}
                              value={currentMm}
                              onChange={(e) => {
                                const parsed = parseFloat(e.target.value);
                                if (!Number.isNaN(parsed) && parsed >= minMm) {
                                  updateLampiranColWidth(key, parsed);
                                }
                              }}
                              aria-label={`Lebar kolom ${label} dalam milimeter`}
                              className="w-14 rounded bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-1.5 py-0.5 text-right text-[11px] font-mono-num text-[#F4C94D] disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                            <span className="text-[10px] font-mono-num text-[#9E907A]">mm</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={minMm}
                          max={maxMm}
                          step={0.5}
                          disabled={locked}
                          value={currentMm}
                          onChange={(e) => updateLampiranColWidth(key, parseFloat(e.target.value))}
                          aria-label={`Slider lebar kolom ${label}`}
                          className="w-full accent-[#D4A017] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </section>
      )}

      {/* SECTION 3: DAFTAR PERS (TERKONEKSI DAFTAR PERSONEL UTAMA) */}
      {activeSection === 'daftarPers' && (
        <section className="rounded-xl bg-[#1E1812] border border-[#3A3024] p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold tracking-wide text-[#F7F2E8] uppercase">
                3. DAFTAR PERS (TAMBAH PERSONEL)
              </h2>
              <p className="text-xs text-[#9E907A] mt-0.5">
                Terkoneksi langsung dengan Daftar Personel &amp; Jadwal Piket menu utama.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSelectedPers((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                showSelectedPers
                  ? 'bg-[#D4A017] border-[#D4A017] text-[#14100C]'
                  : 'bg-[#251E16] border-[#4A3D2C] hover:border-[#D4A017] text-[#F4C94D]'
              }`}
            >
              {showSelectedPers
                ? `← Kembali ke Daftar Utama`
                : `Terpilih: ${doc.personelList.length} Pers`}
            </button>
          </div>

          {!showSelectedPers ? (
            renderTambahPersonelPicker(false)
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#F5F0E6]">
                  Personel Terpilih di Sprin ({doc.personelList.length})
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={personnelExcelInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.ods"
                    className="hidden"
                    onChange={(e) => {
                      void handlePersonnelExcelImport(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => personnelExcelInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#4A3D2C] bg-[#251E16] hover:border-[#D4A017] text-xs font-semibold text-[#F5F0E6] transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#D4A017]" />
                    <span>Import Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={addBlankPersonnel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#4A3D2C] bg-[#251E16] hover:border-[#D4A017] text-xs font-semibold text-[#F5F0E6] transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#D4A017]" />
                    <span>Baris Manual</span>
                  </button>
                </div>
              </div>

              {excelError && (
                <div className="rounded-lg bg-[#2A1715] border border-red-700/60 px-3 py-2 text-xs text-red-200">
                  {excelError}
                </div>
              )}

              {doc.personelList.length === 0 ? (
                <div className="rounded-xl bg-[#15110C] border border-[#32291E] px-5 py-8 text-center text-xs text-[#9E907A]">
                  Belum ada personel terpilih di surat perintah ini.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-0.5">
                  {doc.personelList.map((row, idx) => (
                    <div
                      key={row.id}
                      className="rounded-lg bg-[#15110C] border border-[#362C21] p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-num text-xs font-semibold text-[#D4A017]">
                          Personel #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => movePersonnel(idx, -1)}
                            aria-label="Naikkan urutan"
                            className="p-1 rounded text-[#9E907A] hover:text-[#F5F0E6] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === doc.personelList.length - 1}
                            onClick={() => movePersonnel(idx, 1)}
                            aria-label="Turunkan urutan"
                            className="p-1 rounded text-[#9E907A] hover:text-[#F5F0E6] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removePersonnel(row.id)}
                            aria-label="Hapus personel"
                            className="p-1 rounded text-[#9E907A] hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={row.nama}
                          onChange={(e) => updatePersonnel(row.id, 'nama', e.target.value)}
                          placeholder="Nama Lengkap"
                          className="rounded bg-[#1E1812] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-2.5 py-1.5 text-xs text-[#F5F0E6] uppercase"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={row.pangkat}
                            onChange={(e) => updatePersonnel(row.id, 'pangkat', e.target.value)}
                            placeholder="Pangkat"
                            className="rounded bg-[#1E1812] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-2.5 py-1.5 text-xs text-[#F5F0E6] uppercase"
                          />
                          <input
                            type="text"
                            value={row.nrp}
                            onChange={(e) => updatePersonnel(row.id, 'nrp', e.target.value)}
                            placeholder="NRP"
                            className="rounded bg-[#1E1812] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-2.5 py-1.5 text-xs text-[#F5F0E6] font-mono-num"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={row.jabatan}
                          onChange={(e) => updatePersonnel(row.id, 'jabatan', e.target.value)}
                          placeholder="Jabatan"
                          className="sm:col-span-2 rounded bg-[#1E1812] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-2.5 py-1.5 text-xs text-[#F5F0E6] uppercase"
                        />
                        <input
                          type="text"
                          value={row.ket}
                          onChange={(e) => updatePersonnel(row.id, 'ket', e.target.value)}
                          placeholder="Ket (opsional)"
                          className="rounded bg-[#1E1812] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-2.5 py-1.5 text-xs text-[#F5F0E6] uppercase"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* SECTION 4: PENGESAHAN, PEJABAT & STEMPEL */}
      {activeSection === 'pengesahan' && (
        <section className="rounded-xl bg-[#1E1812] border border-[#3A3024] p-5 space-y-4">
          <h2 className="font-display text-lg font-bold tracking-wide text-[#F7F2E8] uppercase">
            4. PENGESAHAN, PEJABAT &amp; STEMPEL
          </h2>

          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#B5A894] mb-1.5">
                  Dikeluarkan di
                </label>
                <input
                  type="text"
                  value={doc.dikeluarkanDi}
                  onChange={(e) => updateField('dikeluarkanDi', e.target.value)}
                  className="w-full rounded-lg bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3.5 py-2 text-sm text-[#F5F0E6]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B5A894] mb-1.5">
                  Status Dokumen
                </label>
                <div className="relative">
                  <select
                    value={doc.status}
                    onChange={(e) =>
                      updateField('status', e.target.value as SprinDocument['status'])
                    }
                    className="w-full appearance-none rounded-lg bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none pl-3.5 pr-9 py-2 text-sm text-[#F5F0E6] cursor-pointer"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Siap Cetak">Siap Cetak</option>
                    <option value="Terbit">Terbit</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#B5A894] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-1 ${doc.useLampiran ? 'sm:grid-cols-2' : ''} gap-3`}>
              <div>
                <label className="block text-xs font-medium text-[#B5A894] mb-1.5">
                  {doc.useLampiran ? 'Tanggal Pengesahan Hal. 1' : 'Tanggal Pengesahan'}
                </label>
                <input
                  type="text"
                  value={doc.tanggalSuratHal1}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange({
                      ...doc,
                      tanggalSuratHal1: val,
                      lampiranTanggalUpper: !doc.useLampiran
                        ? val.replace(/\s+/g, ' ').trim().toUpperCase()
                        : doc.lampiranTanggalUpper,
                      updatedAt: new Date().toISOString(),
                    });
                  }}
                  className="w-full rounded-lg bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3.5 py-2 text-sm text-[#F5F0E6]"
                />
              </div>
              {doc.useLampiran && (
                <div>
                  <label className="block text-xs font-medium text-[#B5A894] mb-1.5">
                    Tanggal Pengesahan Hal. 2
                  </label>
                  <input
                    type="text"
                    value={doc.tanggalSuratHal2}
                    onChange={(e) => updateField('tanggalSuratHal2', e.target.value)}
                    className="w-full rounded-lg bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3.5 py-2 text-sm text-[#F5F0E6]"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#B5A894] mb-1.5">
                Jabatan Penanda Tangan (1 Baris · Mepet Margin Kanan)
              </label>
              <input
                type="text"
                value={doc.pejabatJabatan.replace(/[\r\n]+/g, ' ')}
                onChange={(e) =>
                  updateField('pejabatJabatan', e.target.value.replace(/[\r\n]+/g, ' '))
                }
                className="w-full rounded-lg bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3.5 py-2 text-sm text-[#F5F0E6]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#B5A894] mb-1.5">
                  Nama Pejabat & Gelar
                </label>
                <input
                  type="text"
                  value={doc.pejabatNama}
                  onChange={(e) => updateField('pejabatNama', e.target.value)}
                  className="w-full rounded-lg bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3.5 py-2 text-sm text-[#F5F0E6] uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B5A894] mb-1.5">
                  Pangkat & NRP Pejabat
                </label>
                <input
                  type="text"
                  value={doc.pejabatPangkatNrp}
                  onChange={(e) => updateField('pejabatPangkatNrp', e.target.value)}
                  className="w-full rounded-lg bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3.5 py-2 text-sm text-[#F5F0E6] uppercase font-mono-num"
                />
              </div>
            </div>

            {/* Stamp & Digital Signature Toggle */}
            <div className="rounded-xl bg-[#15110C] border border-[#3D3225] p-3.5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Stamp className="w-5 h-5 text-[#D4A017] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-[#F5F0E6]">
                    Tampilkan Stempel & TTD Digital
                  </div>
                  <div className="text-[11px] text-[#9E907A] mt-0.5">
                    Matikan jika surat akan dicetak untuk tanda tangan dan stempel basah fisik.
                  </div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={doc.showStampAndSignature}
                onClick={() => updateField('showStampAndSignature', !doc.showStampAndSignature)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  doc.showStampAndSignature ? 'bg-[#D4A017]' : 'bg-[#3A3024]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#14100C] transition-transform ${
                    doc.showStampAndSignature ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {doc.showStampAndSignature && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#B5A894] mb-1">
                    Teks Lingkar Atas Stempel
                  </label>
                  <input
                    type="text"
                    value={doc.stampResorText}
                    onChange={(e) => updateField('stampResorText', e.target.value)}
                    className="w-full rounded-lg bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3 py-2 text-xs text-[#F5F0E6] uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#B5A894] mb-1">
                    Teks Lingkar Bawah Stempel
                  </label>
                  <input
                    type="text"
                    value={doc.stampSektorText}
                    onChange={(e) => updateField('stampSektorText', e.target.value)}
                    className="w-full rounded-lg bg-[#15110C] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3 py-2 text-xs text-[#F5F0E6] uppercase"
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* SECTION 5: IMPORT TANDA TANGAN & STEMPEL */}
      {activeSection === 'ttd' && (
        <section className="rounded-xl bg-[#1E1812] border border-[#3A3024] p-5 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold tracking-wide text-[#F7F2E8] uppercase">
              5. IMPORT TANDA TANGAN &amp; STEMPEL
            </h2>
            <button
              type="button"
              onClick={() => updateField('showStampAndSignature', !doc.showStampAndSignature)}
              className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                doc.showStampAndSignature
                  ? 'bg-[#D4A017] text-[#14100C]'
                  : 'bg-[#2A2218] text-[#B5A894]'
              }`}
            >
              {doc.showStampAndSignature ? 'Aktif di Surat' : 'Nonaktif'}
            </button>
          </div>

          {/* Layering Order Control (Default: Above Text) */}
          <div className="rounded-xl bg-[#15110C] border border-[#3D3225] p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F5F0E6]">
              <Layers className="w-4 h-4 text-[#D4A017]" />
              <span>Posisi Lapisan Terhadap Teks Surat</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateStampConfig('aboveText', true)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  stampCfg.aboveText
                    ? 'bg-[#D4A017]/20 border-[#D4A017] text-[#F4C94D]'
                    : 'bg-[#1E1812] border-[#362C21] text-[#A89C89] hover:text-[#F5F0E6]'
                }`}
              >
                Di Atas Teks (Default)
              </button>
              <button
                type="button"
                onClick={() => updateStampConfig('aboveText', false)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  !stampCfg.aboveText
                    ? 'bg-[#D4A017]/20 border-[#D4A017] text-[#F4C94D]'
                    : 'bg-[#1E1812] border-[#362C21] text-[#A89C89] hover:text-[#F5F0E6]'
                }`}
              >
                Di Bawah Teks
              </button>
            </div>
          </div>

          {/* IMPORT & ATUR STEMPEL (Default 4.7 cm) */}
          <div className="rounded-xl bg-[#15110C] border border-[#3D3225] p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Stamp className="w-4 h-4 text-[#D4A017]" />
                <span className="text-sm font-bold text-[#F5F0E6]">Stempel Kesatuan</span>
              </div>
              <span className="font-mono-num text-xs font-semibold text-[#F4C94D]">
                {stampCfg.stampSizeCm.toFixed(1).replace('.', ',')} cm
              </span>
            </div>

            {/* File Import Row */}
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg bg-white border border-[#4A3D2C] flex items-center justify-center p-1 shrink-0 overflow-hidden">
                <img
                  src={stampCfg.stampImageDataUrl || DEFAULT_STAMP_IMAGE_URL}
                  alt="Preview Stempel"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex-1 space-y-2">
                <input
                  ref={stampInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    handleImageImport(e.target.files?.[0], 'stampImageDataUrl');
                    e.target.value = '';
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => stampInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4A017] hover:bg-[#E5B022] text-xs font-bold text-[#14100C] transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Gambar Stempel</span>
                  </button>
                  {stampCfg.stampImageDataUrl &&
                    stampCfg.stampImageDataUrl !== DEFAULT_STAMP_IMAGE_URL && (
                      <button
                        type="button"
                        onClick={() =>
                          updateStampConfig('stampImageDataUrl', DEFAULT_STAMP_IMAGE_URL)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2A2218] hover:bg-red-950/60 text-xs font-medium text-[#E5B8B8] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Pakai Default</span>
                      </button>
                    )}
                </div>
                <label className="inline-flex items-center gap-2 text-[11px] text-[#B5A894] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stampCfg.stampMultiplyBlend}
                    onChange={(e) => updateStampConfig('stampMultiplyBlend', e.target.checked)}
                    className="accent-[#D4A017] rounded cursor-pointer"
                  />
                  <span>Tembus pandang latar putih (Multiply)</span>
                </label>
              </div>
            </div>

            {/* Stamp Size Control (Default 4.7 cm) */}
            <div className="space-y-1.5 pt-2 border-t border-[#2A2218]">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-[#B5A894]">
                  Ukuran Stempel (cm)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateStampConfig('stampSizeCm', 4.7)}
                    className="text-[11px] font-semibold text-[#D4A017] hover:underline cursor-pointer"
                  >
                    Standar 4,7 cm
                  </button>
                  <input
                    type="number"
                    step="0.1"
                    min="2.0"
                    max="8.0"
                    value={stampCfg.stampSizeCm}
                    onChange={(e) =>
                      updateStampConfig(
                        'stampSizeCm',
                        Math.max(1.5, Math.min(8.5, Number(e.target.value) || 4.7))
                      )
                    }
                    className="w-16 rounded bg-[#1E1812] border border-[#3D3225] px-2 py-1 text-xs text-right font-mono-num text-[#F5F0E6]"
                  />
                </div>
              </div>
              <input
                type="range"
                min="2.0"
                max="8.0"
                step="0.1"
                value={stampCfg.stampSizeCm}
                onChange={(e) => updateStampConfig('stampSizeCm', parseFloat(e.target.value))}
                className="w-full accent-[#D4A017] cursor-pointer"
              />
            </div>

            {/* Stamp Position X & Y */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between text-[11px] text-[#B5A894] mb-1">
                  <span>Posisi X (Kiri/Kanan)</span>
                  <span className="font-mono-num text-[#F5F0E6]">{stampCfg.stampOffsetXMm} mm</span>
                </div>
                <input
                  type="range"
                  min="-35"
                  max="65"
                  step="1"
                  value={stampCfg.stampOffsetXMm}
                  onChange={(e) =>
                    updateStampConfig('stampOffsetXMm', parseInt(e.target.value, 10))
                  }
                  className="w-full accent-[#D4A017] cursor-pointer"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] text-[#B5A894] mb-1">
                  <span>Posisi Y (Atas/Bawah)</span>
                  <span className="font-mono-num text-[#F5F0E6]">{stampCfg.stampOffsetYMm} mm</span>
                </div>
                <input
                  type="range"
                  min="-25"
                  max="50"
                  step="1"
                  value={stampCfg.stampOffsetYMm}
                  onChange={(e) =>
                    updateStampConfig('stampOffsetYMm', parseInt(e.target.value, 10))
                  }
                  className="w-full accent-[#D4A017] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* IMPORT & ATUR TANDA TANGAN */}
          <div className="rounded-xl bg-[#15110C] border border-[#3D3225] p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-[#D4A017]" />
                <span className="text-sm font-bold text-[#F5F0E6]">Tanda Tangan Pejabat</span>
              </div>
              <span className="font-mono-num text-xs font-semibold text-[#F4C94D]">
                {stampCfg.signatureWidthCm.toFixed(1).replace('.', ',')} cm
              </span>
            </div>

            {/* File Import Row */}
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg bg-white border border-[#4A3D2C] flex items-center justify-center p-1 shrink-0 overflow-hidden">
                {stampCfg.signatureImageDataUrl ? (
                  <img
                    src={stampCfg.signatureImageDataUrl}
                    alt="Preview Tanda Tangan"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <DefaultSignatureGraphic className="w-full h-auto" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  ref={sigInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    handleImageImport(e.target.files?.[0], 'signatureImageDataUrl');
                    e.target.value = '';
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => sigInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4A017] hover:bg-[#E5B022] text-xs font-bold text-[#14100C] transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Tanda Tangan</span>
                  </button>
                  {stampCfg.signatureImageDataUrl && (
                    <button
                      type="button"
                      onClick={() => updateStampConfig('signatureImageDataUrl', null)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2A2218] hover:bg-red-950/60 text-xs font-medium text-[#E5B8B8] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Pakai Default</span>
                    </button>
                  )}
                </div>
                <label className="inline-flex items-center gap-2 text-[11px] text-[#B5A894] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stampCfg.signatureMultiplyBlend}
                    onChange={(e) =>
                      updateStampConfig('signatureMultiplyBlend', e.target.checked)
                    }
                    className="accent-[#D4A017] rounded cursor-pointer"
                  />
                  <span>Tembus pandang latar putih (Multiply)</span>
                </label>
              </div>
            </div>

            {/* Signature Size Control */}
            <div className="space-y-1.5 pt-2 border-t border-[#2A2218]">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-[#B5A894]">
                  Ukuran Lebar Tanda Tangan (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1.5"
                  max="10.0"
                  value={stampCfg.signatureWidthCm}
                  onChange={(e) =>
                    updateStampConfig(
                      'signatureWidthCm',
                      Math.max(1.5, Math.min(10.0, Number(e.target.value) || 5.2))
                    )
                  }
                  className="w-16 rounded bg-[#1E1812] border border-[#3D3225] px-2 py-1 text-xs text-right font-mono-num text-[#F5F0E6]"
                />
              </div>
              <input
                type="range"
                min="1.5"
                max="10.0"
                step="0.1"
                value={stampCfg.signatureWidthCm}
                onChange={(e) =>
                  updateStampConfig('signatureWidthCm', parseFloat(e.target.value))
                }
                className="w-full accent-[#D4A017] cursor-pointer"
              />
            </div>

            {/* Signature Position X & Y */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between text-[11px] text-[#B5A894] mb-1">
                  <span>Posisi X (Kiri/Kanan)</span>
                  <span className="font-mono-num text-[#F5F0E6]">
                    {stampCfg.signatureOffsetXMm} mm
                  </span>
                </div>
                <input
                  type="range"
                  min="-35"
                  max="70"
                  step="1"
                  value={stampCfg.signatureOffsetXMm}
                  onChange={(e) =>
                    updateStampConfig('signatureOffsetXMm', parseInt(e.target.value, 10))
                  }
                  className="w-full accent-[#D4A017] cursor-pointer"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] text-[#B5A894] mb-1">
                  <span>Posisi Y (Atas/Bawah)</span>
                  <span className="font-mono-num text-[#F5F0E6]">
                    {stampCfg.signatureOffsetYMm} mm
                  </span>
                </div>
                <input
                  type="range"
                  min="-25"
                  max="55"
                  step="1"
                  value={stampCfg.signatureOffsetYMm}
                  onChange={(e) =>
                    updateStampConfig('signatureOffsetYMm', parseInt(e.target.value, 10))
                  }
                  className="w-full accent-[#D4A017] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Reset Posisi & Ukuran Default */}
          <button
            type="button"
            onClick={() =>
              updateField('stampConfig', {
                ...stampCfg,
                stampSizeCm: DEFAULT_STAMP_CONFIG.stampSizeCm,
                stampOffsetXMm: DEFAULT_STAMP_CONFIG.stampOffsetXMm,
                stampOffsetYMm: DEFAULT_STAMP_CONFIG.stampOffsetYMm,
                signatureWidthCm: DEFAULT_STAMP_CONFIG.signatureWidthCm,
                signatureOffsetXMm: DEFAULT_STAMP_CONFIG.signatureOffsetXMm,
                signatureOffsetYMm: DEFAULT_STAMP_CONFIG.signatureOffsetYMm,
                aboveText: true,
              })
            }
            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#4A3D2C] bg-[#15110C] hover:border-[#D4A017] text-xs font-semibold text-[#F5F0E6] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#D4A017]" />
            <span>Reset Posisi & Ukuran Default (Stempel 4,7 cm · Di Atas Teks)</span>
          </button>
        </section>
      )}

      {/* Tambah Personel Modal (Terkoneksi Daftar Personel & Jadwal Piket Menu Utama) */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4">
          <div className="w-full max-w-3xl rounded-xl bg-[#1E1812] border border-[#4A3D2C] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-[#3A3024] flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-[#F7F2E8] uppercase">
                  Tambah Personel (Daftar Personel Utama)
                </h3>
                <p className="text-xs text-[#9E907A]">
                  Terkoneksi langsung dengan Daftar Personel &amp; Jadwal Piket menu utama.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="px-3 py-1.5 rounded-lg bg-[#2A2218] text-xs font-semibold text-[#F5F0E6] hover:bg-[#3A3024] cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {renderTambahPersonelPicker(true)}
          </div>
        </div>
      )}
      {/* Fullscreen Body Editor (Pertimbangan, Dasar Hukum & Surat, Untuk) */}
      <FullscreenBodyEditorModal
        isOpen={fullscreenTab !== null}
        initialTab={fullscreenTab ?? 'pertimbangan'}
        doc={doc}
        onChange={onChange}
        onClose={() => setFullscreenTab(null)}
      />
    </div>
  );
};
