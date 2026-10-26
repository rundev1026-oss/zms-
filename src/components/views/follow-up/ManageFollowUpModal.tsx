'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { FollowUpPlan, FollowUpVisitFormat } from '@/types';
import { useApp } from '@/context/AppContext';
import { 
  ClipboardCheck, 
  Calendar, 
  MapPin, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Camera, 
  FileText, 
  PlusCircle, 
  UserCheck, 
  Settings, 
  History, 
  Upload, 
  Trash2, 
  Loader2, 
  Image as ImageIcon,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

interface ManageFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  onSuccess: () => void;
  initialTab?: 'record' | 'schedule' | 'assign' | 'settings' | 'history';
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

export function ManageFollowUpModal({
  isOpen,
  onClose,
  planId,
  onSuccess,
  initialTab = 'record',
}: ManageFollowUpModalProps) {
  const { currentUser, showToast } = useApp();
  const [plan, setPlan] = useState<FollowUpPlan | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'record' | 'schedule' | 'assign' | 'settings' | 'history'>(initialTab);

  // System officers for reassignment
  const [officers, setOfficers] = useState<{ id: string; name: string; role: string; branch: string }[]>([]);

  // Action 1: Record Visit State
  const [followupDate, setFollowupDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [visitFormat, setVisitFormat] = useState<FollowUpVisitFormat>('field_visit');
  const [location, setLocation] = useState<string>('');
  const [inspectorName, setInspectorName] = useState<string>('');
  const [inspectionDetails, setInspectionDetails] = useState<string>('');
  const [visitResult, setVisitResult] = useState<string>('');
  const [progressAssessment, setProgressAssessment] = useState<string>('');
  const [problemsAndObstacles, setProblemsAndObstacles] = useState<string>('');
  const [additionalSupportNeeded, setAdditionalSupportNeeded] = useState<string>('');
  const [officerRecommendation, setOfficerRecommendation] = useState<string>('');
  const [nextAppointmentDate, setNextAppointmentDate] = useState<string>('');
  const [visitNotes, setVisitNotes] = useState<string>('');
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [isSubmittingVisit, setIsSubmittingVisit] = useState<boolean>(false);
  const [visitError, setVisitError] = useState<string | null>(null);

  // Action 2: Schedule State
  const [scheduledNextDate, setScheduledNextDate] = useState<string>('');
  const [scheduleNotes, setScheduleNotes] = useState<string>('');
  const [isSavingSchedule, setIsSavingSchedule] = useState<boolean>(false);

  // Action 3: Assign State
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');
  const [assignReason, setAssignReason] = useState<string>('');
  const [isSavingAssign, setIsSavingAssign] = useState<boolean>(false);

  // Action 4: Settings State
  const [editMinVisits, setEditMinVisits] = useState<number>(1);
  const [editRequiresFollowup, setEditRequiresFollowup] = useState<boolean>(true);
  const [editOptOutReason, setEditOptOutReason] = useState<string>('');
  const [settingsNotes, setSettingsNotes] = useState<string>('');
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Fetch plan details
  const fetchPlan = async () => {
    if (!planId) return;
    try {
      setIsLoadingPlan(true);
      const res = await fetch(`/api/follow-ups/${planId}`);
      const json = await res.json();
      if (json.success && json.data) {
        const p: FollowUpPlan = json.data;
        setPlan(p);
        setLocation(p.address || '');
        setInspectorName(currentUser?.name || p.assignedOfficerName || 'เจ้าหน้าที่ภาคสนาม');
        setScheduledNextDate(p.nextFollowupDate || '');
        setSelectedOfficerId(p.assignedOfficerId || '');
        setEditMinVisits(p.minVisits);
        setEditRequiresFollowup(p.requiresFollowup);
        setEditOptOutReason(p.optOutReason || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPlan(false);
    }
  };

  // Fetch available officers
  const fetchOfficers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const list = json.data
            .filter((u: any) => u.role === 'officer' || u.role === 'super_admin' || u.role === 'executive')
            .map((u: any) => ({
              id: u.id,
              name: u.name,
              role: u.role,
              branch: u.branch || 'สำนักงานใหญ่',
            }));
          setOfficers(list);
        }
      }
    } catch {
      // Fallback officer list
      setOfficers([
        { id: 'u-3', name: 'อุสมาน เจริญสุข', role: 'officer', branch: 'สาขาภาคกลางและปริมณฑล' },
        { id: 'u-1', name: 'อิบรอฮีม มานะชัย', role: 'super_admin', branch: 'สำนักงานใหญ่ กรุงเทพฯ' },
        { id: 'u-2', name: 'ดร. อับดุลลอฮ์ สัจจะธรรม', role: 'executive', branch: 'สำนักงานใหญ่ กรุงเทพฯ' },
      ]);
    }
  };

  useEffect(() => {
    if (isOpen && planId) {
      fetchPlan();
      fetchOfficers();
      setActiveTab(initialTab);
    }
  }, [isOpen, planId, initialTab]);

  if (!isOpen) return null;

  const isCareer = plan ? plan.assistanceTypeName.includes('อาชีพ') : false;
  const isHousing = plan ? plan.assistanceTypeName.includes('ที่อยู่อาศัย') || plan.assistanceTypeName.includes('ซ่อม') : false;
  const nextVisitNumber = (plan?.completedVisits || 0) + 1;

  // 1. Photo Selection Handler
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotoItems: UploadedPhoto[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);

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

    setPhotos((prev) => [...prev, ...newPhotoItems]);

    // Upload to server
    for (const item of newPhotoItems) {
      if (!item.file || !plan) continue;
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

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Submit Visit (Action 1)
  const handleSubmitVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    setVisitError(null);

    if (!inspectionDetails.trim()) {
      setVisitError('กรุณากรอกรายละเอียดสิ่งที่ตรวจสอบ');
      return;
    }
    if (!visitResult.trim()) {
      setVisitError('กรุณากรอกผลการติดตาม');
      return;
    }
    if (!progressAssessment.trim()) {
      setVisitError('กรุณากรอกความก้าวหน้าของการช่วยเหลือ');
      return;
    }

    // MANDATORY PHOTO PROOF (RULE 5)
    if (photos.length === 0) {
      setVisitError('ข้อกำหนดของระบบ: ทุกครั้งที่บันทึกการติดตาม ต้องแนบรูปหลักฐานอย่างน้อย 1 รูปก่อนส่งบันทึกสำเร็จ');
      showToast('ต้องแนบรูปหลักฐานอย่างน้อย 1 รูป', 'error');
      return;
    }

    const stillUploading = photos.some((p) => p.isUploading);
    if (stillUploading) {
      setVisitError('กรุณารอรูปภาพอัปโหลดเสร็จสิ้นก่อนกดบันทึก');
      return;
    }

    const failedPhoto = photos.find((p) => p.error || !p.filePath);
    if (failedPhoto) {
      setVisitError(`รูปภาพ ${failedPhoto.fileName} อัปโหลดไม่สำเร็จ กรุณาลบออกหรืออัปโหลดใหม่`);
      return;
    }

    setIsSubmittingVisit(true);

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
        notes: visitNotes,
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
      onSuccess();
      onClose();
    } catch (err: any) {
      setVisitError(err.message || 'บันทึกล้มเหลว');
      showToast(err.message || 'บันทึกล้มเหลว', 'error');
    } finally {
      setIsSubmittingVisit(false);
    }
  };

  // Action 2: Schedule Next Visit
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;

    if (!scheduledNextDate) {
      showToast('กรุณาระบุวันนัดติดตามครั้งถัดไป', 'error');
      return;
    }

    setIsSavingSchedule(true);
    try {
      const res = await fetch(`/api/follow-ups/${plan.id}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nextFollowupDate: scheduledNextDate,
          notes: scheduleNotes ? `กำหนดวันนัดหมาย: ${scheduleNotes}` : undefined,
          actor: {
            id: currentUser?.id || 'u-3',
            name: currentUser?.name || 'เจ้าหน้าที่ภาคสนาม',
            role: currentUser?.role || 'officer',
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'กำหนดวันนัดหมายไม่สำเร็จ');
      }

      showToast(`กำหนดวันนัดติดตามครั้งถัดไปเป็นวันที่ ${scheduledNextDate} เรียบร้อย`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการกำหนดวันนัดหมาย', 'error');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Action 3: Reassign Officer
  const handleSaveAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !selectedOfficerId) return;

    const targetOfficer = officers.find((o) => o.id === selectedOfficerId);
    if (!targetOfficer) return;

    setIsSavingAssign(true);
    try {
      const res = await fetch(`/api/follow-ups/${plan.id}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedOfficerId: targetOfficer.id,
          assignedOfficerName: targetOfficer.name,
          notes: assignReason ? `มอบหมายงานใหม่: ${assignReason}` : `เปลี่ยนผู้รับผิดชอบเป็น ${targetOfficer.name}`,
          actor: {
            id: currentUser?.id || 'u-1',
            name: currentUser?.name || 'ผู้ดูแลระบบ',
            role: currentUser?.role || 'super_admin',
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'มอบหมายเจ้าหน้าที่ไม่สำเร็จ');
      }

      showToast(`มอบหมายงานให้ ${targetOfficer.name} เรียบร้อยแล้ว`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการมอบหมายงาน', 'error');
    } finally {
      setIsSavingAssign(false);
    }
  };

  // Action 4: Settings & Adjustments
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;

    setIsSavingSettings(true);
    try {
      const res = await fetch(`/api/follow-ups/${plan.id}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minVisits: Number(editMinVisits),
          requiresFollowup: editRequiresFollowup,
          optOutReason: editOptOutReason,
          notes: settingsNotes || undefined,
          actor: {
            id: currentUser?.id || 'u-1',
            name: currentUser?.name || 'ผู้ดูแลระบบ',
            role: currentUser?.role || 'super_admin',
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ปรับปรุงข้อกำหนดไม่สำเร็จ');
      }

      showToast('ปรับปรุงข้อกำหนดแผนการติดตามสำเร็จ', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'บันทึกการตั้งค่าล้มเหลว', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`จัดการติดตามงาน — ${plan?.beneficiaryName || 'กำลังโหลด...'}`}
      size="2xl"
    >
      {isLoadingPlan || !plan ? (
        <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-3" />
          <span>กำลังโหลดข้อมูลแผนงาน...</span>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Header Summary Strip */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-slate-900 text-sm">{plan.beneficiaryName}</span>
                <span className="font-mono text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {plan.registrationNo}
                </span>
                <span className="font-mono text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {plan.applicationNo}
                </span>
              </div>
              <div className="text-slate-500 flex items-center gap-2 flex-wrap">
                <span>ประเภท: <strong className="text-teal-800">{plan.assistanceTypeName}</strong></span>
                <span>• ผู้รับผิดชอบ: <strong>{plan.assignedOfficerName}</strong></span>
                <span>• วันนัดครั้งถัดไป: <strong>{plan.nextFollowupDate || 'ยังไม่ได้กำหนดวันติดตาม'}</strong></span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] text-slate-400 block">ความคืบหน้า</span>
              <span className="text-sm font-extrabold text-teal-800 font-mono">
                {plan.completedVisits} / {plan.minVisits} ครั้ง
              </span>
              <span className="text-[10px] text-slate-500 block">
                (คงเหลือ {plan.remainingVisits} ครั้ง)
              </span>
            </div>
          </div>

          {/* Action Tabs Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-2 no-scrollbar">
            {[
              { id: 'record', label: '1. บันทึกผลการติดตาม', icon: PlusCircle },
              { id: 'schedule', label: '2. กำหนดวันนัดหมาย', icon: Calendar },
              { id: 'assign', label: '3. มอบหมายเจ้าหน้าที่', icon: UserCheck },
              { id: 'settings', label: '4. ปรับแผนติดตาม', icon: Settings },
              { id: 'history', label: '5. ประวัติการแก้ไข', icon: History },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-[#0b2545] text-amber-300 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: RECORD VISIT */}
          {activeTab === 'record' && (
            <form onSubmit={handleSubmitVisit} className="space-y-4">
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    บันทึกผลการติดตาม <strong>ครั้งที่ {nextVisitNumber}</strong> (เกณฑ์ขั้นต่ำ {plan.minVisits} ครั้ง)
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700 font-bold">
                  * ต้องแนบรูปหลักฐานอย่างน้อย 1 รูป
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    วันที่ติดตามผล <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={followupDate}
                    onChange={(e) => setFollowupDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รูปแบบการติดตาม <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={visitFormat}
                    onChange={(e) => setVisitFormat(e.target.value as FollowUpVisitFormat)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 bg-white"
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
                    เจ้าหน้าที่ผู้ลงพื้นที่ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 bg-white"
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
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 bg-white"
                    placeholder="ระบุสถานที่ หรือที่อยู่ในการลงพื้นที่"
                  />
                </div>
              </div>

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
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 bg-white"
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
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 bg-white"
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
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ปัญหาและอุปสรรคที่พบ
                  </label>
                  <textarea
                    rows={2}
                    value={problemsAndObstacles}
                    onChange={(e) => setProblemsAndObstacles(e.target.value)}
                    placeholder="เช่น ราคาวัสดุปรับตัวขึ้น หรือระบุว่า 'ไม่มี'"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 bg-white"
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
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ข้อเสนอแนะของเจ้าหน้าที่
                  </label>
                  <textarea
                    rows={2}
                    value={officerRecommendation}
                    onChange={(e) => setOfficerRecommendation(e.target.value)}
                    placeholder="ข้อเสนอแนะสำหรับคณะกรรมการหรือการพิจารณาในระยะถัดไป"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    วันที่นัดติดตามครั้งถัดไป (ถ้ามี)
                  </label>
                  <input
                    type="date"
                    value={nextAppointmentDate}
                    onChange={(e) => setNextAppointmentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 bg-white"
                  />
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    หากเว้นว่างไว้ จะแสดงว่า &quot;ยังไม่ได้กำหนดวันติดตาม&quot;
                  </span>
                </div>
              </div>

              {/* PHOTO PROOF UPLOAD (MANDATORY RULE 5) */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-rose-600" />
                      รูปภาพหลักฐาน <span className="text-rose-600 font-extrabold">* (บังคับแนบอย่างน้อย 1 รูป)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      รองรับ JPG, PNG, WebP (สูงสุด 10MB/รูป) ถ่ายจากกล้องหรือเลือกไฟล์
                    </p>
                  </div>

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
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>ถ่ายรูป</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>เลือกไฟล์</span>
                    </button>
                  </div>
                </div>

                {photos.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-rose-300 hover:border-rose-400 bg-rose-50/30 rounded-2xl p-6 text-center cursor-pointer transition-colors"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-1.5">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-rose-800">
                      ยังไม่มีรูปหลักฐาน (ต้องแนบรูปอย่างน้อย 1 รูปก่อนส่งบันทึกสำเร็จ)
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {photos.map((p, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs relative flex flex-col"
                      >
                        <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                          <img src={p.previewUrl} alt={p.fileName} className="w-full h-full object-cover" />
                          {p.isUploading && (
                            <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-[10px]">
                              <Loader2 className="w-4 h-4 animate-spin text-teal-400 mr-1" /> กำลังอัปโหลด
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 w-6 h-6 bg-rose-600/90 text-white rounded flex items-center justify-center hover:bg-rose-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="p-1.5">
                          <input
                            type="text"
                            value={p.caption}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPhotos((prev) => prev.map((item, i) => (i === idx ? { ...item, caption: val } : item)));
                            }}
                            placeholder="คำอธิบายภาพ..."
                            className="w-full px-1.5 py-0.5 text-[10px] rounded border border-slate-200"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {visitError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{visitError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVisit}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmittingVisit ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>บันทึกผลการติดตาม</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SCHEDULE NEXT VISIT */}
          {activeTab === 'schedule' && (
            <form onSubmit={handleSaveSchedule} className="space-y-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <div className="border-b border-slate-200 pb-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-teal-700" />
                  กำหนดวันนัดติดตามครั้งถัดไป
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  การกำหนดวันนัดหมายเป็นการวางแผนล่วงหน้า จะไม่นับเป็นครั้งที่ดำเนินการสำเร็จจนกว่าจะมีการลงพื้นที่และแนบรูปหลักฐานจริง
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วันนัดติดตามครั้งถัดไป <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={scheduledNextDate}
                  onChange={(e) => setScheduledNextDate(e.target.value)}
                  className="w-full sm:w-1/2 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมายเหตุหรือวัตถุประสงค์ของการนัดหมาย
                </label>
                <textarea
                  rows={3}
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  placeholder="เช่น นัดหมายตรวจรับมอบงานซ่อมหลังคา หรือนัดตรวจยอดขายประจำไตรมาส"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 bg-white"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSavingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  <span>บันทึกวันนัดหมาย</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: REASSIGN OFFICER */}
          {activeTab === 'assign' && (
            <form onSubmit={handleSaveAssign} className="space-y-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <div className="border-b border-slate-200 pb-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-teal-700" />
                  มอบหมายหรือเปลี่ยนเจ้าหน้าที่ผู้รับผิดชอบ
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  เปลี่ยนเจ้าหน้าที่ผู้รับผิดชอบการติดตามผลสำหรับรายการช่วยเหลือนี้ (ระบบจะบันทึกประวัติการมอบหมายใน Audit Log)
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เลือกเจ้าหน้าที่ผู้รับผิดชอบ <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 bg-white"
                >
                  <option value="">-- กรุณาเลือกเจ้าหน้าที่ --</option>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.role} • {o.branch})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เหตุผลในการมอบหมายงานใหม่
                </label>
                <textarea
                  rows={2}
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  placeholder="เช่น มอบหมายตามพื้นที่เขตรับผิดชอบ หรือโอนย้ายหน้าที่"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 bg-white"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingAssign}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSavingAssign ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <span>ยืนยันการมอบหมายงาน</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: ADJUST PLAN SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <div className="border-b border-slate-200 pb-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  ปรับแผนติดตามตามเงื่อนไขที่อนุญาต
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  กติกาขั้นต่ำบังคับใช้จากฝั่งเซิร์ฟเวอร์ (ที่อยู่อาศัย &gt;= 1 ครั้ง, ต่อยอดอาชีพ &gt;= 6 ครั้ง)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    จำนวนครั้งเป้าหมายขั้นต่ำ (ครั้ง)
                  </label>
                  <input
                    type="number"
                    min={isCareer ? 6 : (isHousing ? 1 : 1)}
                    value={editMinVisits}
                    onChange={(e) => setEditMinVisits(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 bg-white"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    {isHousing && 'งานซ่อมสร้างที่อยู่อาศัย: ขั้นต่ำอย่างน้อย 1 ครั้ง (เพิ่มได้ตามความจำเป็น)'}
                    {isCareer && 'งานต่อยอดอาชีพ: ขั้นต่ำอย่างน้อย 6 ครั้ง (เพิ่มได้ตามความจำเป็น)'}
                    {!isHousing && !isCareer && 'ความช่วยเหลือประเภทอื่น: ปรับตามดุลยพินิจของเจ้าหน้าที่'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หมายเหตุแผนดำเนินงาน
                  </label>
                  <input
                    type="text"
                    value={settingsNotes}
                    onChange={(e) => setSettingsNotes(e.target.value)}
                    placeholder="ระบุข้อสังเกตหรือแผนเพิ่มเติม"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 bg-white"
                  />
                </div>
              </div>

              {!isHousing && !isCareer && (
                <div className="pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editRequiresFollowup}
                      onChange={(e) => setEditRequiresFollowup(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      ต้องการติดตามผลสำหรับรายการช่วยเหลือนี้
                    </span>
                  </label>

                  {!editRequiresFollowup && (
                    <div className="mt-3">
                      <label className="block text-xs font-bold text-rose-800 mb-1">
                        เหตุผลที่ไม่ต้องการติดตามผล <span className="text-rose-600">*</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={editOptOutReason}
                        onChange={(e) => setEditOptOutReason(e.target.value)}
                        placeholder="ระบุเหตุผล เช่น ได้รับเงินช่วยเหลือฉุกเฉินครบถ้วนและปัญหาคลี่คลายแล้ว"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-rose-300 bg-white"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                  <span>บันทึกการปรับปรุงแผน</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: AUDIT LOGS HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="border-b border-slate-200 pb-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-teal-700" />
                  ประวัติการแก้ไขและบันทึกการทำงาน (Audit Trail)
                </h4>
              </div>

              {(!plan.auditLogs || plan.auditLogs.length === 0) ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  ยังไม่มีประวัติการแก้ไขข้อกำหนด
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {plan.auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{log.action}</span>
                          <span className="text-slate-400">• {log.actorName}</span>
                        </div>
                        <p className="text-slate-600 mt-1">{log.notes}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(log.createdAt).toLocaleString('th-TH')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
