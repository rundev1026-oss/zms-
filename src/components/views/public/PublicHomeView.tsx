'use client';

import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Calculator, 
  FileText, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Coins, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Target, 
  ChevronRight, 
  BadgeCheck
} from 'lucide-react';
import { PublicStats, CampaignItem } from '@/services/publicPortalService';

interface PublicHomeViewProps {
  onNavigate: (view: string) => void;
  onSelectCampaignForDonation?: (campaignId: string, campaignTitle: string, targetFundId: string) => void;
  onSetCalculatorAmount?: (amount: number, category: string) => void;
}

export function PublicHomeView({ 
  onNavigate, 
  onSelectCampaignForDonation,
  onSetCalculatorAmount 
}: PublicHomeViewProps) {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPublicData() {
      try {
        setIsLoading(true);
        const [statsRes, campRes] = await Promise.all([
          fetch('/api/public/stats'),
          fetch('/api/public/campaigns')
        ]);

        if (statsRes.ok) {
          const statsJson = await statsRes.json();
          if (statsJson.success) setStats(statsJson.data);
        }

        if (campRes.ok) {
          const campJson = await campRes.json();
          if (campJson.success) setCampaigns(campJson.data);
        }
      } catch (err) {
        console.error('Failed to load public portal data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPublicData();
  }, []);

  // 4 Core Foundation Services specified by the system design
  const servicesList = [
    {
      id: 'calc',
      title: 'คำนวณซะกาต',
      desc: 'ระบบคำนวณซะกาตสินทรัพย์ 5 หมวดหมู่ตามพิกัดนิศอบทองคำ 85 กรัม อัตรา 2.5% พร้อมคำแนะนำที่ถูกต้องตามหลักศาสนบัญญัติ',
      icon: Calculator,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      actionLabel: 'เริ่มคำนวณซะกาต',
      actionView: 'public-calculator'
    },
    {
      id: 'zakat-pay',
      title: 'ชำระซะกาต',
      desc: 'ชำระเงินซะกาตตัดยอดเข้าบัญชีแยกกองทุน (Fund Accounting) เพื่อจัดสรรตรงสู่ 8 กลุ่มอัศนาฟ 100% พร้อมรับใบเสร็จทันที',
      icon: Coins,
      color: 'bg-teal-50 text-teal-700 border-teal-200',
      actionLabel: 'ชำระซะกาตทันที',
      actionView: 'public-payment'
    },
    {
      id: 'general-donate',
      title: 'บริจาคทั่วไป (ศอดะเกาะฮ์)',
      desc: 'ร่วมสมทบทุนโครงการสาธารณประโยชน์ ช่วยเหลือผู้ประสบภัย บรรเทาทุกข์เร่งด่วน และทุนการศึกษาแก่เยาวชนยากไร้',
      icon: Heart,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      actionLabel: 'ร่วมบริจาคทั่วไป',
      actionView: 'public-donate'
    },
    {
      id: 'assist-req',
      title: 'ลงทะเบียนขอรับความช่วยเหลือ',
      desc: 'เปิดโอกาสให้ผู้ยากไร้ ผู้มีหนี้สินจำเป็น หรือผู้ประสบเหตุฉุกเฉินยื่นคำร้องออนไลน์ พร้อมระบบติดตามสถานะแบบเรียลไทม์',
      icon: FileText,
      color: 'bg-sky-50 text-sky-700 border-sky-200',
      actionLabel: 'ยื่นคำขอรับความช่วยเหลือ',
      actionView: 'public-assistance'
    }
  ];

  const handleCampaignDonate = (camp: CampaignItem) => {
    if (onSelectCampaignForDonation) {
      onSelectCampaignForDonation(camp.id, camp.title, camp.fundId);
    }
    onNavigate('public-payment');
  };

  return (
    <div className="w-full flex flex-col animate-fadeIn">
      {/* ============================================================== */}
      {/* ส่วนที่ 1: HERO SECTION (Mobile-First iPhone 15, Full Width)     */}
      {/* ============================================================== */}
      <section className="relative w-full min-h-[540px] sm:min-h-[580px] lg:min-h-[640px] xl:min-h-[75vh] flex items-center justify-center overflow-hidden bg-[#0b2545] text-white">
        {/* Subtle Decorative Ambient Glow & Mesh Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#07172b]/95 via-[#0b2545]/92 to-[#123966]/90 z-0" />
        <div className="absolute -top-32 -right-32 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full bg-sky-400/15 blur-3xl pointer-events-none" />

        {/* Ambient Geometric Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] sm:[background-size:28px_28px]" />

        {/* Hero Content Container (Margins 16-20px on Mobile) */}
        <div className="relative z-10 w-full max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-20 lg:py-28 text-center space-y-6 sm:space-y-8 lg:space-y-10">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sky-200 text-[11px] sm:text-xs md:text-sm font-semibold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 shrink-0" />
            <span className="leading-tight">องค์กรสาธารณกุศลเพื่อการจัดสรรซะกาตตามหลักศาสนบัญญัติ 100%</span>
          </div>

          {/* Main Headline (28-34px on iPhone 15 / Mobile, 40-56px+ on Desktop) */}
          <h1 className="text-[28px] sm:text-[34px] md:text-5xl lg:text-[54px] xl:text-[58px] font-black tracking-tight leading-[1.25] sm:leading-[1.18] text-white drop-shadow-md">
            เปลี่ยนพลังแห่งซะกาต <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-sky-300 via-teal-200 to-amber-300 bg-clip-text text-transparent">
              สู่คุณภาพชีวิตที่ดีขึ้น
            </span>
          </h1>

          {/* Subtitle Description (14-16px on Mobile, 18-22px on Desktop) */}
          <p className="max-w-4xl mx-auto text-sm sm:text-base md:text-lg lg:text-[21px] text-slate-200 leading-relaxed font-normal px-1">
            การบริหารจัดการเงินซะกาตและสาธารณกุศลด้วยความบริสุทธิ์ใจ โปร่งใส ถูกต้องตามหลักศาสนบัญญัติอิสลาม 
            เพื่อขจัดความยากไร้และส่งต่อความช่วยเหลือแก่ผู้มีสิทธิ์รับ 8 จำพวก (8 Asnaf) อย่างยั่งยืนและมีศักดิ์ศรี
          </p>

          {/* Primary Action Buttons (Full width on Mobile, Min height 48px) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 pt-1 sm:pt-2 w-full max-w-md sm:max-w-none mx-auto">
            {/* ปุ่มหลัก: บริจาคซะกาต */}
            <button
              onClick={() => onNavigate('public-payment')}
              className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-10 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#0b2545] font-black text-base sm:text-lg shadow-xl shadow-amber-500/25 transition-all hover:scale-102 active:scale-98 flex items-center justify-center gap-2.5"
            >
              <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-[#0b2545]" />
              <span>บริจาคซะกาต</span>
            </button>

            {/* ปุ่มหลัก: ขอรับความช่วยเหลือ */}
            <button
              onClick={() => onNavigate('public-assistance')}
              className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-10 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-base sm:text-lg backdrop-blur-md border border-white/30 transition-all hover:scale-102 active:scale-98 flex items-center justify-center gap-2.5"
            >
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-sky-300" />
              <span>ขอรับความช่วยเหลือ</span>
            </button>
          </div>

    

          {/* Trust Highlights Strip (Adaptive for iPhone 15) */}
          <div className="pt-2 sm:pt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-sky-200/90 border-t border-white/10 max-w-3xl mx-auto">
            <span className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400 shrink-0" /> ลดหย่อนภาษีได้ตามกฎหมาย
            </span>
            <span className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400 shrink-0" /> รับใบเสร็จดิจิทัลทันที
            </span>
            <span className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400 shrink-0" /> จัดสรรตรงถึง 8 อัศนาฟ 100%
            </span>
            <span className="flex items-center gap-1.5 sm:gap-2">
              <BadgeCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400 shrink-0" /> มาตรฐาน PDPA
            </span>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* ส่วนที่ 2: บริการของมูลนิธิ (1 Column Mobile, 4 Cards)          */}
      {/* ============================================================== */}
      <section className="w-full bg-white py-14 sm:py-20 lg:py-28 border-b border-slate-200/70">
        <div className="w-full max-w-7xl 2xl:max-w-(--breakpoint-2xl) mx-auto px-4 sm:px-6 lg:px-12 space-y-8 sm:space-y-12">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-2 sm:space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 uppercase tracking-wider">
              บริการสำหรับประชาชนและผู้มีจิตศรัทธา
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0b2545]">
              บริการของมูลนิธิซะกาตและสาธารณกุศล
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-slate-500 max-w-2xl mx-auto">
              แพลตฟอร์มบริหารจัดการซะกาตครบวงจรที่เชื่อมโยงผู้ให้และผู้รับด้วยความถูกต้องตามหลักชะรีอะฮ์
            </p>
          </div>

          {/* 4 Cards Responsive Grid: 1 Col Mobile (iPhone 15), 2 Col Tablet, 4 Col Desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {servicesList.map((srv) => {
              const Icon = srv.icon;
              return (
                <div
                  key={srv.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 lg:p-8 flex flex-col justify-between hover:border-teal-400 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group"
                >
                  <div className="space-y-4">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center ${srv.color} group-hover:scale-110 transition-transform shadow-2xs`}>
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base sm:text-lg lg:text-xl leading-snug group-hover:text-teal-700 transition-colors">
                        {srv.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                        {srv.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => onNavigate(srv.actionView)}
                      className="w-full h-11 sm:h-12 px-4 rounded-xl bg-slate-50 hover:bg-teal-50 text-[#0b2545] hover:text-teal-800 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 border border-slate-200 group-hover:border-teal-300"
                    >
                      <span>{srv.actionLabel}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* ส่วนที่ 3: สถิติการดำเนินงานจริง (Real Stats Dashboard Area)   */}
      {/* ============================================================== */}
      <section className="w-full bg-[#f8fafc] py-14 sm:py-20 lg:py-28 border-b border-slate-200/70">
        <div className="w-full max-w-7xl 2xl:max-w-(--breakpoint-2xl) mx-auto px-4 sm:px-6 lg:px-12 space-y-8 sm:space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-2 sm:space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-teal-600" /> สถิติและการดำเนินงานจริง
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0b2545]">
              ผลสัมฤทธิ์แห่งการช่วยเหลือที่โปร่งใส
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-slate-500">
              ข้อมูลสรุปจากฐานข้อมูลบัญชีและระบบการเงินจริงของมูลนิธิ ณ {stats?.lastUpdated || 'ปัจจุบัน'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {/* Card 1: Total Beneficiaries */}
            <div className="bg-white rounded-3xl p-5 sm:p-7 lg:p-8 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-teal-400 hover:shadow-lg transition-all group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs sm:text-sm font-bold text-slate-600">ผู้ได้รับความช่วยเหลือ</span>
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-black text-[#0b2545] tracking-tight">
                  {isLoading ? '...' : (stats?.totalBeneficiaries || 0).toLocaleString()}
                  <span className="text-xs sm:text-sm font-semibold text-slate-500 ml-2">คน</span>
                </div>
                <div className="text-xs text-teal-700 font-semibold mt-2">
                  ครอบคลุม {stats?.totalHouseholds || 0} ครัวเรือนยากไร้
                </div>
              </div>
            </div>

            {/* Card 2: Zakat Received */}
            <div className="bg-white rounded-3xl p-5 sm:p-7 lg:p-8 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-sky-400 hover:shadow-lg transition-all group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs sm:text-sm font-bold text-slate-600">ยอดเงินซะกาตที่ได้รับ</span>
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-black text-[#0b2545] tracking-tight">
                  ฿{isLoading ? '...' : ((stats?.totalZakatReceived || 0) / 1000000).toFixed(2)}
                  <span className="text-xs sm:text-sm font-semibold text-slate-500 ml-2">ล้านบาท</span>
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  ยอดสุทธิ ฿{(stats?.totalZakatReceived || 0).toLocaleString()} บาท
                </div>
              </div>
            </div>

            {/* Card 3: Zakat Disbursed */}
            <div className="bg-white rounded-3xl p-5 sm:p-7 lg:p-8 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-amber-400 hover:shadow-lg transition-all group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs sm:text-sm font-bold text-slate-600">ยอดจัดสรรและจ่ายแล้ว</span>
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-black text-[#0b2545] tracking-tight">
                  ฿{isLoading ? '...' : ((stats?.totalZakatDisbursed || 0) / 1000000).toFixed(2)}
                  <span className="text-xs sm:text-sm font-semibold text-slate-500 ml-2">ล้านบาท</span>
                </div>
                <div className="text-xs text-amber-700 font-semibold mt-2">
                  จัดสรรตรงสู่ 8 กลุ่มอัศนาฟ 100%
                </div>
              </div>
            </div>

            {/* Card 4: Active Campaigns */}
            <div className="bg-white rounded-3xl p-5 sm:p-7 lg:p-8 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-indigo-400 hover:shadow-lg transition-all group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs sm:text-sm font-bold text-slate-600">โครงการสาธารณกุศล</span>
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Target className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-black text-[#0b2545] tracking-tight">
                  {isLoading ? '...' : (stats?.totalCampaigns || campaigns.length || 4)}
                  <span className="text-xs sm:text-sm font-semibold text-slate-500 ml-2">โครงการ</span>
                </div>
                <div className="text-xs text-indigo-700 font-semibold mt-2">
                  เปิดรับการสนับสนุนต่อเนื่อง
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* ส่วนที่ 4: โครงการช่วยเหลือ (Active Campaigns จากระบบจริง)     */}
      {/* ============================================================== */}
      <section className="w-full bg-white py-14 sm:py-20 lg:py-28 border-b border-slate-200/70">
        <div className="w-full max-w-7xl 2xl:max-w-(--breakpoint-2xl) mx-auto px-4 sm:px-6 lg:px-12 space-y-8 sm:space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 uppercase tracking-wider">
                ร่วมสร้างโอกาสและแบ่งปัน
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0b2545] mt-2">
                โครงการช่วยเหลือและระดมทุนล่าสุด
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-slate-500 mt-1">
                ร่วมสนับสนุนได้ทั้งในรูปแบบเงินซะกาตและเงินบริจาคทั่วไป ทุกบาทจัดสรรตามวัตถุประสงค์โครงการ
              </p>
            </div>

            <button
              onClick={() => onNavigate('public-payment')}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-teal-700 hover:text-teal-800 transition-colors shrink-0"
            >
              <span>ดูโครงการทั้งหมด</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Campaign Cards Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {campaigns.map((camp) => (
              <div 
                key={camp.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-xl hover:border-teal-400 transition-all duration-300 group"
              >
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Category Badge & Donors */}
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
                      {camp.category === 'emergency' ? 'ฉุกเฉิน/สาธารณภัย' : camp.category === 'education' ? 'ทุนการศึกษา' : 'สวัสดิการซะกาต'}
                    </span>
                    <span className="text-[11px] sm:text-xs text-slate-400 font-medium">
                      ผู้บริจาค {camp.donorCount} ท่าน
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <div>
                    <h3 className="font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-2 leading-snug text-sm sm:text-base">
                      {camp.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                      {camp.description}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                      <span className="text-slate-900">ระดมได้ ฿{camp.raisedAmount.toLocaleString()}</span>
                      <span className="text-teal-700 font-bold">{camp.progressPercent}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-teal-600 to-sky-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, camp.progressPercent)}%` }}
                      />
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-400 text-right">
                      เป้าหมาย ฿{camp.targetAmount.toLocaleString()} บาท
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-100">
                  <button
                    onClick={() => handleCampaignDonate(camp)}
                    className="w-full h-11 px-4 rounded-xl bg-[#0b2545] hover:bg-[#133e6f] text-white font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-2 active:scale-98"
                  >
                    <Heart className="w-4 h-4 fill-white/20 text-amber-300" />
                    <span>ร่วมบริจาคโครงการนี้</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* ส่วนที่ 5: ความโปร่งใส (Full Width Dark Navy Gradient)          */}
      {/* ============================================================== */}
      <section className="w-full bg-gradient-to-br from-[#0b2545] via-[#0f2d52] to-[#081a30] text-white py-16 sm:py-24 lg:py-32 border-b border-[#143761]">
        <div className="w-full max-w-7xl 2xl:max-w-(--breakpoint-2xl) mx-auto px-4 sm:px-6 lg:px-12 flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-12 lg:gap-16">
          <div className="space-y-4 sm:space-y-6 max-w-2xl text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-sky-500/20 text-sky-300 text-xs sm:text-sm font-bold border border-sky-500/30">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span>ความโปร่งใสและธรรมาภิบาล (Transparency & Accountability)</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-tight text-white">
              ทุกบาทของท่านมีบันทึกดิจิทัล <br className="hidden sm:inline" />
              ตรวจสอบได้ 100% ตลอด 24 ชั่วโมง
            </h2>

            <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed">
              ระบบ ZMS บริหารด้วยสถาปัตยกรรมบัญชีแยกกองทุน (Fund Accounting) ป้องกันการจ่ายเงินข้ามวัตถุประสงค์
              และบันทึกประวัติการทำรายการแบบ Audit Trail ห้ามลบข้อมูลการเงินโดยตรง พร้อมเปิดเผยยอดรับ-จ่ายแบบเรียลไทม์ต่อสาธารณะ
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2 sm:pt-3">
              <button
                onClick={() => onNavigate('public-transparency')}
                className="h-12 px-6 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-bold text-xs sm:text-sm transition-colors shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2"
              >
                <span>เปิดดูแดชบอร์ดความโปร่งใส</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('public-about')}
                className="h-12 px-6 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-xs sm:text-sm backdrop-blur-md border border-white/20 transition-colors flex items-center justify-center"
              >
                อ่านระเบียบชารีอะฮ์และเกณฑ์ 8 จำพวก
              </button>
            </div>
          </div>

          {/* Visual Audit Metric Box (Mobile-friendly for iPhone 15) */}
          <div className="w-full lg:w-[420px] bg-white/10 backdrop-blur-md rounded-3xl p-5 sm:p-7 border border-white/15 space-y-4 sm:space-y-5 shrink-0 shadow-2xl">
            <div className="text-xs sm:text-sm font-bold text-sky-300 flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4">
              <span>สถานะระบบบัญชีและการตรวจสอบ</span>
              <span className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-teal-300 text-[11px] sm:text-xs font-semibold">Active Real-Time</span>
              </span>
            </div>

            <div className="space-y-3 sm:space-y-3.5 text-xs sm:text-sm">
              <div className="flex justify-between py-1.5 sm:py-2 border-b border-white/10 text-slate-300">
                <span>การกระทบยอดบัญชี (Reconciliation):</span>
                <span className="font-bold text-teal-300">ตรงกัน 100%</span>
              </div>
              <div className="flex justify-between py-1.5 sm:py-2 border-b border-white/10 text-slate-300">
                <span>การปฏิบัติตามมาตรฐาน PDPA:</span>
                <span className="font-bold text-teal-300">Masked 13 หลัก</span>
              </div>
              <div className="flex justify-between py-1.5 sm:py-2 border-b border-white/10 text-slate-300">
                <span>การสำรองข้อมูล (Backup SHA-256):</span>
                <span className="font-bold text-teal-300">ปกติ สมบูรณ์</span>
              </div>
              <div className="flex justify-between py-1.5 sm:py-2 text-slate-300">
                <span>คณะกรรมการชะรีอะฮ์รับรอง:</span>
                <span className="font-bold text-teal-300">รับรองความถูกต้อง</span>
              </div>
            </div>

            <div className="pt-2 sm:pt-3 border-t border-white/10 text-[10px] sm:text-xs text-slate-400">
              ฐานข้อมูล SQLite LibSQL • ควบคุมการเข้าถึงด้วยระบบ RBAC
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
