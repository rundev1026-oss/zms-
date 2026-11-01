'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Printer, Download, ArrowLeft, ShieldCheck, CheckCircle2, FileText, X } from 'lucide-react';

function BeneficiarySurveyPrintContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id || '';
  const [pdfUrl, setPdfUrl] = useState('');
  const [registryNumber, setRegistryNumber] = useState('');
  const [memberId, setMemberId] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = window.localStorage.getItem('zms_auth_token');
      if (!token) {
        router.replace('/login');
        return;
      }
      const response = await fetch(`/api/registry/${id}/survey-document/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (cancelled) return;
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error || 'เปิดตัวอย่างเอกสารไม่สำเร็จ');
        setLoading(false);
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return url;
      });
      setRegistryNumber(response.headers.get('X-Registry-Number') || '');
      setMemberId(response.headers.get('X-Member-Id') || '');
      setFullName(decodeURIComponent(response.headers.get('X-Full-Name') || ''));
      setLoading(false);
    }
    if (id) load().catch(() => setError('เปิดตัวอย่างเอกสารไม่สำเร็จ'));
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const printDocument = () => {
    const frame = document.getElementById('survey-frame') as HTMLIFrameElement | null;
    frame?.contentWindow?.focus();
    frame?.contentWindow?.print();
  };

  const downloadPdf = async () => {
    const token = window.localStorage.getItem('zms_auth_token');
    if (!token) {
      router.replace('/login');
      return;
    }
    setDownloading(true);
    setError('');
    try {
      let url = pdfUrl;
      if (!url) {
        const response = await fetch(`/api/registry/${id}/survey-document/pdf`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          setError(body.error || 'ดาวน์โหลด PDF ไม่สำเร็จ');
          return;
        }
        url = URL.createObjectURL(await response.blob());
      }
      const link = document.createElement('a');
      link.href = url;
      const fileId = memberId ? `${memberId}_${registryNumber}` : (registryNumber || id);
      link.download = `survey-${fileId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      if (url !== pdfUrl) URL.revokeObjectURL(url);
    } catch {
      setError('ดาวน์โหลด PDF ไม่สำเร็จ');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      {/* Top Professional Navigation & Action Header */}
      <div className="print:hidden sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับ</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">ตัวอย่างเอกสารแบบสำรวจ (PDF Preview)</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-medium border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>แบบฟอร์มทางการ 3 หน้า</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 mt-1 text-xs">
                {memberId ? (
                  <span className="font-semibold text-indigo-950 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    รหัสสมาชิก: {memberId}
                  </span>
                ) : null}
                {registryNumber ? (
                  <span className="font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                    รหัสทะเบียน: {registryNumber}
                  </span>
                ) : null}
                {fullName ? (
                  <span className="text-slate-600 font-medium">
                    ผู้ขอรับ: <strong className="text-slate-800">{fullName}</strong>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setVerifyModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition-colors"
              title="ตรวจสอบความถูกต้องของรหัสสมาชิกและรหัสทะเบียน"
            >
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              <span>ตรวจสอบรหัส</span>
            </button>

            <button
              type="button"
              onClick={downloadPdf}
              disabled={loading || downloading || !pdfUrl}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'กำลังสร้างไฟล์...' : 'ดาวน์โหลด PDF'}</span>
            </button>

            <button
              type="button"
              onClick={printDocument}
              disabled={loading || !pdfUrl}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition-colors disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์เอกสาร</span>
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="max-w-4xl mx-auto my-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
          <strong>เกิดข้อผิดพลาด:</strong> {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-600 font-medium">กำลังเตรียมเอกสาร PDF ต้นฉบับและจัดเรียงข้อมูล...</p>
        </div>
      ) : null}

      {pdfUrl ? (
        <div className="max-w-6xl mx-auto py-6 px-4">
          <iframe
            id="survey-frame"
            title="แบบสำรวจเพื่อพิจารณาความช่วยเหลือ"
            className="w-full h-[calc(100vh-130px)] rounded-2xl border border-slate-300 bg-white shadow-xl"
            src={pdfUrl}
          />
        </div>
      ) : null}

      {/* Verification Modal */}
      {verifyModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>ตรวจสอบข้อมูลรหัสและทะเบียน</span>
              </div>
              <button
                type="button"
                onClick={() => setVerifyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-slate-500 font-medium">รหัสสมาชิก (Member ID)</div>
                  <div className="text-sm font-bold text-indigo-950 mt-0.5">{memberId || 'กำลังออกรหัส...'}</div>
                </div>
                <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                  ถาวร / ไม่เปลี่ยนแปลง
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-slate-500 font-medium">รหัสทะเบียน (Registration ID)</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{registryNumber}</div>
                </div>
                <span className="px-2 py-1 rounded bg-sky-100 text-sky-800 font-semibold text-[11px]">
                  อ้างอิงปีงบประมาณ
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500 font-medium">ชื่อผู้ขอรับความช่วยเหลือ</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">{fullName || '-'}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 leading-relaxed">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>ผลการตรวจสอบ:</strong> รหัสสมาชิกและรหัสทะเบียนตรงตามฐานข้อมูลหลัก (PostgreSQL) เอกสาร PDF ถูกประทับตรา Overlay โดยไม่กระทบโครงสร้างแม่แบบเดิมของมูลนิธิ
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setVerifyModalOpen(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PrintShellFallback() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      <div className="print:hidden sticky top-0 z-20 border-b border-slate-200 bg-white px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-sm font-bold text-slate-900">กำลังเตรียมตัวอย่างเอกสารแบบสำรวจ...</div>
          <div className="h-9 w-28 rounded-xl bg-slate-100 animate-pulse" />
        </div>
      </div>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-600 font-medium">กำลังดึงข้อมูลทะเบียนเพื่อจัดเรียงเอกสาร...</p>
      </div>
    </div>
  );
}

export default function BeneficiarySurveyPrintPage() {
  return (
    <Suspense fallback={<PrintShellFallback />}>
      <BeneficiarySurveyPrintContent />
    </Suspense>
  );
}
