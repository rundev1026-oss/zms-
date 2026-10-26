'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Heart, 
  ExternalLink,
  HelpCircle,
  FileText,
  AlertTriangle,
  Coins,
  Calculator,
  Receipt,
  Sparkles
} from 'lucide-react';

interface PublicFooterProps {
  onNavigate?: (view: string) => void;
}

export function PublicFooter({ onNavigate }: PublicFooterProps) {
  const router = useRouter();

  const handleLink = (viewId: string, path: string) => {
    if (onNavigate) {
      onNavigate(viewId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push(path);
    }
  };

  return (
    <footer className="w-full bg-[#0b2545] text-slate-300 border-t border-[#143761] text-xs">
      {/* 1. Top Footer Trust Strip */}
      <div className="w-full bg-[#081a30] border-b border-[#143761] py-3 px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-sky-200 text-xs text-center sm:text-left">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
            <span>
              <strong>มาตรฐานความโปร่งใส:</strong> ตรวจสอบรายรับ-รายจ่ายตามหลักชะรีอะฮ์ และคุ้มครองข้อมูลส่วนบุคคลตาม พ.ร.บ. PDPA
            </span>
          </div>
          <button
            onClick={() => handleLink('public-transparency', '/transparency')}
            className="inline-flex items-center gap-1 text-teal-300 hover:text-white underline font-semibold transition-colors"
          >
            <span>ดูรายงานความโปร่งใสต่อสาธารณะ</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. Main Footer Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Col 1 & 2: Organization Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#133e6f] to-teal-600 flex items-center justify-center text-white font-extrabold text-base shadow-md">
                <span className="text-amber-300">ZMS</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-base leading-tight">
                  มูลนิธิซะกาตและสาธารณกุศล
                </h3>
                <p className="text-[11px] text-slate-400">
                  Zakat Management & Public Charity Foundation
                </p>
              </div>
            </div>

            <p className="text-slate-400 leading-relaxed pr-4">
              องค์กรสาธารณกุศลที่มุ่งมั่นบริหารจัดการเงินซะกาตและเงินบริจาคด้วยความบริสุทธิ์ใจ โปร่งใส 
              ถูกต้องตามหลักศาสนบัญญัติอิสลาม เพื่อยกระดับคุณภาพชีวิตและขจัดความยากไร้ในสังคมอย่างยั่งยืน
            </p>

            <div className="space-y-2 text-slate-400 pt-2">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>สำนักงานใหญ่: 123/45 ถนนรามคำแหง แขวงหัวหมาก เขตบางกะปิ กรุงเทพมหานคร 10240</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-teal-400 shrink-0" />
                <span>ศูนย์บริการประชาชน: 02-123-4567, สายด่วนซะกาต: 081-234-5678</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-teal-400 shrink-0" />
                <span>contact@zakatfoundation.or.th (เวลาทำการ จันทร์ - ศุกร์ 08:30 - 16:30 น.)</span>
              </div>
            </div>
          </div>

          {/* Col 3: Public Services */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              บริการประชาชน
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <button 
                  onClick={() => handleLink('public-calculator', '/zakat-calculator')}
                  className="hover:text-teal-300 transition-colors text-left"
                >
                  เครื่องคำนวณซะกาต 5 หมวด
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLink('public-payment', '/zakat-payment')}
                  className="hover:text-teal-300 transition-colors text-left"
                >
                  จ่ายซะกาตผ่าน PromptPay QR
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLink('public-donate', '/donate')}
                  className="hover:text-teal-300 transition-colors text-left"
                >
                  ร่วมบริจาคสมทบทุนสาธารณะ
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLink('public-assistance', '/assistance')}
                  className="hover:text-teal-300 transition-colors text-left"
                >
                  ยื่นขอรับความช่วยเหลือสวัสดิการ
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLink('public-assistance', '/assistance')}
                  className="hover:text-teal-300 transition-colors text-left"
                >
                  ติดตามสถานะคำร้องของฉัน
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: About & Governance */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              ความโปร่งใสและหลักการ
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <button 
                  onClick={() => handleLink('public-about', '/about')}
                  className="hover:text-teal-300 transition-colors text-left"
                >
                  หลักเกณฑ์ 8 จำพวก (8 Asnaf)
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLink('public-about', '/about')}
                  className="hover:text-teal-300 transition-colors text-left"
                >
                  คณะกรรมการชะรีอะฮ์ผู้ทรงคุณวุฒิ
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLink('public-transparency', '/transparency')}
                  className="hover:text-teal-300 transition-colors text-left"
                >
                  รายงานรายรับ-รายจ่ายสาธารณะ
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLink('public-my-account', '/my-account')}
                  className="hover:text-teal-300 transition-colors text-left"
                >
                  ประวัติการบริจาค & ใบเสร็จดิจิทัล
                </button>
              </li>
            </ul>
          </div>

          {/* Col 5: Security & Whistleblower */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              ธรรมาภิบาลและความปลอดภัย
            </h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              พบเห็นความไม่โปร่งใส หรือต้องการแจ้งเบาะแส ติดต่อศูนย์รับเรื่องร้องเรียนอิสระได้โดยตรง
            </p>
            <div className="p-3 bg-[#081a30] rounded-xl border border-[#143761] space-y-1.5">
              <div className="font-semibold text-teal-300 text-xs">ศูนย์รับเรื่องร้องเรียนธรรมาภิบาล</div>
              <div className="text-[11px] text-slate-300">โทร: 02-123-4569 (ฝ่ายตรวจสอบภายใน)</div>
              <div className="text-[11px] text-slate-300">audit-whistle@zakatfoundation.or.th</div>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 pt-1">
              <Link href="/about" className="hover:text-slate-200">นโยบายความเป็นส่วนตัว (PDPA)</Link>
              <span>•</span>
              <Link href="/about" className="hover:text-slate-200">ระเบียบมูลนิธิ</Link>
            </div>
          </div>
        </div>

        {/* Real Environment Disclaimer */}
        <div className="mt-8 pt-6 border-t border-[#143761]">
          <div className="p-3.5 bg-[#081a30] border border-[#1a4478] rounded-xl flex items-start gap-3 text-sky-200/90 text-xs">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>มาตรฐานการบริหารจัดการ:</strong> มูลนิธิซะกาตและสาธารณกุศล ปฏิบัติตามมาตรฐานการบัญชีสำหรับองค์กรไม่แสวงหากำไร และพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) ทุกธุรกรรมทางการเงินและคำขอรับความช่วยเหลือจะได้รับการตรวจสอบความถูกต้องอย่างเคร่งครัด
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px] gap-2">
          <div>
            © พ.ศ. 2569 มูลนิธิซะกาตและสาธารณกุศล (ZMS Foundation). สงวนลิขสิทธิ์ทุกประการ
          </div>
          <div>
            ระบบจัดการซะกาตเวอร์ชัน 2.0 (Dual-Mode Responsive Architecture)
          </div>
        </div>
      </div>
    </footer>
  );
}
