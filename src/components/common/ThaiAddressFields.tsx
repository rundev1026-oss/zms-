'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapPin,
  Search,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  X,
  HelpCircle,
  Loader2,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  getProvinces,
  getDistricts,
  getSubdistricts,
  searchByZipCode,
  validateAddress,
  isBangkok,
  getDistrictLabel,
  getSubdistrictLabel,
  AddressMatch,
} from '@/lib/thaiAddress';

export interface ThaiAddressFieldsProps {
  postcode: string;
  province: string;
  district: string;
  subdistrict: string;
  address: string;
  community?: string;
  onChangePostcode: (val: string) => void;
  onChangeProvince: (val: string) => void;
  onChangeDistrict: (val: string) => void;
  onChangeSubdistrict: (val: string) => void;
  onChangeAddress: (val: string) => void;
  onChangeCommunity?: (val: string) => void;
  onValidateStatus?: (status: { isValid: boolean; message?: string }) => void;
  readOnly?: boolean;
}

export function ThaiAddressFields({
  postcode,
  province,
  district,
  subdistrict,
  address,
  community = '',
  onChangePostcode,
  onChangeProvince,
  onChangeDistrict,
  onChangeSubdistrict,
  onChangeAddress,
  onChangeCommunity,
  onValidateStatus,
  readOnly = false,
}: ThaiAddressFieldsProps) {
  // State for search and modal
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSuccessNote, setSearchSuccessNote] = useState<string | null>(null);
  const [multiMatchOptions, setMultiMatchOptions] = useState<AddressMatch[]>([]);
  const [showMultiMatchModal, setShowMultiMatchModal] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<boolean>(false);

  // Provinces list
  const provincesList = useMemo(() => getProvinces(), []);

  // Districts based on currently selected province
  const districtsList = useMemo(() => {
    if (!province) return [];
    return getDistricts(province);
  }, [province]);

  // Subdistricts based on currently selected province + district
  const subdistrictsList = useMemo(() => {
    if (!province || !district) return [];
    return getSubdistricts(province, district);
  }, [province, district]);

  // Terminology helpers (Bangkok uses เขต / แขวง, Other provinces use อำเภอ / ตำบล)
  const isBkk = isBangkok(province);
  const districtLabel = getDistrictLabel(province);
  const subdistrictLabel = getSubdistrictLabel(province);

  // Address consistency validation
  const validationResult = useMemo(() => {
    if (!postcode || !province || !district || !subdistrict) {
      return { isValid: false, message: 'กรุณากรอกข้อมูลที่อยู่ให้ครบถ้วนทุกระดับ' };
    }
    return validateAddress(postcode, province, district, subdistrict);
  }, [postcode, province, district, subdistrict]);

  // Report validation status to parent
  useEffect(() => {
    if (onValidateStatus) {
      onValidateStatus(validationResult);
    }
  }, [validationResult, onValidateStatus]);

  // Track user typing for postcode lookup
  const lastSearchedZipRef = useRef<string>('');

  const handlePostcodeChange = (newZip: string) => {
    const clean = newZip.replace(/[^0-9]/g, '').slice(0, 5);
    onChangePostcode(clean);
    setSearchError(null);
    setSearchSuccessNote(null);
    setNetworkError(false);

    if (clean.length === 5 && clean !== lastSearchedZipRef.current) {
      lastSearchedZipRef.current = clean;
      performZipcodeLookup(clean);
    }
  };

  const performZipcodeLookup = async (cleanZip: string) => {
    setIsSearching(true);
    setSearchError(null);
    setSearchSuccessNote(null);
    setNetworkError(false);

    try {
      // First try via client-side indexed engine for zero-latency
      let matches = searchByZipCode(cleanZip);

      // If client lookup returned nothing, fallback to API query to verify
      if (matches.length === 0) {
        try {
          const res = await fetch(`/api/address/lookup?zipcode=${encodeURIComponent(cleanZip)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.matches)) {
              matches = data.matches;
            }
          }
        } catch (apiErr) {
          // If offline / network error
          console.warn('Network lookup failed, fallback to manual entry:', apiErr);
          setNetworkError(true);
        }
      }

      if (matches.length === 0) {
        setSearchError(
          `ไม่พบข้อมูลสำหรับรหัสไปรษณีย์ ${cleanZip} ในระบบ ท่านสามารถเลือกจังหวัด อำเภอ และตำบลด้วยตนเองได้`
        );
        setMultiMatchOptions([]);
        setShowMultiMatchModal(false);
      } else if (matches.length === 1) {
        // Single match -> Auto-fill
        const m = matches[0];
        onChangeProvince(m.province);
        onChangeDistrict(m.district);
        onChangeSubdistrict(m.subdistrict);
        setMultiMatchOptions([]);
        setShowMultiMatchModal(false);
        setSearchSuccessNote(
          `พบข้อมูลอัตโนมัติ: ${m.subdistrictLabel}${m.subdistrict} ${m.districtLabel}${m.district} จ.${m.province}`
        );
      } else {
        // Multiple matches -> Prompt user to select
        // Check if all belong to same province and district
        const sameProvince = matches.every((m) => m.province === matches[0].province);
        const sameDistrict = matches.every((m) => m.district === matches[0].district);

        if (sameProvince) {
          onChangeProvince(matches[0].province);
        }
        if (sameProvince && sameDistrict) {
          onChangeDistrict(matches[0].district);
        }

        setMultiMatchOptions(matches);
        setShowMultiMatchModal(true);
        setSearchSuccessNote(
          `พบ ${matches.length} ตำบล/แขวง ที่ตรงกับรหัสไปรษณีย์ ${cleanZip} กรุณาเลือกพื้นที่ของท่าน`
        );
      }
    } catch (err: any) {
      setNetworkError(true);
      setSearchError('ระบบค้นหาขัดข้องชั่วคราว ท่านสามารถเลือกที่อยู่จากรายการด้านล่างได้ตามปกติ');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle manual selection of an address match
  const handleSelectMatch = (m: AddressMatch) => {
    onChangePostcode(m.zipCode);
    onChangeProvince(m.province);
    onChangeDistrict(m.district);
    onChangeSubdistrict(m.subdistrict);
    setShowMultiMatchModal(false);
    setSearchError(null);
    setSearchSuccessNote(
      `เลือกพื้นที่: ${m.subdistrictLabel}${m.subdistrict} ${m.districtLabel}${m.district} จ.${m.province}`
    );
  };

  // Cascading handler: Province change
  const handleProvinceChange = (newProv: string) => {
    onChangeProvince(newProv);
    // Clear lower-level fields when province changes
    onChangeDistrict('');
    onChangeSubdistrict('');
    onChangePostcode('');
    setSearchError(null);
    setSearchSuccessNote(null);
  };

  // Cascading handler: District change
  const handleDistrictChange = (newDist: string) => {
    onChangeDistrict(newDist);
    // Clear lower-level fields when district changes
    onChangeSubdistrict('');
    onChangePostcode('');
    setSearchError(null);
    setSearchSuccessNote(null);
  };

  // Cascading handler: Subdistrict change
  const handleSubdistrictChange = (newSub: string) => {
    onChangeSubdistrict(newSub);
    setSearchError(null);
    setSearchSuccessNote(null);

    // Auto-fill postal code for this subdistrict if available
    const found = subdistrictsList.find((s) => s.name === newSub);
    if (found && found.zipCode) {
      onChangePostcode(found.zipCode);
      setSearchSuccessNote(`กำหนดรหัสไปรษณีย์อัตโนมัติ: ${found.zipCode}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Postal Code Search & Result Banner */}
      <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
              1
            </span>
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              รหัสไปรษณีย์ 5 หลัก (ค้นหาอัตโนมัติ) <span className="text-rose-500">*</span>
            </label>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            กรอก 5 หลักเพื่อค้นหา จังหวัด, อำเภอ, ตำบล
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              placeholder="เช่น 10530, 10700, 50000"
              value={postcode}
              disabled={readOnly}
              onChange={(e) => handlePostcodeChange(e.target.value)}
              className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold tracking-wider text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all min-h-[44px]"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400">
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : postcode.length === 5 ? (
                validationResult.isValid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )
              ) : (
                <Search className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </div>

          {postcode.length === 5 && !readOnly && (
            <button
              type="button"
              onClick={() => performZipcodeLookup(postcode)}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs shrink-0 min-h-[44px]"
            >
              <Search className="w-3.5 h-3.5" />
              ค้นหาซ้ำ
            </button>
          )}

          {multiMatchOptions.length > 1 && !readOnly && (
            <button
              type="button"
              onClick={() => setShowMultiMatchModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 min-h-[44px]"
            >
              <Layers className="w-3.5 h-3.5 text-amber-800" />
              เลือกตำบล/แขวง ({multiMatchOptions.length})
            </button>
          )}
        </div>

        {/* Status Indicators & Alerts */}
        {isSearching && (
          <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50/80 px-3 py-2 rounded-xl border border-emerald-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
            <span>กำลังค้นหาข้อมูลพื้นที่และรหัสไปรษณีย์...</span>
          </div>
        )}

        {searchSuccessNote && !isSearching && (
          <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{searchSuccessNote}</span>
          </div>
        )}

        {searchError && !isSearching && (
          <div className="flex items-start gap-2 text-xs text-amber-900 bg-amber-50 px-3 py-2.5 rounded-xl border border-amber-200 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{searchError}</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                ท่านสามารถเลือกจังหวัดและอำเภอจากช่องด้านล่างเพื่อบันทึกข้อมูลได้ตามปกติ
              </p>
            </div>
          </div>
        )}

        {networkError && (
          <div className="flex items-center gap-2 text-xs text-rose-800 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
            <span>ระบบค้นหาอัตโนมัติไม่สามารถเชื่อมต่อได้ชั่วคราว ท่านสามารถเลือกหรือกรอกที่อยู่ได้ด้วยตนเอง</span>
          </div>
        )}
      </div>

      {/* Cascading Address Selectors: Province → District/Amphoe → Subdistrict/Tambon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
        {/* จังหวัด (Province) */}
        <div>
          <label className="font-bold text-slate-700 block mb-1">
            2. จังหวัด <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              value={province}
              disabled={readOnly}
              onChange={(e) => handleProvinceChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none min-h-[44px]"
            >
              <option value="">-- เลือกจังหวัด --</option>
              {provincesList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* อำเภอ / เขต (District/Amphoe) */}
        <div>
          <label className="font-bold text-slate-700 block mb-1">
            3. {districtLabel} {isBkk ? '(กรุงเทพฯ)' : ''} <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              value={district}
              disabled={readOnly || !province || districtsList.length === 0}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none disabled:bg-slate-100 disabled:text-slate-400 min-h-[44px]"
            >
              <option value="">
                {!province
                  ? '-- กรุณาเลือกจังหวัดก่อน --'
                  : `-- เลือก${districtLabel} --`}
              </option>
              {districtsList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* ตำบล / แขวง (Subdistrict/Tambon) */}
        <div>
          <label className="font-bold text-slate-700 block mb-1">
            4. {subdistrictLabel} {isBkk ? '(กรุงเทพฯ)' : ''} <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              value={subdistrict}
              disabled={readOnly || !district || subdistrictsList.length === 0}
              onChange={(e) => handleSubdistrictChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none disabled:bg-slate-100 disabled:text-slate-400 min-h-[44px]"
            >
              <option value="">
                {!district
                  ? `-- กรุณาเลือก${districtLabel}ก่อน --`
                  : `-- เลือก${subdistrictLabel} --`}
              </option>
              {subdistrictsList.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} {s.zipCode ? `(${s.zipCode})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Validation Message if Mismatch occurs */}
      {postcode && province && district && subdistrict && !validationResult.isValid && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">ข้อมูลที่อยู่ไม่สัมพันธ์กัน</p>
            <p className="mt-0.5">{validationResult.message}</p>
            {validationResult.suggestedZipCode && (
              <button
                type="button"
                onClick={() => onChangePostcode(validationResult.suggestedZipCode!)}
                className="mt-1.5 px-2.5 py-1 rounded-lg bg-rose-200/80 hover:bg-rose-200 font-bold text-rose-900 transition-colors inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-rose-700" />
                คลิกเพื่อแก้ไขเป็นรหัส {validationResult.suggestedZipCode}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Detail Address: House No, Village, Soi, Road, Community */}
      <div className="space-y-3 pt-1">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            5. บ้านเลขที่ หมู่ที่ ซอย ถนน และรายละเอียดที่อยู่เพิ่มเติม <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            disabled={readOnly}
            placeholder="เช่น 12/3 หมู่ 4 ซอยมัสยิด ถนนประชาสำราญ"
            value={address}
            onChange={(e) => onChangeAddress(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[44px]"
          />
        </div>

        {onChangeCommunity && (
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              ชื่อชุมชน / มัสยิดใกล้เคียง (ถ้ามี)
            </label>
            <input
              type="text"
              disabled={readOnly}
              placeholder="เช่น ชุมชนนูรุลยากีน, ชุมชนบ้านคลองสิบ"
              value={community}
              onChange={(e) => onChangeCommunity(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[44px]"
            />
          </div>
        )}
      </div>

      {/* Multi-Match Area Selection Modal (when postal code maps to multiple subdistricts) */}
      {showMultiMatchModal && multiMatchOptions.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-white/10 text-white">
                  <Layers className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    เลือกตำบล / แขวง (รหัส {postcode})
                  </h3>
                  <p className="text-[11px] text-emerald-100">
                    พบ {multiMatchOptions.length} พื้นที่ที่ใช้รหัสไปรษณีย์นี้ กรุณาเลือกพื้นที่จริงของผู้ยื่นคำร้อง
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMultiMatchModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Options List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 divide-y divide-slate-100">
              {multiMatchOptions.map((opt, idx) => {
                const isSelected =
                  opt.province === province &&
                  opt.district === district &&
                  opt.subdistrict === subdistrict;

                return (
                  <div
                    key={`${opt.province}-${opt.district}-${opt.subdistrict}-${idx}`}
                    onClick={() => handleSelectMatch(opt)}
                    className={`pt-2.5 first:pt-0 p-3 rounded-2xl cursor-pointer transition-all border flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                        : 'bg-slate-50/70 hover:bg-emerald-50/50 border-slate-200/80 hover:border-emerald-300'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {opt.subdistrictLabel} {opt.subdistrict}
                        </span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                            ที่เลือกอยู่
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">
                        {opt.districtLabel} {opt.district} • จังหวัด{opt.province}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">
                        รหัสไปรษณีย์ {opt.zipCode}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectMatch(opt);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[36px] ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-emerald-700 hover:text-white hover:border-emerald-700'
                      }`}
                    >
                      {isSelected ? 'เลือกแล้ว' : 'เลือกพื้นที่นี้'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>คลิกรายการเพื่อเลือกข้อมูลทันที</span>
              <button
                type="button"
                onClick={() => setShowMultiMatchModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
