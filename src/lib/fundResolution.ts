/**
 * ZMS Fund Resolution Service
 * Authoritative canonical resolver for Assistance Type and Fund relations.
 * Strictly enforces that Level 2 Specific Sub-Fund and Level 1 Main Fund
 * are derived exclusively from the application's actual Assistance Type and Beneficiary Asnaf.
 */

export const UNMAPPED_FUND_WARNING = 'ยังไม่ได้กำหนดกองทุนที่สัมพันธ์กับประเภทความช่วยเหลือนี้';

export interface CanonicalFundAccount {
  id: string;
  code: string;
  name: string;
  category: 'zakat' | 'sadaqah' | 'operational';
  primaryAsnafCode?: string;
  description?: string;
}

export interface CanonicalSubFund {
  id: string;
  fundCode: string;
  code: string;
  name: string;
  primaryGroupCode: string;
  fundAccountId: string;
  description?: string;
}

export const CANONICAL_MAIN_FUNDS: Record<string, CanonicalFundAccount> = {
  'FND-ZKT-01': {
    id: 'fund-1',
    code: 'FND-ZKT-01',
    name: 'กองทุนซะกาตผู้ยากไร้และขัดสน',
    category: 'zakat',
    primaryAsnafCode: 'faqir_miskin',
    description: 'กองทุนหลักสำหรับช่วยเหลือผู้ยากไร้และขัดสน (Faqir & Miskin)',
  },
  'FND-ZKT-02': {
    id: 'fund-2',
    code: 'FND-ZKT-02',
    name: 'กองทุนซะกาตเพื่อการปลดเปลื้องหนี้สิน',
    category: 'zakat',
    primaryAsnafCode: 'gharimin',
    description: 'กองทุนหลักสำหรับผู้มีภาระหนี้สินจำเป็น (Gharimin)',
  },
  'FND-ZKT-03': {
    id: 'fund-3',
    code: 'FND-ZKT-03',
    name: 'กองทุนซะกาตทุนการศึกษาและเยาวชน',
    category: 'zakat',
    primaryAsnafCode: 'fisabilillah',
    description: 'กองทุนหลักสำหรับส่งเสริมการศึกษาและกิจการสาธารณประโยชน์ (Fi Sabilillah)',
  },
  'FND-ZKT-04': {
    id: 'fund-4',
    code: 'FND-ZKT-04',
    name: 'กองทุนซะกาตผู้เดินทางตกยาก',
    category: 'zakat',
    primaryAsnafCode: 'ibnsabil',
    description: 'กองทุนหลักสำหรับผู้เดินทางตกยากและผู้พลัดถิ่น (Ibn Sabil)',
  },
  'FND-SDQ-01': {
    id: 'fund-5',
    code: 'FND-SDQ-01',
    name: 'กองทุนศอดะเกาะฮ์และเงินบริจาคทั่วไป',
    category: 'sadaqah',
    primaryAsnafCode: 'general',
    description: 'กองทุนศอดะเกาะฮ์ มุอัลลัฟ และบรรเทาทุกข์มนุษยธรรม',
  },
  'FND-OPR-01': {
    id: 'fund-6',
    code: 'FND-OPR-01',
    name: 'กองทุนค่าใช้จ่ายดำเนินงานมูลนิธิ',
    category: 'operational',
    primaryAsnafCode: 'amil',
    description: 'กองทุนค่าใช้จ่ายดำเนินงานและการบริหารจัดการของเจ้าหน้าที่ (Amil)',
  },
};

export const CANONICAL_SUB_FUNDS: Record<string, CanonicalSubFund> = {
  living: {
    id: 'subf-1',
    fundCode: 'SF-FM-01',
    code: 'living',
    name: 'กองทุนปัจจัยยังชีพ',
    primaryGroupCode: 'faqir_miskin',
    fundAccountId: 'fund-1',
    description: 'กองทุนช่วยเหลือค่าครองชีพ อาหาร น้ำดื่ม และสิ่งจำเป็นพื้นฐานในการดำรงชีวิต',
  },
  housing: {
    id: 'subf-2',
    fundCode: 'SF-FM-02',
    code: 'housing',
    name: 'กองทุนซ่อมแซมและสร้างที่อยู่อาศัย',
    primaryGroupCode: 'faqir_miskin',
    fundAccountId: 'fund-1',
    description: 'กองทุนปรับปรุง ซ่อมแซม หรือจัดสร้างที่อยู่อาศัยให้มั่นคง ปลอดภัย',
  },
  rahmah_housing: {
    id: 'subf-2',
    fundCode: 'SF-FM-02',
    code: 'housing',
    name: 'กองทุนบ้านอัน-เราะห์มัต',
    primaryGroupCode: 'faqir_miskin',
    fundAccountId: 'fund-1',
    description: 'กองทุนสร้างและปรับปรุงบ้านพักอาศัยโครงการบ้านอัน-เราะห์มัต',
  },
  career: {
    id: 'subf-3',
    fundCode: 'SF-FM-03',
    code: 'career',
    name: 'กองทุนสนับสนุนอาชีพ',
    primaryGroupCode: 'faqir_miskin',
    fundAccountId: 'fund-1',
    description: 'กองทุนสนับสนุนเงินทุนหมุนเวียนและเครื่องมือประกอบอาชีพ',
  },
  education: {
    id: 'subf-4',
    fundCode: 'SF-FM-04',
    code: 'education',
    name: 'กองทุนทุนการศึกษา',
    primaryGroupCode: 'faqir_miskin',
    fundAccountId: 'fund-1',
    description: 'กองทุนสนับสนุนค่าเล่าเรียน ชุดนักเรียน และอุปกรณ์การศึกษา',
  },
  emergency: {
    id: 'subf-5',
    fundCode: 'SF-FM-05',
    code: 'emergency',
    name: 'กองทุนช่วยเหลือฉุกเฉิน',
    primaryGroupCode: 'faqir_miskin',
    fundAccountId: 'fund-1',
    description: 'กองทุนบรรเทาทุกข์เร่งด่วนกรณีประสบอุบัติภัย อัคคีภัย หรือภาวะวิกฤต',
  },
  gharimin_debt: {
    id: 'subf-gharimin-1',
    fundCode: 'SF-GHR-01',
    code: 'gharimin_debt_relief',
    name: 'กองทุนปลดเปลื้องภาระหนี้สินจำเป็น (อัล-ฆอรีมีน)',
    primaryGroupCode: 'gharimin',
    fundAccountId: 'fund-2',
    description: 'ช่วยเหลือปลดเปลื้องหนี้สินจำเป็นจากการดำรงชีพตามหลักชะรีอะฮ์',
  },
  muallaf_welfare: {
    id: 'subf-muallaf-1',
    fundCode: 'SF-MLF-01',
    code: 'muallaf_welfare',
    name: 'กองทุนสงเคราะห์และพัฒนาศักยภาพมุสลิมใหม่',
    primaryGroupCode: 'muallaf',
    fundAccountId: 'fund-5',
    description: 'สนับสนุนการดำรงชีพและอุปกรณ์ศาสนกิจสำหรับผู้เข้ารับอิสลามใหม่',
  },
  ibnsabil_travel: {
    id: 'subf-ibnsabil-1',
    fundCode: 'SF-IBS-01',
    code: 'ibnsabil_travel_aid',
    name: 'กองทุนช่วยเหลือผู้เดินทางตกยากและผู้พลัดถิ่น',
    primaryGroupCode: 'ibnsabil',
    fundAccountId: 'fund-4',
    description: 'ช่วยเหลือค่าเดินทาง อาหาร และที่พักชั่วคราวแก่ผู้เดินทางตกยาก',
  },
  humanitarian: {
    id: 'subf-humanitarian-1',
    fundCode: 'SF-HUM-01',
    code: 'humanitarian_relief',
    name: 'กองทุนสงเคราะห์ด้านมนุษยธรรมและบรรเทาทุกข์',
    primaryGroupCode: 'humanitarian',
    fundAccountId: 'fund-5',
    description: 'ให้ความช่วยเหลือด้านมนุษยธรรมแก่ผู้ไร้ที่พึ่งและผู้ประสบภาวะวิกฤต',
  },
  amil_operations: {
    id: 'subf-amil-1',
    fundCode: 'SF-AML-01',
    code: 'amil_operations',
    name: 'กองทุนบริหารจัดการซะกาตและเจ้าหน้าที่ (อามีลีน)',
    primaryGroupCode: 'amil',
    fundAccountId: 'fund-6',
    description: 'การบริหารจัดการและค่าตอบแทนเจ้าหน้าที่ตามระเบียบ',
  },
  fisabilillah_education: {
    id: 'subf-fisabilillah-1',
    fundCode: 'SF-FSB-01',
    code: 'fisabilillah_education_dawah',
    name: 'กองทุนส่งเสริมการศึกษาและสาธารณประโยชน์ในหนทางอัลลอฮ์',
    primaryGroupCode: 'fisabilillah',
    fundAccountId: 'fund-3',
    description: 'สนับสนุนโครงการด้านการศึกษา ศาสนา และเยาวชนในหนทางอัลลอฮ์',
  },
};

export interface ResolveAssistanceFundsParams<TMain = any, TSub = any> {
  asnafCategory?: string | null;
  assistanceType?: string | null;
  assistanceTypeId?: string | null;
  assistanceTypeCode?: string | null;
  funds?: TMain[];
  subFunds?: TSub[];
}

export interface ResolveAssistanceFundsResult<TMain = any, TSub = any> {
  subFund: TSub | null;
  mainFund: TMain | null;
  canonicalSubKey: string | null;
  canonicalMainCode: string | null;
  isMapped: boolean;
  unmappedWarning: string | null;
  assistanceTypeDisplayName: string;
}

/**
 * Identify canonical subfund key exclusively from the Assistance Type.
 * STRICT RULE: No random selection, no defaulting to subfunds[0], no fallback to living!
 */
export function matchCanonicalSubKey(
  assistanceType?: string | null,
  assistanceTypeId?: string | null,
  assistanceTypeCode?: string | null,
  asnafCategory?: string | null
): string | null {
  const typeStr = (assistanceType || '').trim().toLowerCase();
  const idStr = (assistanceTypeId || '').trim().toLowerCase();
  const codeStr = (assistanceTypeCode || '').trim().toUpperCase();
  const asnafStr = (asnafCategory || '').trim().toLowerCase();

  // 1. Education check (Scholarships, Tuition, Learning kits)
  if (
    typeStr.includes('ทุนการศึกษา') ||
    typeStr.includes('การศึกษา') ||
    typeStr.includes('ค่าเล่าเรียน') ||
    typeStr.includes('อุปกรณ์การเรียน') ||
    typeStr === 'education' ||
    typeStr === 'scholarship' ||
    idStr === 'subf-4' ||
    idStr === 'ast-4' ||
    idStr.includes('edu') ||
    codeStr.includes('EDU') ||
    codeStr.includes('SCHOLAR')
  ) {
    if (asnafStr.includes('fisa') || asnafStr.includes('sabil')) {
      return 'fisabilillah_education';
    }
    return 'education';
  }

  // 2. Housing Repair & Construction / Rahmah Home
  if (typeStr.includes('บ้านอัน-เราะห์มัต') || typeStr.includes('เราะห์มัต')) {
    return 'rahmah_housing';
  }
  if (
    typeStr.includes('ซ่อมแซมและสร้างที่อยู่อาศัย') ||
    typeStr.includes('ซ่อมแซมที่อยู่อาศัย') ||
    typeStr.includes('สร้างที่อยู่อาศัย') ||
    typeStr.includes('ที่อยู่อาศัย') ||
    typeStr.includes('ซ่อมบ้าน') ||
    typeStr === 'housing' ||
    typeStr === 'shelter' ||
    idStr === 'subf-2' ||
    idStr === 'ast-2' ||
    idStr.includes('house') ||
    idStr.includes('housing') ||
    codeStr.includes('HOUSE') ||
    codeStr.includes('HOUSING') ||
    codeStr.includes('SHELTER') ||
    codeStr.includes('RAHMAH')
  ) {
    return 'housing';
  }

  // 3. Career & Livelihood Empowerment
  if (
    typeStr.includes('ต่อยอดอาชีพ') ||
    typeStr.includes('สนับสนุนอาชีพ') ||
    typeStr.includes('ทุนประกอบอาชีพ') ||
    typeStr.includes('ส่งเสริมอาชีพ') ||
    typeStr.includes('อาชีพ') ||
    typeStr === 'career' ||
    typeStr === 'livelihood' ||
    idStr === 'subf-3' ||
    idStr === 'ast-3' ||
    idStr.includes('career') ||
    idStr.includes('job') ||
    codeStr.includes('CAREER') ||
    codeStr.includes('LIVELIHOOD') ||
    codeStr.includes('JOB') ||
    codeStr.includes('OCCUPATION')
  ) {
    return 'career';
  }

  // 4. Living & Subsistence
  if (
    typeStr.includes('ปัจจัยยังชีพ') ||
    typeStr.includes('ยังชีพ') ||
    typeStr.includes('ค่าครองชีพ') ||
    typeStr.includes('อาหาร') ||
    typeStr === 'living' ||
    typeStr === 'subsistence' ||
    idStr === 'subf-1' ||
    idStr === 'ast-1' ||
    idStr.includes('living') ||
    codeStr.includes('LIVING') ||
    codeStr.includes('SUBSIST')
  ) {
    return 'living';
  }

  // 5. Emergency & Disaster Relief
  if (
    typeStr.includes('ช่วยเหลือฉุกเฉิน') ||
    typeStr.includes('ฉุกเฉิน') ||
    typeStr.includes('บรรเทาทุกข์') ||
    typeStr.includes('ผู้ประสบภัย') ||
    typeStr.includes('ภัยพิบัติ') ||
    typeStr === 'emergency' ||
    typeStr === 'disaster' ||
    idStr === 'subf-5' ||
    idStr === 'ast-5' ||
    idStr.includes('emergency') ||
    idStr.includes('disaster') ||
    codeStr.includes('EMERGENCY') ||
    codeStr.includes('DISASTER') ||
    codeStr.includes('RELIEF')
  ) {
    return 'emergency';
  }

  // 6. Gharimin / Debt Relief
  if (
    typeStr.includes('หนี้สิน') ||
    typeStr.includes('ปลดหนี้') ||
    typeStr.includes('ฆอรีมีน') ||
    typeStr.includes('gharim') ||
    idStr.includes('gharim') ||
    idStr === 'subf-gharimin-1' ||
    codeStr.includes('GHARIM') ||
    codeStr.includes('DEBT')
  ) {
    return 'gharimin_debt';
  }

  // 7. Muallaf
  if (
    typeStr.includes('มุอัลลัฟ') ||
    typeStr.includes('มุสลิมใหม่') ||
    typeStr.includes('muallaf') ||
    idStr.includes('muallaf') ||
    idStr === 'subf-muallaf-1' ||
    codeStr.includes('MUALLAF')
  ) {
    return 'muallaf_welfare';
  }

  // 8. Ibn Sabil (Wayfarer)
  if (
    typeStr.includes('ผู้เดินทาง') ||
    typeStr.includes('พลัดถิ่น') ||
    typeStr.includes('อิบนุสสะบีล') ||
    typeStr.includes('ibnsabil') ||
    idStr.includes('ibnsabil') ||
    idStr === 'subf-ibnsabil-1' ||
    codeStr.includes('IBNSABIL')
  ) {
    return 'ibnsabil_travel';
  }

  // 9. Humanitarian
  if (
    typeStr.includes('มนุษยธรรม') ||
    typeStr.includes('ผู้ลี้ภัย') ||
    typeStr.includes('humanitarian') ||
    idStr.includes('human') ||
    idStr === 'subf-humanitarian-1' ||
    codeStr.includes('HUMANITARIAN')
  ) {
    return 'humanitarian';
  }

  // 10. Fi Sabilillah Religious & Public Benefit
  if (
    typeStr.includes('ฟีสะบีลิลลาฮ์') ||
    typeStr.includes('ส่งเสริมศาสนา') ||
    typeStr.includes('fisabilillah') ||
    idStr.includes('fisabilillah') ||
    idStr === 'subf-fisabilillah-1' ||
    codeStr.includes('FISABILILLAH')
  ) {
    return 'fisabilillah_education';
  }

  // 11. Amil Operations
  if (
    typeStr.includes('อามิล') ||
    typeStr.includes('บริหารจัดการซะกาต') ||
    typeStr.includes('amil') ||
    idStr.includes('amil') ||
    idStr === 'subf-amil-1' ||
    codeStr.includes('AMIL')
  ) {
    return 'amil_operations';
  }

  // Strict: If not matched by any rule, return NULL. No defaulting!
  return null;
}

/**
 * Derive Main Fund Code from Asnaf category and/or resolved sub-fund
 */
export function matchCanonicalMainFundCode(
  asnafCategory?: string | null,
  canonicalSubKey?: string | null
): string | null {
  // If sub-fund exists and points to a specific main fund
  if (canonicalSubKey && CANONICAL_SUB_FUNDS[canonicalSubKey]) {
    const mainFundId = CANONICAL_SUB_FUNDS[canonicalSubKey].fundAccountId;
    for (const [code, fund] of Object.entries(CANONICAL_MAIN_FUNDS)) {
      if (fund.id === mainFundId) return code;
    }
  }

  const asnaf = (asnafCategory || '').trim().toLowerCase();
  if (asnaf.includes('gharim')) return 'FND-ZKT-02';
  if (asnaf.includes('fisa') || asnaf.includes('sabil')) return 'FND-ZKT-03';
  if (asnaf.includes('ibn')) return 'FND-ZKT-04';
  if (asnaf.includes('amil')) return 'FND-OPR-01';
  if (asnaf.includes('muallaf') || asnaf.includes('human')) return 'FND-SDQ-01';
  if (asnaf.includes('faqir') || asnaf.includes('miskin') || asnaf === '') return 'FND-ZKT-01';

  return 'FND-ZKT-01';
}

/**
 * Main Fund and Sub-Fund Resolver.
 * Resolves funds automatically, ensures no mismatch, and sets unmappedWarning if no relation exists.
 */
export function resolveAssistanceFunds<TMain = any, TSub = any>(
  params: ResolveAssistanceFundsParams<TMain, TSub>
): ResolveAssistanceFundsResult<TMain, TSub> {
  const { asnafCategory, assistanceType, assistanceTypeId, assistanceTypeCode, funds = [], subFunds = [] } = params;

  const assistanceTypeDisplayName = (assistanceType || assistanceTypeCode || 'ไม่ระบุประเภท').trim();

  // 1. Resolve Level 2 Specific Sub-Fund
  const subKey = matchCanonicalSubKey(assistanceType, assistanceTypeId, assistanceTypeCode, asnafCategory);

  let matchedSubFund: TSub | null = null;

  if (subKey) {
    const canonicalSub = CANONICAL_SUB_FUNDS[subKey];

    // Try finding in caller's subFunds array
    const liveSub = subFunds.find((sf: any) => {
      const sfId = String(sf.id || '');
      const sfCode = String(sf.code || '').toLowerCase();
      const sfFundCode = String(sf.fundCode || sf.fund_code || '').toUpperCase();
      const sfName = String(sf.name || '');

      if (sfId === canonicalSub.id) return true;
      if (canonicalSub.fundCode && sfFundCode === canonicalSub.fundCode.toUpperCase()) return true;
      if (canonicalSub.code && sfCode === canonicalSub.code.toLowerCase()) return true;
      if (canonicalSub.name && (sfName === canonicalSub.name || sfName.includes(canonicalSub.name))) return true;

      return false;
    });

    if (liveSub) {
      matchedSubFund = liveSub;
    } else {
      matchedSubFund = { ...canonicalSub } as unknown as TSub;
    }
  }

  // 2. Resolve Level 1 Main Fund
  let matchedMainFund: TMain | null = null;
  const mainCode = matchCanonicalMainFundCode(asnafCategory, subKey);

  if (mainCode) {
    const canonicalMain = CANONICAL_MAIN_FUNDS[mainCode];

    const liveMain = funds.find((f: any) => {
      const fId = String(f.id || '');
      const fCode = String(f.code || '').toUpperCase();
      if (fId === canonicalMain.id) return true;
      if (fCode === canonicalMain.code.toUpperCase()) return true;
      return false;
    });

    if (liveMain) {
      matchedMainFund = liveMain;
    } else {
      matchedMainFund = { ...canonicalMain } as unknown as TMain;
    }
  }

  const isMapped = Boolean(matchedSubFund && matchedMainFund);
  const unmappedWarning = isMapped ? null : UNMAPPED_FUND_WARNING;

  return {
    subFund: matchedSubFund,
    mainFund: matchedMainFund,
    canonicalSubKey: subKey,
    canonicalMainCode: mainCode,
    isMapped,
    unmappedWarning,
    assistanceTypeDisplayName,
  };
}
