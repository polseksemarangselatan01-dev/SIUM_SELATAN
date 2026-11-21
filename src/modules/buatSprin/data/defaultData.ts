import {
  LampiranColumnWidths,
  PersonnelRow,
  SatkerPreset,
  SprinDocument,
  SprinTemplateItem,
  StampSignatureConfig,
} from '../types/sprin';

export function getSprinContinuationHeaderTitle(
  doc: Pick<SprinDocument, 'lampiranHeaderTitle' | 'sprinHeaderTitle'>
): string {
  const custom = (doc.sprinHeaderTitle || '').trim();
  if (custom) return custom.toUpperCase();
  const base = (doc.lampiranHeaderTitle || 'LAMP SPRIN KAPOLSEK SMG SELATAN').trim();
  const stripped = base.replace(/^(?:LAMPIRAN|LAMP\.?)\s+/i, '').trim();
  return (stripped || 'SPRIN KAPOLSEK SMG SELATAN').toUpperCase();
}

export function getLampiranHeaderTitle(
  doc: Pick<SprinDocument, 'lampiranHeaderTitle'>
): string {
  const raw = (doc.lampiranHeaderTitle || 'LAMP SPRIN KAPOLSEK SMG SELATAN').trim().toUpperCase();
  if (!raw) return 'LAMP SPRIN KAPOLSEK SMG SELATAN';
  if (/^LAMP\b/.test(raw)) return raw;
  if (/^LAMPIRAN\s+/.test(raw)) return raw.replace(/^LAMPIRAN\s+/, 'LAMP ');
  return `LAMP ${raw}`;
}

export const QUICK_WINS_PROGRAMS: string[] = [
  'Quick Wins 1 — Perbaikan Interaksi Polisi dengan Masyarakat',
  'Quick Wins 2 — Optimalisasi Pengamanan Kegiatan Masyarakat',
  'Quick Wins 3 — Patroli Sambang & Bhabinkamtibmas Terpadu',
  'Quick Wins 4 — Pelayanan Publik Presisi Bebas Pungli',
  'Quick Wins 5 — Penanganan Gangguan Kamtibmas & Keramaian',
  'Quick Wins 6 — Penguatan Sinergi Sekolah & Generasi Muda',
  'Quick Wins 7 — Digitalisasi Pelaporan & Administrasi Operasional',
  'Quick Wins 8 — Respon Cepat Aduan & Pengaduan Masyarakat',
];

export const SATKER_PRESETS: SatkerPreset[] = [
  {
    id: 'polrestabes-semarang',
    label: 'POLRESTABES SEMARANG POLDA JAWA TENGAH',
    shortLabel: 'Polrestabes Semarang',
    polda: 'Polda Jawa Tengah',
    polres: 'Polrestabes Semarang',
    polsek: '',
    kopLine1: 'KEPOLISIAN NEGARA REPUBLIK INDONESIA',
    kopLine2: 'DAERAH JAWA TENGAH',
    kopLine3: 'RESOR KOTA BESAR SEMARANG',
    lampiranHeaderTitle: 'LAMP SPRIN KAPOLRESTABES SMG',
    pejabatJabatan: 'KAPOLRESTABES SEMARANG POLDA JATENG',
    pejabatNama: 'ERLIN TANG JAYA, S.H., S.I.K., M.H.',
    pejabatPangkatNrp: 'KOMISARIS BESAR POLISI NRP 78061264',
    stampResorText: 'POLRI DAERAH JAWA TENGAH',
    stampSektorText: 'RESOR KOTA BESAR SEMARANG',
  },
  {
    id: 'semarang-selatan',
    label: 'POLSEK SEMARANG SELATAN POLRESTABES SEMARANG',
    shortLabel: 'Polsek Semarang Selatan',
    polda: 'Polda Jawa Tengah',
    polres: 'Polrestabes Semarang',
    polsek: 'Polsek Semarang Selatan',
    kopLine1: 'POLRI DAERAH JAWA TENGAH',
    kopLine2: 'RESOR KOTA BESAR SEMARANG',
    kopLine3: 'SEKTOR SEMARANG SELATAN',
    lampiranHeaderTitle: 'LAMP SPRIN KAPOLSEK SMG SELATAN',
    pejabatJabatan: 'KAPOLSEK SEMARANG SELATAN POLRESTABES SEMARANG',
    pejabatNama: 'RISMANTO, S.H.,M.H.',
    pejabatPangkatNrp: 'KOMISARIS POLISI NRP 73020406',
    stampResorText: 'POLRI RESOR KOTA BESAR SEMARANG',
    stampSektorText: 'SEKTOR SEMARANG SELATAN',
  },
  {
    id: 'semarang-tengah',
    label: 'POLSEK SEMARANG TENGAH POLRESTABES SEMARANG',
    shortLabel: 'Polsek Semarang Tengah',
    polda: 'Polda Jawa Tengah',
    polres: 'Polrestabes Semarang',
    polsek: 'Polsek Semarang Tengah',
    kopLine1: 'POLRI DAERAH JAWA TENGAH',
    kopLine2: 'RESOR KOTA BESAR SEMARANG',
    kopLine3: 'SEKTOR SEMARANG TENGAH',
    lampiranHeaderTitle: 'LAMP SPRIN KAPOLSEK SMG TGH',
    pejabatJabatan: 'KAPOLSEK SEMARANG TENGAH POLRESTABES SEMARANG',
    pejabatNama: 'SUYITNO, S.H., M.H.',
    pejabatPangkatNrp: 'KOMISARIS POLISI NRP 74050318',
    stampResorText: 'POLRI RESOR KOTA BESAR SEMARANG',
    stampSektorText: 'SEKTOR SEMARANG TENGAH',
  },
  {
    id: 'candisari',
    label: 'POLSEK CANDISARI POLRESTABES SEMARANG',
    shortLabel: 'Polsek Candisari',
    polda: 'Polda Jawa Tengah',
    polres: 'Polrestabes Semarang',
    polsek: 'Polsek Candisari',
    kopLine1: 'POLRI DAERAH JAWA TENGAH',
    kopLine2: 'RESOR KOTA BESAR SEMARANG',
    kopLine3: 'SEKTOR CANDISARI',
    lampiranHeaderTitle: 'LAMP SPRIN KAPOLSEK CANDISARI',
    pejabatJabatan: 'KAPOLSEK CANDISARI POLRESTABES SEMARANG',
    pejabatNama: 'AGUS PRASETYO, S.I.K.',
    pejabatPangkatNrp: 'AKP NRP 82080412',
    stampResorText: 'POLRI RESOR KOTA BESAR SEMARANG',
    stampSektorText: 'SEKTOR CANDISARI',
  },
];

export function mergePersonnelByNrp(
  baseList: PersonnelRow[],
  incomingList: PersonnelRow[]
): PersonnelRow[] {
  const byNrp = new Map<string, PersonnelRow>();
  const order: string[] = [];

  const upsert = (row: PersonnelRow) => {
    const key = row.nrp.trim();
    if (!key) return;
    if (!byNrp.has(key)) {
      order.push(key);
      byNrp.set(key, { ...row });
    } else {
      const existing = byNrp.get(key)!;
      byNrp.set(key, { ...existing, ...row, id: existing.id || row.id });
    }
  };

  baseList.forEach(upsert);
  incomingList.forEach(upsert);

  return order.map((key) => byNrp.get(key)!);
}

export const DEFAULT_STAMP_IMAGE_URL = '/assets/aistudio/NEW_STAMPLE__2__a18bbd20.png';

export const DEFAULT_STAMP_CONFIG: StampSignatureConfig = {
  stampImageDataUrl: DEFAULT_STAMP_IMAGE_URL,
  stampSizeCm: 4.7,
  stampOffsetXMm: 2,
  stampOffsetYMm: 2,
  stampMultiplyBlend: true,
  signatureImageDataUrl: null,
  signatureWidthCm: 5.2,
  signatureOffsetXMm: 18,
  signatureOffsetYMm: 14,
  signatureMultiplyBlend: true,
  aboveText: true,
};

export const LAMPIRAN_TABLE_TOTAL_MM = 170;

export const LOCKED_LAMPIRAN_COL_WIDTHS = {
  no: 9,
  pangkat: 23,
  nrp: 22,
} as const;

export const LOCKED_LAMPIRAN_COL_RULES: Partial<Record<keyof LampiranColumnWidths, string>> = {
  no: '2 huruf',
  pangkat: '7 huruf',
  nrp: '8 huruf',
};

export function isLockedLampiranCol(key: keyof LampiranColumnWidths): boolean {
  return key === 'no' || key === 'pangkat' || key === 'nrp';
}

export const DEFAULT_LAMPIRAN_COL_WIDTHS: LampiranColumnWidths = {
  no: LOCKED_LAMPIRAN_COL_WIDTHS.no,
  nama: 42,
  pangkat: LOCKED_LAMPIRAN_COL_WIDTHS.pangkat,
  nrp: LOCKED_LAMPIRAN_COL_WIDTHS.nrp,
  jabatan: 48,
  ket: 26,
};

export const LAMPIRAN_COL_MIN_WIDTHS: LampiranColumnWidths = {
  no: LOCKED_LAMPIRAN_COL_WIDTHS.no,
  nama: 20,
  pangkat: LOCKED_LAMPIRAN_COL_WIDTHS.pangkat,
  nrp: LOCKED_LAMPIRAN_COL_WIDTHS.nrp,
  jabatan: 20,
  ket: 10,
};

const LOCKED_TOTAL_MM =
  LOCKED_LAMPIRAN_COL_WIDTHS.no +
  LOCKED_LAMPIRAN_COL_WIDTHS.pangkat +
  LOCKED_LAMPIRAN_COL_WIDTHS.nrp;

export const UNLOCKED_LAMPIRAN_TOTAL_MM = LAMPIRAN_TABLE_TOTAL_MM - LOCKED_TOTAL_MM;

export function getNormalizedLampiranColWidths(
  widths?: Partial<LampiranColumnWidths>
): LampiranColumnWidths {
  const no = LOCKED_LAMPIRAN_COL_WIDTHS.no;
  const pangkat = LOCKED_LAMPIRAN_COL_WIDTHS.pangkat;
  const nrp = LOCKED_LAMPIRAN_COL_WIDTHS.nrp;

  const rawNama = Math.max(
    LAMPIRAN_COL_MIN_WIDTHS.nama,
    Number(widths?.nama) || DEFAULT_LAMPIRAN_COL_WIDTHS.nama
  );
  const rawJabatan = Math.max(
    LAMPIRAN_COL_MIN_WIDTHS.jabatan,
    Number(widths?.jabatan) || DEFAULT_LAMPIRAN_COL_WIDTHS.jabatan
  );
  const rawKet = Math.max(
    LAMPIRAN_COL_MIN_WIDTHS.ket,
    Number(widths?.ket) || DEFAULT_LAMPIRAN_COL_WIDTHS.ket
  );

  const unlockedSum = rawNama + rawJabatan + rawKet;
  if (Math.abs(unlockedSum - UNLOCKED_LAMPIRAN_TOTAL_MM) < 0.05) {
    return {
      no,
      nama: +rawNama.toFixed(1),
      pangkat,
      nrp,
      jabatan: +rawJabatan.toFixed(1),
      ket: +rawKet.toFixed(1),
    };
  }

  const unlockedMinSum =
    LAMPIRAN_COL_MIN_WIDTHS.nama +
    LAMPIRAN_COL_MIN_WIDTHS.jabatan +
    LAMPIRAN_COL_MIN_WIDTHS.ket;
  const targetSlack = UNLOCKED_LAMPIRAN_TOTAL_MM - unlockedMinSum;
  const currentSlack = unlockedSum - unlockedMinSum;
  const scale = currentSlack > 0.01 ? targetSlack / currentSlack : 0;

  const nama = +(
    LAMPIRAN_COL_MIN_WIDTHS.nama +
    (rawNama - LAMPIRAN_COL_MIN_WIDTHS.nama) * scale
  ).toFixed(1);
  const jabatan = +(
    LAMPIRAN_COL_MIN_WIDTHS.jabatan +
    (rawJabatan - LAMPIRAN_COL_MIN_WIDTHS.jabatan) * scale
  ).toFixed(1);
  const ket = +Math.max(
    LAMPIRAN_COL_MIN_WIDTHS.ket,
    UNLOCKED_LAMPIRAN_TOTAL_MM - nama - jabatan
  ).toFixed(1);

  return { no, nama, pangkat, nrp, jabatan, ket };
}

export const DEFAULT_SPRIN_DOCUMENT: SprinDocument = {
  id: 'sprin-213-x-2026',
  status: 'Siap Cetak',
  updatedAt: '2026-11-20T08:30:00.000Z',
  useLampiran: true,

  // Identitas Kesatuan
  polda: 'Polda Jawa Tengah',
  polres: 'Polrestabes Semarang',
  polsek: 'Polsek Semarang Selatan',
  tanggalKegiatan: '2026-11-21',
  pelaporNamaPangkat: 'KOMPOL RISMANTO, S.H.,M.H.',
  pelaporJabatan: 'Kapolsek Semarang Selatan',
  programQuickWins: 'Quick Wins 5 — Penanganan Gangguan Kamtibmas & Keramaian',

  // Surat Perintah Halaman 1
  kopLine1: 'POLRI DAERAH JAWA TENGAH',
  kopLine2: 'RESOR KOTA BESAR SEMARANG',
  kopLine3: 'SEKTOR SEMARANG SELATAN',
  nomorSprin: 'Sprin/213/X/HUK.6.6./2026',
  pertimbangan:
    'untuk kelancaran pelaksanaan Kegiatan KRYD dan menjaga situasi Kamtibmas di wilayah Hukum Polsek Semarang Selatan, maka perlu diterbitkan surat perintah;',
  dasarList: [
    'Undang-Undang Nomor 5 Tahun 2026 tentang Perubahan Ketiga atas Undang-Undang Nomor 2 Tahun 2002 tentang Kepolisian Negara Republik Indonesia;',
    'petunjuk dan arahan Kapolrestabes Semarang, tentang pelaksanaan KRYD;',
  ],
  kepadaText:
    'NAMA, PANGKAT/NRP/NIP DAN JABATAN SEBAGAIMANA YANG TERCANTUM DALAM LAMPIRAN SURAT PERINTAH INI.',
  untukList: [
    'disamping melaksanakan tugas dan tanggungjawabnya sehari-hari, juga melaksanakan kegiatan KRYD dengan sasaran balap liar dan taruwan / kenakalan remaja;',
    'Kegiatan dilaksanakan pada hari Sabtu tanggal 21 November 2026 pukul 22.00 Wib s.d selesai. Di wilayah Hukum Polsek Semarang Selatan (Strong Point di jl Kompol Maksum);',
    'melaksanakan perintah ini dengan seksama dan penuh rasa tanggung jawab;',
    'melaporkan hasil pelaksanaan kegiatan kepada Kapolsek Semarang Selatan;',
  ],
  tembusanList: [
    'Kapolrestabes Semarang',
    'Wakapolrestabes Semarang',
    'Kabagops Polrestabes Semarang.',
  ],
  kataSambung: '',

  // Header Halaman 2+ & Lampiran
  sprinHeaderTitle: '',
  lampiranHeaderTitle: 'LAMP SPRIN KAPOLSEK SMG SELATAN',
  lampiranNomor: 'SPRIN/213/X/HUK.6.6./2026',
  lampiranTanggalUpper: '20   NOVEMBER 2026',
  lampiranJudul: 'DAFTAR NAMA PERSONEL KRYD',
  lampiranSubjudul: 'PADA HARI SABTU TANGGAL 21 NOVEMBER 2026',
  lampiranColWidths: { ...DEFAULT_LAMPIRAN_COL_WIDTHS },
  personelList: [
    {
      id: 'pers-213-1',
      nama: 'SUBIANTO, S.H.',
      pangkat: 'IPTU',
      nrp: '72100003',
      jabatan: 'KANITINTELKAM',
      ket: 'PADAL',
    },
    {
      id: 'pers-213-2',
      nama: 'A. ADI WIDYANTORO, S.H.',
      pangkat: 'AIPTU',
      nrp: '84030769',
      jabatan: 'BHABIN LAMPER LOR',
      ket: 'ANGGOTA',
    },
    {
      id: 'pers-213-3',
      nama: 'FERY EKO SAPUTRO',
      pangkat: 'AIPTU',
      nrp: '84050075',
      jabatan: 'BANIT SAMAPTA',
      ket: 'SDA',
    },
    {
      id: 'pers-213-4',
      nama: 'SINGGIH RIYADI',
      pangkat: 'AIPTU',
      nrp: '83070106',
      jabatan: 'PS.PANITOPSNAL 2 UNIT RESKRIM',
      ket: 'SDA',
    },
    {
      id: 'pers-213-5',
      nama: 'SARWO EDY',
      pangkat: 'AIPDA',
      nrp: '86121201',
      jabatan: 'PS. PANIT 1 UNIT BINMAS',
      ket: 'SDA',
    },
    {
      id: 'pers-213-6',
      nama: 'IJMAL AKMAL, S.H.',
      pangkat: 'AIPDA',
      nrp: '85011391',
      jabatan: 'BANIT RESKRIM',
      ket: 'SDA',
    },
    {
      id: 'pers-213-7',
      nama: 'HARDIYANTO',
      pangkat: 'AIPTU',
      nrp: '79010899',
      jabatan: 'BANIT INTELKAM',
      ket: 'SDA',
    },
  ],

  // Pengesahan & Pejabat
  dikeluarkanDi: 'Semarang',
  tanggalSuratHal1: '20       November 2026',
  tanggalSuratHal2: '20       November 2026',
  pejabatJabatan: 'KAPOLSEK SEMARANG SELATAN POLRESTABES SEMARANG',
  pejabatNama: 'RISMANTO, S.H.,M.H.',
  pejabatPangkatNrp: 'KOMISARIS POLISI NRP 73020406',
  showStampAndSignature: true,
  stampResorText: 'POLRI RESOR KOTA BESAR SEMARANG',
  stampSektorText: 'SEKTOR SEMARANG SELATAN',
  stampConfig: { ...DEFAULT_STAMP_CONFIG },
};

export const INITIAL_ARCHIVE_DOCUMENTS: SprinDocument[] = [
  DEFAULT_SPRIN_DOCUMENT,
  {
    ...DEFAULT_SPRIN_DOCUMENT,
    id: 'sprin-1488-x-2026',
    status: 'Siap Cetak',
    updatedAt: '2026-10-29T08:30:00.000Z',
    useLampiran: false,
    tanggalKegiatan: '2026-10-29',
    pelaporNamaPangkat: 'IPTU AGUS NURYANTO, S.H.',
    pelaporJabatan: 'Ps. Kanitlantas Polsek Semarang Selatan',
    programQuickWins: 'Quick Wins 7 — Digitalisasi Pelaporan & Administrasi Operasional',
    kopLine1: 'KEPOLISIAN NEGARA REPUBLIK INDONESIA',
    kopLine2: 'DAERAH JAWA TENGAH',
    kopLine3: 'RESOR KOTA BESAR SEMARANG',
    nomorSprin: 'Sprin/ 1488 /X/KEP./2026',
    pertimbangan:
      'guna tertib administrasi khususnya dalam rangka pelaksanaan tugas di lingkungan Polrestabes Semarang, dipandang perlu mengeluarkan surat perintah.',
    dasarList: [
      'Peraturan Kepolisian Negara Republik Indonesia Nomor 2 Tahun 2021 tentang Susunan Organisasi dan Tata Kerja pada tingkat Kepolisian Resor dan Kepolisian Sektor sebagaimana telah diubah dengan Peraturan Kepolisian Negara Republik Indonesia Nomor 7 Tahun 2025 tentang Perubahan atas Peraturan Kepolisian Negara Republik Indonesia Nomor 2 Tahun 2021 tentang Susunan Organisasi dan Tata Kerja pada tingkat Kepolisian Resor dan Kepolisian Sektor.',
    ],
    untukList: [
      'sambil menunggu keputusan yang bersifat definitif, agar melaksanakan tugas sebagai Pama Polrestabes Semarang;',
      'melaksanakan perintah ini dengan seksama dan penuh rasa tanggung jawab;',
      'surat perintah ini berlaku sejak dikeluarkan sampai dengan adanya keputusan yang berkaitan dengan penempatannya.',
    ],
    tembusanList: [
      'Kasiwas Polrestabes Semarang.',
      'Kasipropam Polrestabes Semarang.',
      'Kapolsek Semarang Selatan Polrestabes Semarang.',
    ],
    lampiranNomor: 'SPRIN / 1488 /X/ KEP./ 2026',
    lampiranTanggalUpper: '29 OKTOBER 2026',
    lampiranJudul: 'DAFTAR NAMA PERSONEL YANG DIPERINTAHKAN',
    lampiranSubjudul: 'PADA TANGGAL 29 OKTOBER 2026',
    tanggalSuratHal1: '29       Oktober 2026',
    tanggalSuratHal2: '29       Oktober 2026',
    pejabatJabatan: 'KAPOLRESTABES SEMARANG POLDA JATENG',
    pejabatNama: 'ERLIN TANG JAYA, S.H., S.I.K., M.H.',
    pejabatPangkatNrp: 'KOMISARIS BESAR POLISI NRP 78061264',
    stampResorText: 'POLRI DAERAH JAWA TENGAH',
    stampSektorText: 'RESOR KOTA BESAR SEMARANG',
    personelList: [
      {
        id: 'pers-0',
        nama: 'AGUS NURYANTO, S.H.',
        pangkat: 'IPTU',
        nrp: '73090344',
        jabatan: 'PS. KANITLANTAS POLSEK SMG SELATAN POLRESTABES SMG',
        ket: '',
      },
    ],
  },
  {
    ...DEFAULT_SPRIN_DOCUMENT,
    id: 'sprin-211-xi-2026',
    status: 'Terbit',
    updatedAt: '2026-11-18T08:30:00.000Z',
    useLampiran: true,
    kopLine1: 'POLRI DAERAH JAWA TENGAH',
    kopLine2: 'RESOR KOTA BESAR SEMARANG',
    kopLine3: 'SEKTOR SEMARANG SELATAN',
    nomorSprin: 'Sprin /  211  / XI / HUK.6.6./2026',
    pertimbangan:
      'bahwa dalam untuk kelancaran kegiatan Pentas Seni di SMAN 11 Semarang, maka dipandang perlu mengeluarkan Surat Perintah ini.',
    dasarList: [
      'undang – Undang Republik Indonesia Nomor 2 tahun 2002 tentang Kepolisian Negara Republik Indonesia.',
      'surat rekomendasi Kapolsek Semarang Selatan Nomor : B/    /XI/YAN.2.4/2025, Tanggal    November 2026 tentang rekomendasi keramaian.',
    ],
    untukList: [
      'disamping tugas sehari – hari agar melaksanakan pengamanan Pentas Seni yang diselenggarakan oleh SMAN 11 Semarang;',
      'kegiatan dilaksanakan pada hari Kamis tanggal 19 November 2026 pukul 09.00 s,d 17.00 Wib;',
      'melaporkan hasil pelaksanaan tugas kepada Kapolsek;',
      'melaksanakan perintah ini dengan seksama dan penuh rasa tanggung jawab.',
    ],
    tembusanList: ['Kapolrestabes Semarang', 'Kabagops Polrestabes Smg'],
    lampiranHeaderTitle: 'LAMP SPRIN KAPOLSEK SMG SELATAN',
    lampiranNomor: 'SPRIN /   211   /XI/ HUK.6.6./ 2026',
    lampiranTanggalUpper: '18        NOVEMBER 2026',
    lampiranJudul: 'DAFTAR NAMA PERS PENGAMANAN PENSI SMAN 11 SEMARANG',
    lampiranSubjudul: 'PADA HARI KAMIS TANGGAL 19 NOVEMBER 2026',
    tanggalSuratHal1: '5       November 2026',
    tanggalSuratHal2: '18        November 2026',
    pejabatJabatan: 'KAPOLSEK SEMARANG SELATAN POLRESTABES SEMARANG',
    pejabatNama: 'RISMANTO, S.H.,M.H.',
    pejabatPangkatNrp: 'KOMISARIS POLISI NRP 73020406',
    stampResorText: 'POLRI RESOR KOTA BESAR SEMARANG',
    stampSektorText: 'SEKTOR SEMARANG SELATAN',
    personelList: [
      { id: 'pers-211-1', nama: 'AHMAD SOKI', pangkat: 'AIPTU', nrp: '75050022', jabatan: 'PS. PANIT 3 SAMAPTA', ket: '' },
      { id: 'pers-211-2', nama: 'MUSLIH', pangkat: 'AIPDA', nrp: '78041138', jabatan: 'BHABIN LAMPER KIDUL', ket: '' },
      { id: 'pers-211-3', nama: 'A. ADI WIDYANTORO, S.H.', pangkat: 'AIPDA', nrp: '84030769', jabatan: 'BHABIN LAMPER LOR', ket: '' },
      { id: 'pers-211-4', nama: 'CANDRA MARMESA, S.H.', pangkat: 'AIPDA', nrp: '84091212', jabatan: 'BHABIN LAMPER TENGAH', ket: '' },
      { id: 'pers-211-5', nama: 'YUDHA SEPTYAWAN', pangkat: 'AIPDA', nrp: '85090287', jabatan: 'BHABIN PETERONGAN', ket: '' },
    ],
  },
];

export const SPRIN_OLGA_DOCUMENT: SprinDocument = {
  ...DEFAULT_SPRIN_DOCUMENT,
  id: 'template-sprin-olga',
  status: 'Siap Cetak',
  updatedAt: '2026-11-05T08:00:00.000Z',
  useLampiran: true,

  // Identitas Kesatuan
  polda: 'Polda Jawa Tengah',
  polres: 'Polrestabes Semarang',
  polsek: 'Polsek Semarang Selatan',
  tanggalKegiatan: '2026-11-06',
  pelaporNamaPangkat: 'KOMPOL RISMANTO, S.H.,M.H.',
  pelaporJabatan: 'Kapolsek Semarang Selatan',
  programQuickWins: 'Quick Wins 1 — Perbaikan Interaksi Polisi dengan Masyarakat',

  // Surat Perintah Halaman 1
  kopLine1: 'POLRI DAERAH JAWA TENGAH',
  kopLine2: 'RESOR KOTA BESAR SEMARANG',
  kopLine3: 'SEKTOR SEMARANG SELATAN',
  nomorSprin: 'Sprin / 196 / XI / BIN.2.1./2026',
  pertimbangan:
    'bahwa dalam rangka mendukung pembinaan jasmani guna meningkatkan kebugaran dan menjaga kondisi kesamaptaan serta kesehatan anggota, maka dipandang perlu mengeluarkan Surat Perintah ini.',
  dasarList: [
    'undang – Undang Republik Indonesia Nomor 2 tahun 2002 tentang Kepolisian Negara Republik Indonesia.',
    'surat Telegram Kapolrestabes Semarang Nomor : ST/118/VII/BIN2.4/2025, Tanggal Juli 2025 tentang Anev Olah Raga bersama.',
  ],
  kepadaText:
    'NAMA, PANGKAT, NRP DAN JABATANNYA SEPERTI TERSEBUT DALAM LAMPIRAN SURAT PERINTAH INI.',
  untukList: [
    'disamping tugas sehari – hari agar melaksanakan kegiatan Olah raga bersama tingkat Polrestabes Semarang pada:\na. Hari : Jumat.\nb. Tanggal : 6 November 2026\nc. Pukul : 07.30 Wib s/d Selesai.\nd. Tempat : di Halaman Apel Polrestabes Semarang.',
    'dengan menggunakan pakaian olah raga Training warna kuning;',
    'melaporkan hasil pelaksanaan tugas kepada Kapolsek;',
    'melaksanakan perintah ini dengan seksama dan penuh rasa tanggung jawab.',
  ],
  tembusanList: ['Kapolrestabes Semarang', 'Kabag SDM Polrestabes Smg'],
  kataSambung: '',

  // Header Halaman 2 & Lampiran
  sprinHeaderTitle: '',
  lampiranHeaderTitle: 'LAMP SPRIN KAPOLSEK SMG SELATAN',
  lampiranNomor: 'SPRIN / 196 /XI/ BIN.2.1./ 2026',
  lampiranTanggalUpper: '5        NOVEMBER 2026',
  lampiranJudul: 'DAFTAR NAMA PERS OLAH RAGA BERSAMA',
  lampiranSubjudul: 'PADA HARI JUMAT TANGGAL 6 NOVEMBER 2026',
  lampiranColWidths: { ...DEFAULT_LAMPIRAN_COL_WIDTHS },
  personelList: [
    {
      id: 'pers-olga-1',
      nama: 'AHMAD SOKI',
      pangkat: 'AIPTU',
      nrp: '75050022',
      jabatan: 'PS. PANIT 3 SAMAPTA',
      ket: '',
    },
    {
      id: 'pers-olga-2',
      nama: 'ANDI WIBAWA',
      pangkat: 'AIPDA',
      nrp: '84081372',
      jabatan: 'PS.PANIT 1 LANTAS',
      ket: '',
    },
    {
      id: 'pers-olga-3',
      nama: 'YUNI KURNIA HAPSARI, S.H.',
      pangkat: 'PENGATUR',
      nrp: '197906252014122003',
      jabatan: 'BANUM SIUM',
      ket: '',
    },
  ],

  // Pengesahan & Pejabat
  dikeluarkanDi: 'Semarang',
  tanggalSuratHal1: '5       November 2026',
  tanggalSuratHal2: '5       November 2026',
  pejabatJabatan: 'KAPOLSEK SEMARANG SELATAN POLRESTABES SEMARANG',
  pejabatNama: 'RISMANTO, S.H.,M.H.',
  pejabatPangkatNrp: 'KOMISARIS POLISI NRP 73020406',
  showStampAndSignature: true,
  stampResorText: 'POLRI RESOR KOTA BESAR SEMARANG',
  stampSektorText: 'SEKTOR SEMARANG SELATAN',
  stampConfig: { ...DEFAULT_STAMP_CONFIG },
};

export const SPRIN_PEMAKAMAN_DOCUMENT: SprinDocument = {
  ...DEFAULT_SPRIN_DOCUMENT,
  id: 'template-sprin-pemakaman',
  status: 'Siap Cetak',
  updatedAt: '2026-10-13T08:00:00.000Z',
  useLampiran: true,

  // Identitas Kesatuan
  polda: 'Polda Jawa Tengah',
  polres: 'Polrestabes Semarang',
  polsek: 'Polsek Semarang Selatan',
  tanggalKegiatan: '2026-10-13',
  pelaporNamaPangkat: 'KOMPOL RISMANTO, S.H.,M.H.',
  pelaporJabatan: 'Kapolsek Semarang Selatan',
  programQuickWins: 'Quick Wins 1 — Perbaikan Interaksi Polisi dengan Masyarakat',

  // Surat Perintah Halaman 1
  kopLine1: 'POLRI DAERAH JAWA TENGAH',
  kopLine2: 'RESOR KOTA BESAR SEMARANG',
  kopLine3: 'SEKTOR SEMARANG SELATAN',
  nomorSprin: 'Sprin / 164 / X / HUK.6.6./2026',
  pertimbangan:
    'bahwa untuk kelancaran kegiatan pemakaman anggota TNI/ Polri di wilayah hukum Polsek Semarang Selatan, maka dipandang perlu mengeluarkan Surat Perintah ini;',
  dasarList: [
    'undang – Undang Republik Indonesia Nomor 2 tahun 2002 tentang Kepolisian Negara Republik Indonesia;',
    'perintah Kapolrestabes Semarang pada hari Senin tanggal 12 Oktober 2026, tentang Pemakaman PURN AKBP FX.SUHERMAN, S.H.;',
  ],
  kepadaText:
    'NAMA, PANGKAT, NRP DAN JABATANNYA SEPERTI TERSEBUT DALAM LAMPIRAN SURAT PERINTAH INI;',
  untukList: [
    'Disamping melaksanakan tugas sehari-hari diperintahkan sebagai peserta Upacara persemayaman dan pemakaman PURN AKBP FX.SUHERMAN,S.H.;',
    'upacara akan di laksanakan pada:\na. Hari : Selasa;\nb. Tanggal : 13 Oktober 2026;\nc. Pukul dan tempat :\n- Persemayaman : pukul 09.30 Wib Di Rumah Duka Jl.Karangbendo 72d Rt 7 Rw 1 Kel. Karangrejo, Gajahmungkur Semarang\n- Pemakaman: pukul 10.00 Wib Di Tpu Sainoloyo Karangbendo Karangrejo Gajahmungkur Semarang;',
    'melaksanakan perintah ini dengan seksama dan penuh rasa tanggung jawab;',
    'melaporkan hasil pelaksanaan tugas kepada Kapolsek.',
  ],
  tembusanList: [],
  kataSambung: '',

  // Header Halaman 2 & Lampiran
  sprinHeaderTitle: '',
  lampiranHeaderTitle: 'LAMP SPRIN KAPOLSEK SMG SELATAN',
  lampiranNomor: 'SPRIN / 164 /X/ HUK.6.6./2026',
  lampiranTanggalUpper: '13       OKTOBER 2026',
  lampiranJudul: 'DAFTAR NAMA PERS PESERTA\nUPACARA PEMAKAMAN PURN AKBP FX SUHIRMAN SH',
  lampiranSubjudul: 'SELASA 13 OKTOBER 2026',
  lampiranColWidths: { ...DEFAULT_LAMPIRAN_COL_WIDTHS },
  personelList: [
    {
      id: 'pers-pmk-1',
      nama: 'AHMAD SOKI',
      pangkat: 'AIPTU',
      nrp: '75050022',
      jabatan: 'PS. PANIT 3 SAMAPTA',
      ket: '',
    },
    {
      id: 'pers-pmk-2',
      nama: 'JATMIKO NUR P, SH',
      pangkat: 'AIPDA',
      nrp: '84051714',
      jabatan: 'PS.PANIT 2 SAMAPTA',
      ket: '',
    },
    {
      id: 'pers-pmk-3',
      nama: 'ADI GESIT SATATA',
      pangkat: 'AIPTU',
      nrp: '72120148',
      jabatan: 'BANIT SAMAPTA',
      ket: '',
    },
    {
      id: 'pers-pmk-4',
      nama: 'WARDOYO',
      pangkat: 'AIPDA',
      nrp: '83101282',
      jabatan: 'BANIT SAMAPTA',
      ket: '',
    },
    {
      id: 'pers-pmk-5',
      nama: 'ERI SETIAWAN',
      pangkat: 'AIPDA',
      nrp: '85081180',
      jabatan: 'BANIT LANTAS',
      ket: '',
    },
    {
      id: 'pers-pmk-6',
      nama: 'ANTON RAHARDJO, SH',
      pangkat: 'AIPTU',
      nrp: '80100908',
      jabatan: 'PS. PANIT OPSNAL INTEL',
      ket: '',
    },
    {
      id: 'pers-pmk-7',
      nama: 'SINGGIH RIYADI',
      pangkat: 'AIPTU',
      nrp: '83070106',
      jabatan: 'PS.PANITOPSNAL 2 UNIT RESKRIM',
      ket: '',
    },
    {
      id: 'pers-pmk-8',
      nama: 'IJMAL AKMAL, SH',
      pangkat: 'AIPDA',
      nrp: '85011391',
      jabatan: 'BANIT RESKRIM',
      ket: '',
    },
    {
      id: 'pers-pmk-9',
      nama: 'ANDI WIBAWA',
      pangkat: 'AIPDA',
      nrp: '84081372',
      jabatan: 'PS.PANIT 1 LANTAS',
      ket: '',
    },
    {
      id: 'pers-pmk-10',
      nama: 'DODIK EKO ARIPRABOWO',
      pangkat: 'AIPDA',
      nrp: '85061749',
      jabatan: 'PS. PANIT 2 BINMAS',
      ket: '',
    },
  ],

  // Pengesahan & Pejabat
  dikeluarkanDi: 'Semarang',
  tanggalSuratHal1: '13       Oktober 2026',
  tanggalSuratHal2: '13       Oktober 2026',
  pejabatJabatan: 'KAPOLSEK SEMARANG SELATAN POLRESTABES SEMARANG',
  pejabatNama: 'RISMANTO,S.H.,M.H.',
  pejabatPangkatNrp: 'KOMISARIS POLISI NRP 73020406',
  showStampAndSignature: true,
  stampResorText: 'POLRI RESOR KOTA BESAR SEMARANG',
  stampSektorText: 'SEKTOR SEMARANG SELATAN',
  stampConfig: { ...DEFAULT_STAMP_CONFIG },
};

export const SPRIN_TEMPLATE_COLLECTION: SprinTemplateItem[] = [
  {
    id: 'tpl-sprin-kryd',
    name: 'SPRIN KRYD (Default)',
    subtitle: 'Sprin/213/X/HUK.6.6./2026 · 7 Personel',
    document: DEFAULT_SPRIN_DOCUMENT,
  },
  {
    id: 'tpl-sprin-olga',
    name: 'SPRIN OLGA',
    subtitle: 'Sprin/196/XI/BIN.2.1./2026 · 3 Personel',
    document: SPRIN_OLGA_DOCUMENT,
  },
  {
    id: 'tpl-sprin-pemakaman',
    name: 'SPRIN PEMAKAMAN',
    subtitle: 'Sprin/164/X/HUK.6.6./2026 · 10 Personel',
    document: SPRIN_PEMAKAMAN_DOCUMENT,
  },
  {
    id: 'tpl-sprin-pensi',
    name: 'SPRIN PENGAMANAN',
    subtitle: 'Sprin/211/XI/HUK.6.6./2026 · 5 Personel',
    document: INITIAL_ARCHIVE_DOCUMENTS[2],
  },
];
