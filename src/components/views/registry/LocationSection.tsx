'use client';

import React, { useState } from 'react';
import { formatPersonName } from '@zms/shared';
import { 
  MapPin, 
  ExternalLink, 
  Save, 
  RefreshCw, 
  ShieldCheck, 
  Clock, 
  User, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle,
  Compass,
  Navigation
} from 'lucide-react';
import { BeneficiaryRegistryItem } from '@/types';
import { GoogleMapsLocationPicker, LocationData } from '@/components/common/GoogleMapsLocationPicker';

interface LocationSectionProps {
  registry: BeneficiaryRegistryItem;
  canEdit: boolean;
  onSaveLocationDirectly: (loc: LocationData, status: 'not_specified' | 'pending_verification' | 'verified') => Promise<boolean>;
  isSavingLocation?: boolean;
}

export const LOCATION_VERIFICATION_LABELS: Record<'not_specified' | 'pending_verification' | 'verified', { label: string; color: string; bg: string; border: string }> = {
  not_specified: { label: 'ยังไม่ได้ระบุพิกัด', color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200' },
  pending_verification: { label: 'รอตรวจสอบตำแหน่ง', color: 'text-sky-800', bg: 'bg-sky-50', border: 'border-sky-200' },
  verified: { label: 'ตรวจสอบพิกัดแล้ว', color: 'text-emerald-800', bg: 'bg-emerald-50', border: 'border-emerald-200' },
};

export function LocationSection({
  registry,
  canEdit,
  onSaveLocationDirectly,
  isSavingLocation = false,
}: LocationSectionProps) {
  // Current coordinates and details
  const initialLat = registry.latitude !== undefined ? registry.latitude : null;
  const initialLng = registry.longitude !== undefined ? registry.longitude : null;
  const initialAddr = registry.residenceAddress || registry.address || '';
  const initialPlace = registry.placeName || '';
  
  const initialStatus: 'not_specified' | 'pending_verification' | 'verified' = 
    registry.locationVerificationStatus ||
    (initialLat && initialLng ? 'verified' : 'not_specified');

  const [currentLocation, setCurrentLocation] = useState<LocationData>({
    latitude: initialLat,
    longitude: initialLng,
    residenceAddress: initialAddr,
    placeName: initialPlace,
  });

  const [verificationStatus, setVerificationStatus] = useState<'not_specified' | 'pending_verification' | 'verified'>(initialStatus);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleLocationChange = (data: LocationData) => {
    setCurrentLocation(data);
    setHasChanges(true);
    // If coords are set and status was not_specified, suggest pending or verified
    if (data.latitude && data.longitude && verificationStatus === 'not_specified') {
      setVerificationStatus('pending_verification');
    } else if (!data.latitude && !data.longitude) {
      setVerificationStatus('not_specified');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const ok = await onSaveLocationDirectly(currentLocation, verificationStatus);
      if (ok) {
        setHasChanges(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const hasCoords = currentLocation.latitude !== null && currentLocation.longitude !== null;
  const statusMeta = LOCATION_VERIFICATION_LABELS[verificationStatus] || LOCATION_VERIFICATION_LABELS.not_specified;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. Header & Location Verification Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">2. พิกัดที่อยู่อาศัยและแผนที่</h3>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs border ${statusMeta.bg} ${statusMeta.color} ${statusMeta.border}`}>
                  {statusMeta.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ระบุตำแหน่งบ้านบนแผนที่ Google Maps เพื่อความสะดวกรวดเร็วในการลงพื้นที่สำรวจและส่งมอบความช่วยเหลือ
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {hasCoords && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${currentLocation.latitude},${currentLocation.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors shadow-xs"
              >
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                <span>เปิดเส้นทางใน Google Maps</span>
              </a>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isSavingLocation}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-md disabled:opacity-50"
              >
                {isSaving || isSavingLocation ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{isSaving || isSavingLocation ? 'กำลังบันทึก...' : 'บันทึกพิกัดลงฐานข้อมูล'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Coords & Metadata Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block text-[11px] mb-0.5">ที่อยู่ที่บันทึกไว้:</span>
            <strong className="text-slate-900 block truncate font-medium" title={currentLocation.residenceAddress || registry.address}>
              {currentLocation.residenceAddress || registry.address || '-'}
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block text-[11px] mb-0.5">ละติจูด (Latitude):</span>
            <strong className="font-mono text-slate-900 block text-sm">
              {currentLocation.latitude !== null ? currentLocation.latitude.toFixed(6) : <span className="text-slate-400 font-normal italic">ยังไม่ระบุ</span>}
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block text-[11px] mb-0.5">ลองจิจูด (Longitude):</span>
            <strong className="font-mono text-slate-900 block text-sm">
              {currentLocation.longitude !== null ? currentLocation.longitude.toFixed(6) : <span className="text-slate-400 font-normal italic">ยังไม่ระบุ</span>}
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 block text-[11px]">สถานะการตรวจสอบพิกัด:</span>
            {canEdit ? (
              <select
                value={verificationStatus}
                onChange={(e) => {
                  setVerificationStatus(e.target.value as any);
                  setHasChanges(true);
                }}
                className="w-full p-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
              >
                <option value="not_specified">ยังไม่ได้ระบุพิกัด</option>
                <option value="pending_verification">รอตรวจสอบตำแหน่ง</option>
                <option value="verified">ตรวจสอบพิกัดแล้ว</option>
              </select>
            ) : (
              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${statusMeta.color}`}>
                {statusMeta.label}
              </span>
            )}
          </div>
        </div>

        {/* Update timestamp and updater */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-[11px] text-slate-500 border-t border-slate-100 mt-3">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>ปรับปรุงตำแหน่งล่าสุด: {registry.locationUpdatedAt ? new Date(registry.locationUpdatedAt).toLocaleString('th-TH') : 'ยังไม่มีบันทึก'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>ผู้ปรับปรุงข้อมูล: {registry.locationUpdatedBy || registry.surveyorName || '-'}</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Google Maps Component */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-emerald-700" />
            <span>แผนที่ดาวเทียมและถนน (สามารถค้นหาที่อยู่ ลากหมุด หรือกดระบุพิกัดปัจจุบัน)</span>
          </span>
          <span className="text-[11px] text-slate-500">คลิกบนแผนที่เพื่อปักหมุดตำแหน่งบ้าน</span>
        </div>

        <div className="p-4">
          <GoogleMapsLocationPicker
            latitude={currentLocation.latitude}
            longitude={currentLocation.longitude}
            residenceAddress={currentLocation.residenceAddress}
            placeName={currentLocation.placeName}
            beneficiaryName={formatPersonName(registry)}
            readOnly={!canEdit}
            locationUpdatedAt={registry.locationUpdatedAt}
            locationUpdatedBy={registry.locationUpdatedBy}
            onLocationChange={handleLocationChange}
            onApplyLocation={(loc) => {
              handleLocationChange(loc);
              handleSave();
            }}
          />
        </div>
      </div>

      {/* 3. Privacy & PDPA Security Alert */}
      <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-amber-900 text-xs flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0" />
        <div className="space-y-0.5">
          <strong className="block font-bold">การคุ้มครองข้อมูลพิกัดที่อยู่อาศัย (Security & PDPA Policy)</strong>
          <p className="text-amber-800 text-[11px] leading-relaxed">
            ระบบจำกัดการเข้าถึงข้อมูลพิกัดที่อยู่อาศัยเฉพาะเจ้าหน้าที่สำรวจและผู้มีสิทธิ์ตามระบบเท่านั้น ห้ามแสดงพิกัดที่อยู่อาศัยแก่บุคคลทั่วไปโดยเด็ดขาด ทุกการเปลี่ยนแปลงตำแหน่งจะถูกบันทึกประวัติเพื่อความโปร่งใส
          </p>
        </div>
      </div>
    </div>
  );
}
