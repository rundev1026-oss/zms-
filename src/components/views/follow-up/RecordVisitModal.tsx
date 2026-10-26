'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/common/Modal';
import { FollowUpPlan, FollowUpVisitFormat } from '@/types';
import { useApp } from '@/context/AppContext';
import { 
  Camera, 
  Upload, 
  X, 
  Calendar, 
  MapPin, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Clock, 
  Sparkles,
  PhoneCall,
  Video,
  Building,
  Image as ImageIcon,
  Loader2,
  Trash2
} from 'lucide-react';

interface RecordVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: FollowUpPlan;
  onSuccess: () => void;
}

interface UploadedPhoto {
  file?: File;
  previewUrl: string;
  fileName: string;
  filePath?: string;
  fileType: string;
  fileSize: number;
  caption: string;
  isUploading: boolean;
  error?: string;
}

export function RecordVisitModal({ isOpen, onClose, plan, onSuccess }: RecordVisitModalProps) {
  const { currentUser, showToast, refreshFollowUpData } = useApp();

  const isCareer = plan.assistanceTypeName.includes('อาชีพ');
  const isHousing = plan.assistanceTypeName.includes('ที่อยู่อาศัย') || plan.assistanceTypeName.includes('ซ่อม');

  const nextVisitNumber = (plan.completedVisits || 0) + 1;

  // Form State
  const [followupDate, setFollowupDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [visitFormat, setVisitFormat] = useState<FollowUpVisitFormat>('field_visit');
  const [location, setLocation] = useState<string>(plan.address || '');
  const [inspectorName, setInspectorName] = useState<string>(currentUser?.name || plan.assignedOfficerName || 'เจ้าหน้าที่ภาคสนาม');
  
  const [inspectionDetails, setInspectionDetails] = useState<string>('');
  const [visitResult, setVisitResult] = useState<string>('');
  const [progressAssessment, setProgressAssessment] = useState<string>('');
  const [problemsAndObstacles, setProblemsAndObstacles] = useState<string>('');
  const [additionalSupportNeeded, setAdditionalSupportNeeded] = useState<string>('');
  const [officerRecommendation, setOfficerRecommendation] = useState<string>('');
  const [nextAppointmentDate, setNextAppointmentDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [requiresAdditional, setRequiresAdditional] = useState<boolean>(false);

  // Photos State
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Handle local photo selection & upload to server
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotoItems: UploadedPhoto[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);

      // Validate client side
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type.toLowerCase())) {
        showToast(`ไฟล์ ${file.name} ไม่ใช่ไฟล์รูปภาพที่รองรับ (รองรับ JPG, PNG, WebP)`, 'error');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast(`ไฟล์ ${file.name} มีขนาดเกิน 10MB`, 'error');
        continue;
      }

      newPhotoItems.push({
        file,
        previewUrl,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        caption: `รูปภาพหลักฐานการติดตามครั้งที่ ${nextVisitNumber}`,
        isUploading: true,
      });
    }

    if (newPhotoItems.length === 0) return;

    // Append to state
    setPhotos((prev) => [...prev, ...newPhotoItems]);

    // Upload each file to server to get real persistent file path
    for (const item of newPhotoItems) {
      if (!item.file) continue;
      const formData = new FormData();
      formData.append('photo', item.file);
      formData.append('planId', plan.id);

      try {
        const res = await fetch('/api/follow-ups/upload', {
          method: 'POST',
          body: formData,
        });
        const json = await res.json();
        if (json.success && json.data) {
          setPhotos((prev) =>
            prev.map((p) =>
              p.previewUrl === item.previewUrl
                ? {
                    ...p,
                    filePath: json.data.filePath,
                    fileName: json.data.fileName,
                    fileSize: json.data.fileSize,
                    fileType: json.data.fileType,
                    isUploading: false,
                  }
                : p
            )
          );
        } else {
          setPhotos((prev) =>
            prev.map((p) =>
              p.previewUrl === item.previewUrl
                ? { ...p, isUploading: false, error: json.error || 'อัปโหลดไม่สำเร็จ' }
                : p
            )
          );
        }
      } catch (err: any) {
        setPhotos((prev) =>
          prev.map((p) =>
            p.previewUrl === item.previewUrl
              ? { ...p, isUploading: false, error: err.message || 'การเชื่อมต่อล้มเหลว' }
              : p
          )
        );
      }
    }

    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCaptionChange = (index: number, caption: string) => {
    setPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, caption } : p))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Strict validation
    if (!inspectionDetails.trim()) {
      setSubmitError('กรุณากรอกรายละเอียดสิ่งที่ตรวจสอบ');
      return;
    }
    if (!visitResult.trim()) {
      setSubmitError('กรุณากรอกผลการติดตาม');
      return;
    }
    if (!progressAssessment.trim()) {
      setSubmitError('กรุณากรอกความก้าวหน้าของการช่วยเหลือ');
      return;
    }

    // MANDATORY PHOTO PROOF (RULE 5)
    if (photos.length === 0) {
      setSubmitError('ข้อกำหนดของระบบ: ทุกครั้งที่บันทึกการติดตาม ต้องแนบรูปหลักฐานอย่างน้อย 1 รูปก่อนส่งบันทึกสำเร็จ');
      showToast('ต้องแนบรูปหลักฐานอย่างน้อย 1 รูป', 'error');
      return;
    }

    // Check if any photo is still uploading
    const stillUploading = photos.some((p) => p.isUploading);
    if (stillUploading) {
      setSubmitError('กรุณารอรูปภาพอัปโหลดเสร็จสิ้นก่อนกดบันทึก');
      return;
    }

    // Check if any photo had an error
    const failedPhoto = photos.find((p) => p.error || !p.filePath);
    if (failedPhoto) {
      setSubmitError(`รูปภาพ ${failedPhoto.fileName} อัปโหลดไม่สำเร็จ กรุณาลบออกหรืออัปโหลดใหม่`);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        followupDate,
        visitFormat,
        location,
        inspectorId: currentUser?.id || 'u-3',
        inspectorName: inspectorName || currentUser?.name || 'เจ้าหน้าที่ภาคสนาม',
        inspectionDetails,
        visitResult,
        progressAssessment,
        problemsAndObstacles,
        additionalSupportNeeded,
        officerRecommendation,
        nextAppointmentDate: nextAppointmentDate.trim() || undefined,
        notes,
        requiresAdditional,
        attachments: photos.map((p) => ({
          fileName: p.fileName,
          filePath: p.filePath,
          fileType: p.fileType,
          fileSize: p.fileSize,
          caption: p.caption,
        })),
        actor: {
          id: currentUser?.id || 'u-3',
          name: currentUser?.name || 'เจ้าหน้าที่ภาคสนาม',
          role: currentUser?.role || 'officer',
        },
      };

      const res = await fetch(`/api/follow-ups/${plan.id}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'บันทึกผลการติดตามล้มเหลว');
      }

      showToast(`บันทึกผลการติดตามครั้งที่ ${nextVisitNumber} สำเร็จ`, 'success');
      await refreshFollowUpData();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      showToast(err.message || 'บันทึกล้มเหลว', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`บันทึกผลการติดตามการช่วยเหลือ (ครั้งที่ ${nextVisitNumber})`}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Header Information (Pre-populated from system) */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-3 mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ข้อมูลรายการช่วยเหลือ & ผู้มีสิทธิ์รับซะกาต
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0b2545] text-amber-300">
              ครั้งที่ {nextVisitNumber} (เกณฑ์ขั้นต่ำ {plan.minVisits} ครั้ง)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block">รหัสทะเบียน:</span>
              <span className="font-bold text-slate-900">{plan.registrationNo}</span>
            </div>
            <div>
              <span className="text-slate-400 block">ชื่อผู้รับความช่วยเหลือ:</span>
              <span className="font-bold text-slate-900">{plan.beneficiaryName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">เลขที่คำร้อง / ช่วยเหลือ:</span>
              <span className="font-bold text-slate-900 font-mono">{plan.applicationNo}</span>
            </div>
            <div>
              <span className="text-slate-400 block">ประเภทความช่วยเหลือ:</span>
              <span className="font-bold text-teal-800">{plan.assistanceTypeName}</span>
            </div>
          </div>

          {plan.disbursedAmount && plan.disbursedAmount > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200/50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span>
                ยอดเงินช่วยเหลือที่ส่งมอบ: <strong className="text-emerald-700">{plan.disbursedAmount.toLocaleString()} บาท</strong>
              </span>
              <span>
                สถานะปัจจุบัน: <strong className="text-slate-800">{plan.statusTh}</strong> (ติดตามแล้ว {plan.completedVisits}/{plan.minVisits} ครั้ง)
              </span>
            </div>
          )}
        </div>

        {/* 2. Visit Logistics */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-teal-600" />
            ข้อมูลการลงพื้นที่ / การติดต่อ
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                วันที่ติดตามผล <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={followupDate}
                onChange={(e) => setFollowupDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                รูปแบบการติดตาม <span className="text-rose-500">*</span>
              </label>
              <select
                value={visitFormat}
                onChange={(e) => setVisitFormat(e.target.value as FollowUpVisitFormat)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              >
                <option value="field_visit">ลงพื้นที่ตรวจเยี่ยมจริง</option>
                <option value="phone">โทรศัพท์ติดตามผล</option>
                <option value="video_call">ติดต่อผ่านวิดีโอคอล</option>
                <option value="office">นัดหมายพบที่สำนักงาน</option>
                <option value="other">รูปแบบอื่น ๆ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                เจ้าหน้าที่ผู้ติดตาม <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                placeholder="ชื่อ-นามสกุล เจ้าหน้าที่"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              สถานที่ติดตาม / ที่อยู่ตรวจเยี่ยม
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                placeholder="ระบุสถานที่ หรือที่อยู่ในการลงพื้นที่"
              />
            </div>
          </div>
        </div>

        {/* 3. Follow-up Findings & Content */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-teal-600" />
            รายละเอียดผลการตรวจสอบและการประเมิน
          </h4>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              รายละเอียดสิ่งที่ตรวจสอบ <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={inspectionDetails}
              onChange={(e) => setInspectionDetails(e.target.value)}
              placeholder={
                isHousing
                  ? 'เช่น ตรวจสอบความคืบหน้าการซ่อมแซมหลังคา ฝาผนัง ห้องน้ำ ตรวจสอบความมั่นคงแข็งแรงของโครงสร้าง'
                  : isCareer
                  ? 'เช่น ตรวจสอบการจัดซื้ออุปกรณ์ทำกิน เครื่องมือประกอบอาชีพ สถานที่ตั้งร้านค้า/กิจการ'
                  : 'เช่น ตรวจสอบสภาพความเป็นอยู่ ข้าวสารอาหารแห้ง ยารักษาโรค และสุขอนามัยของครอบครัว'
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ผลการติดตาม <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={visitResult}
              onChange={(e) => setVisitResult(e.target.value)}
              placeholder="สรุปผลการตรวจเยี่ยม เช่น ดำเนินการเสร็จสิ้นตามแผน มีการนำเงินซะกาตไปใช้ตรงตามวัตถุประสงค์"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ความก้าวหน้าของการช่วยเหลือ {isHousing ? '(เช่น ความคืบหน้างานก่อสร้าง/ส่งมอบ)' : isCareer ? '(เช่น การดำเนินธุรกิจ ยอดขาย รายได้)' : ''} <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={progressAssessment}
              onChange={(e) => setProgressAssessment(e.target.value)}
              placeholder={
                isHousing
                  ? 'ความคืบหน้าร้อยละ เช่น งานโครงสร้างแล้วเสร็จ 80%, มีการส่งมอบบ้านแล้วครอบครัวเข้าอยู่อาศัยได้ปลอดภัย'
                  : isCareer
                  ? 'เช่น เริ่มเปิดร้านขายของแล้ว รายได้เฉลี่ยวันละ 500-700 บาท เริ่มพึ่งพาตนเองได้'
                  : 'เช่น สุขภาพผู้ป่วยดีขึ้น มีค่าใช้จ่ายยังชีพเพียงพอสำหรับเดือนนี้'
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ปัญหาและอุปสรรคที่พบ
              </label>
              <textarea
                rows={2}
                value={problemsAndObstacles}
                onChange={(e) => setProblemsAndObstacles(e.target.value)}
                placeholder="เช่น ราคาวัสดุปรับตัวขึ้น, ผู้ขอรับป่วยกะทันหัน หรือระบุว่า 'ไม่มี'"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ความต้องการช่วยเหลือเพิ่มเติม
              </label>
              <textarea
                rows={2}
                value={additionalSupportNeeded}
                onChange={(e) => setAdditionalSupportNeeded(e.target.value)}
                placeholder="เช่น ต้องการการอบรมพัฒนาทักษะอาชีพเพิ่มเติม หรืออุปกรณ์เสริม"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ข้อเสนอแนะของเจ้าหน้าที่
            </label>
            <textarea
              rows={2}
              value={officerRecommendation}
              onChange={(e) => setOfficerRecommendation(e.target.value)}
              placeholder="ข้อเสนอแนะสำหรับคณะกรรมการหรือการพิจารณาในระยะถัดไป"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                วันที่นัดติดตามครั้งถัดไป (ถ้ามี)
              </label>
              <input
                type="date"
                value={nextAppointmentDate}
                onChange={(e) => setNextAppointmentDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              />
              <span className="text-[11px] text-slate-400 block mt-0.5">
                หากยังไม่กำหนด ให้เว้นว่างไว้ ระบบจะแสดงว่า &quot;ยังไม่ได้กำหนดวันติดตาม&quot;
              </span>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requiresAdditional}
                  onChange={(e) => setRequiresAdditional(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-800">
                  ต้องติดตามผลเพิ่มเติมเป็นกรณีพิเศษ (เกินเกณฑ์ขั้นต่ำ)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* 4. MANDATORY PHOTO EVIDENCE UPLOAD SECTION (Rule 5) */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-rose-600" />
                รูปภาพหลักฐานการลงพื้นที่ / การติดต่อ
                <span className="text-rose-600 font-extrabold">* (บังคับแนบอย่างน้อย 1 รูป)</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                รองรับไฟล์ JPG, PNG, WebP (สูงสุด 10MB/รูป) ถ่ายจากกล้องโทรศัพท์หรือเลือกจากอุปกรณ์
              </p>
            </div>

            {/* Hidden native inputs for File and Camera */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handlePhotoSelect}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors min-h-[36px]"
              >
                <Camera className="w-3.5 h-3.5 text-slate-700" />
                <span>ถ่ายรูป</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-colors min-h-[36px]"
              >
                <Upload className="w-3.5 h-3.5 text-teal-700" />
                <span>เลือกไฟล์รูปภาพ</span>
              </button>
            </div>
          </div>

          {/* Photo Previews Grid */}
          {photos.length === 0 ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-rose-300 hover:border-rose-400 bg-rose-50/30 rounded-2xl p-6 text-center cursor-pointer transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-2">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-rose-800">
                ยังไม่มีรูปหลักฐาน (ต้องแนบรูปอย่างน้อย 1 รูปก่อนส่งบันทึกสำเร็จ)
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                คลิกที่นี่ หรือใช้ปุ่ม &quot;ถ่ายรูป&quot; / &quot;เลือกไฟล์รูปภาพ&quot; ด้านบน
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((p, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs relative group flex flex-col"
                >
                  <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                    <img
                      src={p.previewUrl}
                      alt={p.fileName}
                      className="w-full h-full object-cover"
                    />
                    {p.isUploading && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex flex-col items-center justify-center text-white">
                        <Loader2 className="w-6 h-6 animate-spin text-teal-400 mb-1" />
                        <span className="text-[10px] font-bold">กำลังอัปโหลด...</span>
                      </div>
                    )}
                    {p.error && (
                      <div className="absolute inset-0 bg-rose-900/80 text-white p-2 flex flex-col items-center justify-center text-center">
                        <AlertCircle className="w-5 h-5 text-rose-300 mb-1" />
                        <span className="text-[10px] font-bold">{p.error}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1.5 right-1.5 w-7 h-7 bg-rose-600/90 text-white rounded-lg flex items-center justify-center hover:bg-rose-700 transition-colors shadow-xs"
                      title="ลบรูปนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-2 flex-1 flex flex-col justify-between">
                    <input
                      type="text"
                      value={p.caption}
                      onChange={(e) => handleCaptionChange(idx, e.target.value)}
                      placeholder="คำอธิบายรูปภาพ..."
                      className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 focus:outline-hidden focus:border-teal-500 text-slate-700"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span className="truncate max-w-[120px]">{p.fileName}</span>
                      <span>{(p.fileSize / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors min-h-[40px]"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50 min-h-[40px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>บันทึกผลการติดตาม</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
