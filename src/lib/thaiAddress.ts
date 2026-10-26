/**
 * Thailand Address and Postal Code Service
 * Powered by official Thailand geography dataset (77 provinces, districts, subdistricts, postal codes).
 * Provides fast local lookup without external third-party API dependencies.
 */

// @ts-ignore - thai-data is a CJS module
import thaiDataPkg from 'thai-data';

export interface AddressMatch {
  zipCode: string;
  province: string;
  district: string;
  subdistrict: string;
  isBkk: boolean;
  districtLabel: 'เขต' | 'อำเภอ';
  subdistrictLabel: 'แขวง' | 'ตำบล';
}

export interface AddressValidationResult {
  isValid: boolean;
  message?: string;
  suggestedZipCode?: string;
}

// In-memory indexed caches
let isInitialized = false;
const provinceMap = new Map<string, Map<string, Map<string, string>>>();
const zipCodeIndex = new Map<string, AddressMatch[]>();
let provinceListCache: string[] = [];

function ensureInitialized() {
  if (isInitialized) return;

  try {
    const rawData = typeof thaiDataPkg.getAllData === 'function'
      ? thaiDataPkg.getAllData()
      : (thaiDataPkg as any)?.default?.getAllData?.() || [];

    if (!Array.isArray(rawData)) {
      console.warn('thai-data rawData is not an array');
      isInitialized = true;
      return;
    }

    for (const entry of rawData) {
      if (
        !entry ||
        !entry.zipCode ||
        !Array.isArray(entry.provinceList) ||
        !Array.isArray(entry.districtList) ||
        !Array.isArray(entry.subDistrictList)
      ) {
        continue;
      }

      const zip = String(entry.zipCode).trim();
      if (!zipCodeIndex.has(zip)) {
        zipCodeIndex.set(zip, []);
      }

      for (const prov of entry.provinceList) {
        if (!prov || !prov.provinceName) continue;
        const pName = prov.provinceName.trim();
        const isBkk = pName === 'กรุงเทพมหานคร';

        if (!provinceMap.has(pName)) {
          provinceMap.set(pName, new Map());
        }
        const distMap = provinceMap.get(pName)!;

        for (const dist of entry.districtList) {
          if (!dist || !dist.districtName) continue;
          // Match province ID if present
          if (
            dist.proviceId &&
            prov.provinceId &&
            dist.proviceId !== prov.provinceId &&
            dist.provinceId !== prov.provinceId
          ) {
            continue;
          }

          const dName = dist.districtName.trim();
          if (!distMap.has(dName)) {
            distMap.set(dName, new Map());
          }
          const subMap = distMap.get(dName)!;

          for (const sub of entry.subDistrictList) {
            if (!sub || !sub.subDistrictName) continue;
            if (sub.districtId && dist.districtId && sub.districtId !== dist.districtId) {
              continue;
            }

            const sName = sub.subDistrictName.trim();
            subMap.set(sName, zip);

            // Add to zip index if not duplicate
            const existingList = zipCodeIndex.get(zip)!;
            const duplicate = existingList.some(
              (m) => m.province === pName && m.district === dName && m.subdistrict === sName
            );

            if (!duplicate) {
              existingList.push({
                zipCode: zip,
                province: pName,
                district: dName,
                subdistrict: sName,
                isBkk,
                districtLabel: isBkk ? 'เขต' : 'อำเภอ',
                subdistrictLabel: isBkk ? 'แขวง' : 'ตำบล',
              });
            }
          }
        }
      }
    }

    // Build sorted province list with Bangkok first, followed by Thai alphabetical sort
    const allProvinces = Array.from(provinceMap.keys());
    provinceListCache = allProvinces.sort((a, b) => {
      if (a === 'กรุงเทพมหานคร') return -1;
      if (b === 'กรุงเทพมหานคร') return 1;
      return a.localeCompare(b, 'th');
    });

    isInitialized = true;
  } catch (err) {
    console.error('Failed to initialize thai-data index:', err);
    isInitialized = true;
  }
}

/**
 * Returns list of all 77 provinces in Thailand (sorted with Bangkok first).
 */
export function getProvinces(): string[] {
  ensureInitialized();
  return [...provinceListCache];
}

/**
 * Returns list of districts (อำเภอ/เขต) in the specified province.
 */
export function getDistricts(province: string): string[] {
  ensureInitialized();
  const pName = (province || '').trim();
  const distMap = provinceMap.get(pName);
  if (!distMap) return [];
  return Array.from(distMap.keys()).sort((a, b) => a.localeCompare(b, 'th'));
}

/**
 * Returns list of subdistricts (ตำบล/แขวง) with their postal code for a province & district.
 */
export function getSubdistricts(
  province: string,
  district: string
): Array<{ name: string; zipCode: string }> {
  ensureInitialized();
  const pName = (province || '').trim();
  const dName = (district || '').trim();
  const distMap = provinceMap.get(pName);
  if (!distMap) return [];
  const subMap = distMap.get(dName);
  if (!subMap) return [];

  const list: Array<{ name: string; zipCode: string }> = [];
  for (const [name, zip] of subMap.entries()) {
    list.push({ name, zipCode: zip });
  }

  return list.sort((a, b) => a.name.localeCompare(b.name, 'th'));
}

/**
 * Searches address candidates by 5-digit postal code.
 * Returns array of matches. Empty array if not found.
 */
export function searchByZipCode(zipCode: string | number): AddressMatch[] {
  ensureInitialized();
  const cleanZip = String(zipCode).trim();
  if (cleanZip.length !== 5) return [];
  const matches = zipCodeIndex.get(cleanZip);
  return matches ? [...matches] : [];
}

/**
 * Checks whether a province is Bangkok.
 */
export function isBangkok(province: string): boolean {
  return (province || '').trim() === 'กรุงเทพมหานคร';
}

/**
 * Returns dynamic district label ('เขต' for BKK, 'อำเภอ' for provinces).
 */
export function getDistrictLabel(province: string): 'เขต' | 'อำเภอ' {
  return isBangkok(province) ? 'เขต' : 'อำเภอ';
}

/**
 * Returns dynamic subdistrict label ('แขวง' for BKK, 'ตำบล' for provinces).
 */
export function getSubdistrictLabel(province: string): 'แขวง' | 'ตำบล' {
  return isBangkok(province) ? 'แขวง' : 'ตำบล';
}

/**
 * Validates consistency between zipCode, province, district, and subdistrict.
 * Checks against the official Thailand dataset.
 */
export function validateAddress(
  zipCode: string | undefined | null,
  province: string | undefined | null,
  district: string | undefined | null,
  subdistrict: string | undefined | null
): AddressValidationResult {
  ensureInitialized();

  const cleanZip = String(zipCode || '').trim();
  const pName = String(province || '').trim();
  const dName = String(district || '').trim();
  const sName = String(subdistrict || '').trim();

  if (!cleanZip) {
    return { isValid: false, message: 'กรุณาระบุรหัสไปรษณีย์ 5 หลัก' };
  }
  if (!/^\d{5}$/.test(cleanZip)) {
    return { isValid: false, message: 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก' };
  }
  if (!pName) {
    return { isValid: false, message: 'กรุณาระบุหรือเลือกจังหวัด' };
  }
  if (!dName) {
    return { isValid: false, message: `กรุณาระบุหรือเลือก${getDistrictLabel(pName)}` };
  }
  if (!sName) {
    return { isValid: false, message: `กรุณาระบุหรือเลือก${getSubdistrictLabel(pName)}` };
  }

  // Verify province exists
  const distMap = provinceMap.get(pName);
  if (!distMap) {
    return {
      isValid: false,
      message: `ไม่พบข้อมูลจังหวัด "${pName}" ในระบบฐานข้อมูลประเทศไทย`,
    };
  }

  // Verify district exists in province
  const subMap = distMap.get(dName);
  if (!subMap) {
    return {
      isValid: false,
      message: `ไม่พบ${getDistrictLabel(pName)} "${dName}" ในจังหวัด ${pName}`,
    };
  }

  // Verify subdistrict exists in district
  const expectedZip = subMap.get(sName);
  if (!expectedZip) {
    return {
      isValid: false,
      message: `ไม่พบ${getSubdistrictLabel(pName)} "${sName}" ใน${getDistrictLabel(pName)} ${dName}`,
    };
  }

  // Verify postal code matches or is registered for this subdistrict
  const zipMatches = zipCodeIndex.get(cleanZip) || [];
  const matchesThisArea = zipMatches.some(
    (m) => m.province === pName && m.district === dName && m.subdistrict === sName
  );

  if (!matchesThisArea) {
    return {
      isValid: false,
      suggestedZipCode: expectedZip,
      message: `รหัสไปรษณีย์ ${cleanZip} ไม่ตรงกับ ${getSubdistrictLabel(pName)}${sName} ${getDistrictLabel(pName)}${dName} จ.${pName} (รหัสไปรษณีย์ที่ถูกต้องคือ ${expectedZip})`,
    };
  }

  return { isValid: true };
}
