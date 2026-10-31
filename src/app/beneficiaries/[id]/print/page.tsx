'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function BeneficiarySurveyPrintPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id || '';
  const [pdfUrl, setPdfUrl] = useState('');
  const [registryNumber, setRegistryNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

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
      link.download = `survey-${registryNumber || id}.pdf`;
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
    <div className="min-h-screen bg-slate-200 text-slate-900">
      <div className="print:hidden sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 py-3">
        <div>
          <div className="text-sm font-bold text-slate-900">ตัวอย่างเอกสารก่อนพิมพ์</div>
          <div className="text-xs text-slate-600">
            {registryNumber ? `${registryNumber} · ${fullName}` : 'แบบสำรวจเพื่อพิจารณาความช่วยเหลือ'}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
          >
            กลับหน้ารายละเอียด
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={loading || downloading || !pdfUrl}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {downloading ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}
          </button>
          <button
            type="button"
            onClick={printDocument}
            disabled={loading || !pdfUrl}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            พิมพ์เอกสาร
          </button>
        </div>
      </div>
      {error ? <p className="print:hidden px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="px-4 py-6 text-sm">กำลังดึงข้อมูลทะเบียนเพื่อจัดเรียงเอกสาร...</p> : null}
      {pdfUrl ? (
        <iframe
          id="survey-frame"
          title="แบบสำรวจเพื่อพิจารณาความช่วยเหลือ"
          className="mx-auto my-4 block h-[calc(100vh-88px)] w-[210mm] border border-slate-300 bg-white shadow"
          src={pdfUrl}
        />
      ) : null}
    </div>
  );
}
