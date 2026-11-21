import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
} from 'lucide-react';
import { SprinDocument } from '../types/sprin';

export type FullscreenBodyTab = 'pertimbangan' | 'dasar' | 'untuk' | 'semua';

interface FullscreenBodyEditorModalProps {
  isOpen: boolean;
  initialTab: FullscreenBodyTab;
  doc: SprinDocument;
  onChange: (updated: SprinDocument) => void;
  onClose: () => void;
}

export const FullscreenBodyEditorModal: React.FC<FullscreenBodyEditorModalProps> = ({
  isOpen,
  initialTab,
  doc,
  onChange,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<FullscreenBodyTab>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const updateField = <K extends keyof SprinDocument>(key: K, value: SprinDocument[K]) => {
    onChange({
      ...doc,
      [key]: value,
      updatedAt: new Date().toISOString(),
    });
  };

  const updateListItem = (key: 'dasarList' | 'untukList', index: number, value: string) => {
    const next = [...doc[key]];
    next[index] = value;
    updateField(key, next);
  };

  const addListItem = (key: 'dasarList' | 'untukList', defaultText: string) => {
    updateField(key, [...doc[key], defaultText]);
  };

  const removeListItem = (key: 'dasarList' | 'untukList', index: number) => {
    if (doc[key].length <= 1) return;
    updateField(
      key,
      doc[key].filter((_, i) => i !== index)
    );
  };

  const moveListItem = (key: 'dasarList' | 'untukList', index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= doc[key].length) return;
    const next = [...doc[key]];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    updateField(key, next);
  };

  const wordCount = (text: string) => {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  };

  const tabs: { id: FullscreenBodyTab; label: string }[] = [
    { id: 'pertimbangan', label: '1. Pertimbangan' },
    { id: 'dasar', label: `2. Dasar Hukum & Surat (${doc.dasarList.length})` },
    { id: 'untuk', label: `3. Untuk / Perintah Tugas (${doc.untukList.length})` },
    { id: 'semua', label: 'Semua (3 Bagian)' },
  ];

  const showPertimbangan = activeTab === 'pertimbangan' || activeTab === 'semua';
  const showDasar = activeTab === 'dasar' || activeTab === 'semua';
  const showUntuk = activeTab === 'untuk' || activeTab === 'semua';

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0F0C08] text-[#F5F0E6] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Mode Layar Penuh Pengisian Isi Surat Perintah"
    >
      {/* Top Header */}
      <header className="px-4 sm:px-8 py-3.5 bg-[#17120D] border-b border-[#3A3024] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#D4A017]/15 border border-[#D4A017]/50 flex items-center justify-center shrink-0">
            <Maximize2 className="w-4 h-4 text-[#D4A017]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-base sm:text-lg font-bold tracking-wide text-[#F7F2E8] uppercase">
                Mode Layar Penuh — Pengisian Isi Sprin
              </h2>
              <span className="text-xs font-mono-num text-[#D4A017] bg-[#251E16] border border-[#4A3D2C] px-2 py-0.5 rounded">
                {doc.nomorSprin}
              </span>
            </div>
            <p className="text-xs text-[#9E907A] truncate">
              Pertimbangan · Dasar Hukum &amp; Surat · Untuk (Poin Perintah Tugas)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4A017] hover:bg-[#E5B022] text-xs font-bold text-[#14100C] transition-colors cursor-pointer shrink-0"
        >
          <Minimize2 className="w-4 h-4" />
          <span>Selesai &amp; Tutup (Esc)</span>
        </button>
      </header>

      {/* Section Switcher Bar */}
      <div className="px-4 sm:px-8 py-2.5 bg-[#14100C] border-b border-[#2E251B] flex flex-wrap items-center gap-2 shrink-0">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-[#D4A017] text-[#14100C]'
                  : 'bg-[#1E1812] text-[#B5A894] border border-[#3A3024] hover:text-[#F5F0E6] hover:border-[#5C4C38]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Fullscreen Editor Body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
        <div
          className={`max-w-5xl mx-auto ${
            activeTab === 'pertimbangan' ? 'h-full flex flex-col' : 'space-y-8'
          }`}
        >
          {/* 1. PERTIMBANGAN */}
          {showPertimbangan && (
            <section
              className={`rounded-xl bg-[#1A140E] border border-[#3A3024] p-5 sm:p-6 ${
                activeTab === 'pertimbangan' ? 'flex-1 flex flex-col' : 'space-y-3'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-display text-base font-bold tracking-wide text-[#F4C94D] uppercase">
                    Pertimbangan
                  </h3>
                  <p className="text-xs text-[#9E907A] mt-0.5">
                    Uraian alasan atau pertimbangan diterbitkannya Surat Perintah.
                  </p>
                </div>
                <span className="text-xs font-mono-num text-[#9E907A]">
                  {wordCount(doc.pertimbangan)} kata · {doc.pertimbangan.length} karakter
                </span>
              </div>

              <textarea
                autoFocus={activeTab === 'pertimbangan'}
                rows={activeTab === 'pertimbangan' ? undefined : 5}
                value={doc.pertimbangan}
                onChange={(e) => updateField('pertimbangan', e.target.value)}
                placeholder="Tuliskan pertimbangan surat perintah..."
                className={`w-full rounded-xl bg-[#120E0A] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-4 py-3.5 text-sm sm:text-base text-[#F5F0E6] leading-relaxed resize-y ${
                  activeTab === 'pertimbangan' ? 'flex-1 min-h-[340px]' : ''
                }`}
              />
            </section>
          )}

          {/* 2. DASAR HUKUM & SURAT */}
          {showDasar && (
            <section className="rounded-xl bg-[#1A140E] border border-[#3A3024] p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-bold tracking-wide text-[#F4C94D] uppercase">
                    Dasar Hukum &amp; Surat ({doc.dasarList.length})
                  </h3>
                  <p className="text-xs text-[#9E907A] mt-0.5">
                    Undang-undang, peraturan, telegram, atau nota dinas yang menjadi dasar pelaksanaan tugas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addListItem('dasarList', 'Dasar tambahan...')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D4A017] hover:bg-[#E5B022] text-xs font-bold text-[#14100C] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Dasar</span>
                </button>
              </div>

              <div className="space-y-3.5">
                {doc.dasarList.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-[#120E0A] border border-[#362C21] p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-num text-xs font-bold text-[#D4A017] bg-[#251E16] border border-[#4A3D2C] px-2.5 py-0.5 rounded">
                          Dasar #{idx + 1}
                        </span>
                        <span className="text-[11px] font-mono-num text-[#8C7E69]">
                          {wordCount(item)} kata
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveListItem('dasarList', idx, -1)}
                          aria-label={`Naikkan Dasar ${idx + 1}`}
                          className="p-1.5 rounded-lg bg-[#1E1812] text-[#B5A894] hover:text-[#F5F0E6] disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === doc.dasarList.length - 1}
                          onClick={() => moveListItem('dasarList', idx, 1)}
                          aria-label={`Turunkan Dasar ${idx + 1}`}
                          className="p-1.5 rounded-lg bg-[#1E1812] text-[#B5A894] hover:text-[#F5F0E6] disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        {doc.dasarList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeListItem('dasarList', idx)}
                            aria-label={`Hapus Dasar ${idx + 1}`}
                            className="p-1.5 rounded-lg bg-[#1E1812] text-[#B5A894] hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <textarea
                      autoFocus={activeTab === 'dasar' && idx === 0}
                      rows={activeTab === 'dasar' ? 4 : 3}
                      value={item}
                      onChange={(e) => updateListItem('dasarList', idx, e.target.value)}
                      placeholder={`Isi dasar ke-${idx + 1}...`}
                      className="w-full rounded-lg bg-[#1A140E] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3.5 py-2.5 text-sm sm:text-base text-[#F5F0E6] leading-relaxed"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addListItem('dasarList', 'Dasar tambahan...')}
                className="w-full py-2.5 rounded-lg border border-dashed border-[#4A3D2C] hover:border-[#D4A017] text-xs font-semibold text-[#D4A017] hover:bg-[#251E16]/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Poin Dasar Baru</span>
              </button>
            </section>
          )}

          {/* 3. UNTUK (POIN PERINTAH TUGAS) */}
          {showUntuk && (
            <section className="rounded-xl bg-[#1A140E] border border-[#3A3024] p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-bold tracking-wide text-[#F4C94D] uppercase">
                    Untuk (Poin Perintah Tugas) ({doc.untukList.length})
                  </h3>
                  <p className="text-xs text-[#9E907A] mt-0.5">
                    Rincian instruksi dan perintah tugas yang harus dilaksanakan personel.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addListItem('untukList', 'Poin perintah tugas baru;')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D4A017] hover:bg-[#E5B022] text-xs font-bold text-[#14100C] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Poin</span>
                </button>
              </div>

              <div className="space-y-3.5">
                {doc.untukList.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-[#120E0A] border border-[#362C21] p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-num text-xs font-bold text-[#D4A017] bg-[#251E16] border border-[#4A3D2C] px-2.5 py-0.5 rounded">
                          Poin #{idx + 1}
                        </span>
                        <span className="text-[11px] font-mono-num text-[#8C7E69]">
                          {wordCount(item)} kata
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveListItem('untukList', idx, -1)}
                          aria-label={`Naikkan Poin ${idx + 1}`}
                          className="p-1.5 rounded-lg bg-[#1E1812] text-[#B5A894] hover:text-[#F5F0E6] disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === doc.untukList.length - 1}
                          onClick={() => moveListItem('untukList', idx, 1)}
                          aria-label={`Turunkan Poin ${idx + 1}`}
                          className="p-1.5 rounded-lg bg-[#1E1812] text-[#B5A894] hover:text-[#F5F0E6] disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        {doc.untukList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeListItem('untukList', idx)}
                            aria-label={`Hapus Poin ${idx + 1}`}
                            className="p-1.5 rounded-lg bg-[#1E1812] text-[#B5A894] hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <textarea
                      autoFocus={activeTab === 'untuk' && idx === 0}
                      rows={activeTab === 'untuk' ? 4 : 3}
                      value={item}
                      onChange={(e) => updateListItem('untukList', idx, e.target.value)}
                      placeholder={`Isi poin perintah tugas ke-${idx + 1}...`}
                      className="w-full rounded-lg bg-[#1A140E] border border-[#3D3225] focus:border-[#D4A017] focus:outline-none px-3.5 py-2.5 text-sm sm:text-base text-[#F5F0E6] leading-relaxed"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addListItem('untukList', 'Poin perintah tugas baru;')}
                className="w-full py-2.5 rounded-lg border border-dashed border-[#4A3D2C] hover:border-[#D4A017] text-xs font-semibold text-[#D4A017] hover:bg-[#251E16]/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Poin Perintah Tugas Baru</span>
              </button>
            </section>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <footer className="px-4 sm:px-8 py-3 bg-[#17120D] border-t border-[#3A3024] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <span className="text-xs text-[#9E907A]">
          Perubahan tersimpan otomatis dan langsung diterapkan ke pratinjau A4.
        </span>

        <div className="flex items-center gap-2">
          {activeTab === 'dasar' && (
            <button
              type="button"
              onClick={() => setActiveTab('pertimbangan')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#251E16] border border-[#4A3D2C] hover:border-[#D4A017] text-xs font-semibold text-[#F5F0E6] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Pertimbangan</span>
            </button>
          )}
          {activeTab === 'untuk' && (
            <button
              type="button"
              onClick={() => setActiveTab('dasar')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#251E16] border border-[#4A3D2C] hover:border-[#D4A017] text-xs font-semibold text-[#F5F0E6] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dasar Hukum &amp; Surat</span>
            </button>
          )}

          {activeTab === 'pertimbangan' && (
            <button
              type="button"
              onClick={() => setActiveTab('dasar')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#251E16] border border-[#D4A017]/60 hover:bg-[#32291E] text-xs font-semibold text-[#F4C94D] cursor-pointer"
            >
              <span>Lanjut: Dasar Hukum &amp; Surat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {activeTab === 'dasar' && (
            <button
              type="button"
              onClick={() => setActiveTab('untuk')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#251E16] border border-[#D4A017]/60 hover:bg-[#32291E] text-xs font-semibold text-[#F4C94D] cursor-pointer"
            >
              <span>Lanjut: Untuk (Perintah Tugas)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D4A017] hover:bg-[#E5B022] text-xs font-bold text-[#14100C] cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Selesai &amp; Lihat Surat</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
