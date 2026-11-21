import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Eye, FileDown, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { ArchiveView } from './components/ArchiveView';
import { DashboardHeader } from './components/DashboardHeader';
import {
  computePageOneCatchword,
  LetterPageOne,
  useSprinPageOneSlices,
} from './components/LetterPageOne';
import {
  computeLampiranCatchword,
  LetterPageTwo,
  useLampiranPages,
} from './components/LetterPageTwo';
import { SidebarNav } from './components/SidebarNav';
import { EditorSectionId, SprinEditorForm } from './components/SprinEditorForm';
import {
  DEFAULT_LAMPIRAN_COL_WIDTHS,
  DEFAULT_SPRIN_DOCUMENT,
  DEFAULT_STAMP_CONFIG,
  DEFAULT_STAMP_IMAGE_URL,
  getNormalizedLampiranColWidths,
  INITIAL_ARCHIVE_DOCUMENTS,
  SPRIN_TEMPLATE_COLLECTION,
} from './data/defaultData';
import {
  AppView,
  LetterPreviewPage,
  SprinDocument,
  SprinTemplateItem,
} from './types/sprin';
import {
  PawasAnchor,
  Personnel,
  ScheduleRevision,
  ShiftOverrides,
  UnitKey,
} from '../../types/polriRoster';
import { exportSprinToWord } from './utils/exportDoc';
import { exportSprinToPdf } from './utils/exportPdf';

const STORAGE_KEYS = {
  ACTIVE_DOC: 'siprin_active_doc_v3',
  ARCHIVE: 'siprin_archive_docs_v3',
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeDoc(doc: SprinDocument): SprinDocument {
  const rawHeaderTitle = (doc.lampiranHeaderTitle || '').trim();
  const normalizedHeaderTitle =
    !rawHeaderTitle ||
    rawHeaderTitle === 'LAMPIRAN SPRIN KAPOLSEK SMG SLTN' ||
    rawHeaderTitle === 'LAMPIRAN  SPRIN  KAPOLSEK  SMG SLTN' ||
    rawHeaderTitle === 'SPRIN KAPOLSEK SMG SELATAN'
      ? 'LAMP SPRIN KAPOLSEK SMG SELATAN'
      : doc.lampiranHeaderTitle;

  const rawKepadaText = (doc.kepadaText || '').trim();
  const normalizedKepadaText = !rawKepadaText
    ? DEFAULT_SPRIN_DOCUMENT.kepadaText
    : doc.kepadaText;

  const personelCount = Array.isArray(doc.personelList) ? doc.personelList.length : 0;

  return {
    ...DEFAULT_SPRIN_DOCUMENT,
    ...doc,
    useLampiran: (doc.useLampiran ?? false) || personelCount > 5,
    kepadaText: normalizedKepadaText,
    lampiranHeaderTitle: normalizedHeaderTitle,
    lampiranColWidths: getNormalizedLampiranColWidths(doc.lampiranColWidths),
    stampConfig: {
      ...DEFAULT_STAMP_CONFIG,
      ...(doc.stampConfig || {}),
      stampImageDataUrl: doc.stampConfig?.stampImageDataUrl || DEFAULT_STAMP_IMAGE_URL,
    },
  };
}

export interface BuatSprinAppProps {
  mainPersonnel: Personnel[];
  unitOrder: UnitKey[];
  pawasAnchor: PawasAnchor;
  overrides: ShiftOverrides;
  scheduleRevisions?: ScheduleRevision[];
  todayDateKey: string;
}

export function BuatSprinApp({
  mainPersonnel,
  unitOrder,
  pawasAnchor,
  overrides,
  scheduleRevisions,
  todayDateKey,
}: BuatSprinAppProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<AppView>('editor');
  const [activeSection, setActiveSection] = useState<EditorSectionId>('hal1');
  const [previewPage, setPreviewPage] = useState<LetterPreviewPage>('both');
  const [zoom, setZoom] = useState<number>(0.72);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [piketDateKey, setPiketDateKey] = useState<string>(todayDateKey);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const [activeDoc, setActiveDoc] = useState<SprinDocument>(() =>
    normalizeDoc(readStorage<SprinDocument>(STORAGE_KEYS.ACTIVE_DOC, DEFAULT_SPRIN_DOCUMENT))
  );
  const [archiveDocs, setArchiveDocs] = useState<SprinDocument[]>(() =>
    readStorage<SprinDocument[]>(STORAGE_KEYS.ARCHIVE, INITIAL_ARCHIVE_DOCUMENTS).map(normalizeDoc)
  );

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_DOC, JSON.stringify(activeDoc));
    } catch {
      // ignore storage quota error
    }
  }, [activeDoc]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ARCHIVE, JSON.stringify(archiveDocs));
    } catch {
      // ignore
    }
  }, [archiveDocs]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Compute completion percentage for gold header bar
  const completionPercent = useMemo(() => {
    const checks = [
      Boolean(activeDoc.kopLine1.trim()),
      Boolean(activeDoc.kopLine2.trim()),
      Boolean(activeDoc.nomorSprin.trim()),
      Boolean(activeDoc.pertimbangan.trim()),
      activeDoc.dasarList.length > 0,
      activeDoc.untukList.length > 0,
      activeDoc.personelList.length > 0,
      Boolean(activeDoc.pejabatNama.trim()),
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [activeDoc]);

  const { chunks: lampiranPages, lampiranMeasurerNode } = useLampiranPages(activeDoc);

  const { slices: pageOneSlices, measurerNode } = useSprinPageOneSlices(activeDoc);
  const autoFirstPageCatchword =
    pageOneSlices.length > 1
      ? computePageOneCatchword(activeDoc, pageOneSlices[1])
      : undefined;
  const firstPageCatchword =
    (activeDoc.kataSambung || '').trim() || autoFirstPageCatchword || '';
  const totalPageCount = activeDoc.useLampiran
    ? pageOneSlices.length + lampiranPages.length
    : pageOneSlices.length;

  const handleSaveToArchive = () => {
    const stampedDoc: SprinDocument = {
      ...activeDoc,
      updatedAt: new Date().toISOString(),
    };
    setArchiveDocs((prev) => {
      const idx = prev.findIndex((d) => d.id === stampedDoc.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = stampedDoc;
        return next;
      }
      return [stampedDoc, ...prev];
    });
    showToast(`Surat ${stampedDoc.nomorSprin} disimpan ke arsip`);
  };

  const handleCreateNewSprin = () => {
    const nextNum = 214 + archiveDocs.length;
    const blankDoc: SprinDocument = {
      ...DEFAULT_SPRIN_DOCUMENT,
      id: `sprin-${Date.now()}`,
      status: 'Draft',
      useLampiran: false,
      updatedAt: new Date().toISOString(),
      nomorSprin: `Sprin/${nextNum}/XI/HUK.6.6./2026`,
      pertimbangan:
        'guna tertib administrasi khususnya dalam rangka pelaksanaan tugas di lingkungan Polsek Semarang Selatan, maka perlu diterbitkan surat perintah;',
      untukList: [
        'melaksanakan tugas sesuai ploting dan arahan pimpinan;',
        'melaksanakan perintah ini dengan seksama dan penuh rasa tanggung jawab;',
        'melaporkan hasil pelaksanaan kegiatan kepada Kapolsek Semarang Selatan;',
      ],
      lampiranNomor: `SPRIN/${nextNum}/XI/HUK.6.6./2026`,
      personelList: [],
    };
    setActiveDoc(blankDoc);
    setActiveView('editor');
    setActiveSection('hal1');
    showToast(`Draft Surat Perintah baru (${nextNum}) siap diisi`);
  };

  const handleLoadReferenceTemplate = () => {
    setActiveDoc({
      ...DEFAULT_SPRIN_DOCUMENT,
      updatedAt: new Date().toISOString(),
    });
    setActiveView('editor');
    setActiveSection('hal1');
    showToast('Template default Sprin/213/X/HUK.6.6./2026 (2 Halaman) dimuat ulang');
  };

  const handleApplyTemplate = (template: SprinTemplateItem) => {
    setActiveDoc({
      ...template.document,
      personelList: template.document.personelList.map((p) => ({ ...p })),
      dasarList: [...template.document.dasarList],
      untukList: [...template.document.untukList],
      tembusanList: [...template.document.tembusanList],
      lampiranColWidths: getNormalizedLampiranColWidths(
        template.document.lampiranColWidths || DEFAULT_LAMPIRAN_COL_WIDTHS
      ),
      stampConfig: {
        ...DEFAULT_STAMP_CONFIG,
        ...template.document.stampConfig,
      },
      updatedAt: new Date().toISOString(),
    });
    setActiveView('editor');
    setActiveSection('hal1');
    showToast(`Template "${template.name}" dimuat ke editor`);
  };

  const handleOpenFromArchive = (doc: SprinDocument) => {
    setActiveDoc({ ...doc });
    setActiveView('editor');
    showToast(`Membuka ${doc.nomorSprin}`);
  };

  const handleDuplicateArchive = (doc: SprinDocument) => {
    const copy: SprinDocument = {
      ...doc,
      id: `sprin-${Date.now()}`,
      status: 'Draft',
      nomorSprin: `${doc.nomorSprin} (Salinan)`,
      updatedAt: new Date().toISOString(),
    };
    setArchiveDocs((prev) => [copy, ...prev]);
    showToast('Surat berhasil diduplikasi ke arsip');
  };

  const handleDeleteArchive = (id: string) => {
    setArchiveDocs((prev) => prev.filter((d) => d.id !== id));
    showToast('Surat dihapus dari arsip');
  };

  const handleFocusFromLetter = (section: EditorSectionId) => {
    setActiveSection(section);
  };

  const handleExportPdf = async () => {
    if (!printContainerRef.current || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const pageCount = await exportSprinToPdf(printContainerRef.current, activeDoc.nomorSprin);
      showToast(`File .PDF (A4 · ${pageCount} Halaman) berhasil diunduh`);
    } catch {
      showToast('Gagal membuat file .PDF. Silakan coba lagi.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    const cleanup = () => {
      document.body.classList.remove('buat-sprin-printing');
    };
    document.body.classList.add('buat-sprin-printing');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, 4000);
    window.print();
    if (window.self !== window.top) {
      showToast('Jika dialog cetak diblokir di mode pratinjau, gunakan tombol "Cetak PDF" untuk mengunduh PDF siap cetak.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-88px)] flex flex-col bg-[#14100C] text-[#F5F0E6] rounded-xl border border-[#2f271d] overflow-hidden print:border-0 print:rounded-none print:bg-white print:text-black">
      {/* SCREEN WORKSPACE (Hidden during print) */}
      <div className="no-print flex flex-col flex-1 min-h-0">
        <DashboardHeader
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          onSaveToArchive={handleSaveToArchive}
          onExportWord={async () => {
            try {
              await exportSprinToWord(activeDoc, firstPageCatchword);
              showToast('File .DOCX (A4 · Arial 12pt · Margin 2,5 / 1,5 / 2 / 1,5 cm) diunduh');
            } catch {
              showToast('Gagal membuat file .DOCX');
            }
          }}
          onExportPdf={handleExportPdf}
          isExportingPdf={isExportingPdf}
          onPrint={handlePrint}
          completionPercent={completionPercent}
        />

        <div className="flex flex-1 min-h-0">
          <SidebarNav
            isOpen={sidebarOpen}
            onCloseMobile={() => setSidebarOpen(false)}
            activeView={activeView}
            activeEditorSection={activeSection}
            onSelectView={(view) => {
              setActiveView(view);
              if (view === 'editor' && activeSection === 'ttd') {
                setActiveSection('hal1');
              }
            }}
            onOpenTtdMenu={() => {
              setActiveView('editor');
              setActiveSection('ttd');
            }}
            archiveCount={archiveDocs.length}
            activeDocId={activeDoc.id}
            activeDocNumber={activeDoc.nomorSprin}
            useLampiran={activeDoc.useLampiran}
            pageCount={totalPageCount}
            templates={SPRIN_TEMPLATE_COLLECTION}
            onSelectTemplate={handleApplyTemplate}
            onNewBlankSprin={handleCreateNewSprin}
            onLoadReferenceTemplate={handleLoadReferenceTemplate}
          />

          <main className="flex-1 min-w-0 bg-[#14100C]">
            {activeView === 'editor' && (
              <div className="flex flex-col xl:flex-row h-full">
                {/* Left Column: Tactical Form Editor matching Image 1 */}
                <div className="w-full xl:w-[460px] 2xl:w-[500px] shrink-0 border-b xl:border-b-0 xl:border-r border-[#3A3024] p-4 lg:p-5 overflow-y-auto xl:max-h-[calc(100vh-160px)]">
                  <SprinEditorForm
                    doc={activeDoc}
                    onChange={setActiveDoc}
                    mainPersonnel={mainPersonnel}
                    unitOrder={unitOrder}
                    pawasAnchor={pawasAnchor}
                    overrides={overrides}
                    scheduleRevisions={scheduleRevisions}
                    todayDateKey={todayDateKey}
                    piketDateKey={piketDateKey}
                    onChangePiketDateKey={setPiketDateKey}
                    activeSection={activeSection}
                    onChangeSection={setActiveSection}
                    autoCatchword={autoFirstPageCatchword}
                  />
                </div>

                {/* Right Column: Live A4 2-Page Document Preview */}
                <div className="flex-1 min-w-0 bg-[#0D0A07] flex flex-col xl:max-h-[calc(100vh-160px)]">
                  {/* Preview Toolbar */}
                  <div className="px-4 lg:px-6 py-3 bg-[#17120D] border-b border-[#32291E] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#D4A017]" />
                      <span className="text-xs font-semibold text-[#F5F0E6]">
                        Pratinjau Dokumen A4
                      </span>
                      <span className="text-xs text-[#8C7E69] hidden sm:inline">
                        · Klik area surat untuk langsung mengedit
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Page Switcher (only when Lampiran mode is enabled) */}
                      {activeDoc.useLampiran ? (
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#110D09] border border-[#32291E]">
                          {(
                            [
                              { id: 'both', label: `Semua (${totalPageCount} Hal)` },
                              { id: 'page1', label: `Isi Sprin (${pageOneSlices.length} Hal)` },
                              { id: 'page2', label: `Lampiran (${lampiranPages.length} Hal)` },
                            ] as const
                          ).map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setPreviewPage(tab.id)}
                              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                                previewPage === tab.id
                                  ? 'bg-[#D4A017] text-[#14100C]'
                                  : 'text-[#A89C89] hover:text-[#F5F0E6]'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-[#110D09] border border-[#32291E] text-xs font-semibold text-[#D4A017]">
                          {pageOneSlices.length} Halaman · Tanpa Lampiran
                        </span>
                      )}

                      {/* Zoom Controls */}
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#110D09] border border-[#32291E]">
                        <button
                          type="button"
                          aria-label="Perkecil pratinjau"
                          onClick={() => setZoom((z) => Math.max(0.45, +(z - 0.1).toFixed(2)))}
                          className="p-1 text-[#A89C89] hover:text-[#F5F0E6] cursor-pointer"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono-num text-xs text-[#F5F0E6] w-11 text-center">
                          {Math.round(zoom * 100)}%
                        </span>
                        <button
                          type="button"
                          aria-label="Perbesar pratinjau"
                          onClick={() => setZoom((z) => Math.min(1.1, +(z + 0.1).toFixed(2)))}
                          className="p-1 text-[#A89C89] hover:text-[#F5F0E6] cursor-pointer"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* A4 Paper Scroll Canvas */}
                  <div className="flex-1 overflow-auto p-6 lg:p-8 flex flex-col items-center gap-8">
                    {(!activeDoc.useLampiran ||
                      previewPage === 'both' ||
                      previewPage === 'page1') &&
                      pageOneSlices.map((slice, sIdx) => {
                        const sliceCatchword =
                          sIdx === 0 && (activeDoc.kataSambung || '').trim()
                            ? activeDoc.kataSambung!.trim()
                            : sIdx < pageOneSlices.length - 1
                              ? computePageOneCatchword(activeDoc, pageOneSlices[sIdx + 1])
                              : undefined;
                        return (
                          <div key={`page-one-slice-${sIdx}`} className="flex flex-col items-center">
                            <div className="w-full flex items-center justify-between text-xs text-[#9E907A] mb-2 px-1">
                              <span>
                                {sIdx === 0
                                  ? activeDoc.useLampiran
                                    ? 'Halaman 1 — Surat Perintah'
                                    : pageOneSlices.length === 1
                                      ? 'Surat Perintah (1 Halaman — Tanpa Lampiran)'
                                      : `Halaman 1 — Surat Perintah`
                                  : `Halaman ${sIdx + 1} — Lanjutan Surat Perintah (Header)`}
                              </span>
                              <span className="font-mono-num">
                                A4 · 210 × 297 mm · Margin 2,5 / 1,5 / 2 / 1,5 cm
                              </span>
                            </div>
                            <div
                              style={{
                                width: `calc(210mm * ${zoom})`,
                                height: `calc(297mm * ${zoom})`,
                              }}
                              className="relative shrink-0"
                            >
                              <div
                                style={{
                                  transform: `scale(${zoom})`,
                                  transformOrigin: 'top left',
                                }}
                              >
                                <LetterPageOne
                                  doc={activeDoc}
                                  slice={slice}
                                  catchword={sliceCatchword}
                                  onFocusSection={handleFocusFromLetter}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    {activeDoc.useLampiran &&
                      (previewPage === 'both' || previewPage === 'page2') &&
                      lampiranPages.map((chunk, pIdx) => {
                        const chunkCatchword =
                          pIdx < lampiranPages.length - 1
                            ? computeLampiranCatchword(lampiranPages[pIdx + 1])
                            : undefined;
                        return (
                          <div key={`lampiran-page-${pIdx}`} className="flex flex-col items-center">
                            <div className="w-full flex items-center justify-between text-xs text-[#9E907A] mb-2 px-1">
                              <span>
                                Halaman {pageOneSlices.length + pIdx + 1} — Lampiran Daftar Personel
                              </span>
                              <span className="font-mono-num">
                                {chunk.rows.length} / {activeDoc.personelList.length} Personel
                              </span>
                            </div>
                            <div
                              style={{
                                width: `calc(210mm * ${zoom})`,
                                height: `calc(297mm * ${zoom})`,
                              }}
                              className="relative shrink-0"
                            >
                              <div
                                style={{
                                  transform: `scale(${zoom})`,
                                  transformOrigin: 'top left',
                                }}
                              >
                                <LetterPageTwo
                                  doc={activeDoc}
                                  pageChunk={chunk}
                                  lampiranPageNumber={pIdx + 1}
                                  catchword={chunkCatchword}
                                  onFocusSection={handleFocusFromLetter}
                                  onUpdateColWidths={(widths) =>
                                    setActiveDoc((prev) => ({
                                      ...prev,
                                      lampiranColWidths: widths,
                                      updatedAt: new Date().toISOString(),
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {activeView === 'arsip' && (
              <ArchiveView
                documents={archiveDocs}
                activeDocId={activeDoc.id}
                templates={SPRIN_TEMPLATE_COLLECTION}
                onSelectTemplate={handleApplyTemplate}
                onOpenInEditor={handleOpenFromArchive}
                onDuplicate={handleDuplicateArchive}
                onDelete={handleDeleteArchive}
                onCreateNew={handleCreateNewSprin}
              />
            )}
          </main>
        </div>

        {/* Floating Quick Export PDF Button on Mobile */}
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={isExportingPdf}
          aria-label="Cetak PDF Surat Perintah"
          className="fixed bottom-5 right-5 sm:hidden z-40 w-12 h-12 rounded-full bg-[#D4A017] text-[#14100C] shadow-xl flex items-center justify-center cursor-pointer disabled:opacity-60"
        >
          {isExportingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
        </button>

        {/* Non-blocking Toast */}
        {toastMessage && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-[#251E16] border border-[#D4A017]/60 text-xs font-medium text-[#F5F0E6] shadow-2xl">
            <CheckCircle2 className="w-4 h-4 text-[#D4A017] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* OFFSCREEN PAGE-BREAK MEASURERS */}
      {measurerNode}
      {lampiranMeasurerNode}

      {/* DEDICATED PRINT & PDF CONTAINER (Unscaled A4 pages for PDF capture and native print) */}
      <div
        ref={printContainerRef}
        aria-hidden="true"
        className="fixed -left-[99999px] top-0 pointer-events-none select-none print-only-container"
      >
        {pageOneSlices.map((slice, sIdx) => {
          const sliceCatchword =
            sIdx === 0 && (activeDoc.kataSambung || '').trim()
              ? activeDoc.kataSambung!.trim()
              : sIdx < pageOneSlices.length - 1
                ? computePageOneCatchword(activeDoc, pageOneSlices[sIdx + 1])
                : undefined;
          return (
            <LetterPageOne
              key={`print-page1-${sIdx}`}
              doc={activeDoc}
              slice={slice}
              catchword={sliceCatchword}
            />
          );
        })}
        {(activeDoc.useLampiran || activeDoc.personelList.length > 5) &&
          lampiranPages.map((chunk, pIdx) => {
            const chunkCatchword =
              pIdx < lampiranPages.length - 1
                ? computeLampiranCatchword(lampiranPages[pIdx + 1])
                : undefined;
            return (
              <LetterPageTwo
                key={`print-lampiran-${pIdx}`}
                doc={activeDoc}
                pageChunk={chunk}
                lampiranPageNumber={pIdx + 1}
                catchword={chunkCatchword}
              />
            );
          })}
      </div>
    </div>
  );
}

export default BuatSprinApp;
