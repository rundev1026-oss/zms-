'use client';

import React from 'react';
import { 
  Building2, 
  HelpCircle, 
  ShieldCheck, 
  Heart, 
  Users, 
  Award, 
  Scale, 
  BookOpen, 
  CheckCircle2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface PublicAboutViewProps {
  onNavigate: (view: string) => void;
}

export function PublicAboutView({ onNavigate }: PublicAboutViewProps) {
  const asnafDetails = [
    {
      no: '1',
      title: 'ผู้ยากไร้ (Al-Fuqara / الفُقَرَاء)',
      desc: 'ผู้ไม่มีทรัพย์สินและไม่มีอาชีพหรือรายได้เพียงพอแม้เพียงกึ่งหนึ่งของความต้องการขั้นพื้นฐานในการดำรงชีพ เช่น ค่าอาหาร เสื้อผ้า ที่อยู่อาศัยที่ปลอดภัย และยารักษาโรคจำเป็น',
      priority: 'ลำดับความสำคัญสูงสุด'
    },
    {
      no: '2',
      title: 'ผู้ขัดสน (Al-Masakin / المَسَاكِين)',
      desc: 'ผู้มีงานทำหรือมีทรัพย์สินอยู่บ้าง แต่ไม่เพียงพอต่อค่าใช้จ่ายยังชีพที่จำเป็นสำหรับตนเองและผู้ที่อยู่ในอุปการะ เช่น มีรายได้แต่มีภาระเลี้ยงดูผู้ป่วยติดเตียงหรือเด็กเล็กหลายคน',
      priority: 'ช่วยเหลือยังชีพต่อเนื่อง'
    },
    {
      no: '3',
      title: 'ผู้มีหนี้สินล้นพ้นตัว (Al-Gharimin / الغَارِمِين)',
      desc: 'บุคคลที่ก่อหนี้สินเพื่อการยังชีพที่สุจริต เช่น ค่ารักษาพยาบาลฉุกเฉิน ค่าซ่อมแซมบ้านที่อยู่อาศัย หรือหนี้สินจากการไกล่เกลี่ยความขัดแย้ง โดยไม่รวมหนี้จากการพนัน การเก็งกำไร หรือสิ่งผิดกฎหมาย',
      priority: 'ปลดเปลื้องภาระหนี้'
    },
    {
      no: '4',
      title: 'เพื่อหนทางของอัลลอฮ์ (Fi Sabilillah / فِي سَبِيلِ الله)',
      desc: 'การสนับสนุนงานเผยแผ่ศาสนา ทุนการศึกษาแก่เยาวชนยากไร้ การผลิตสื่อคุณธรรม และการพัฒนาสาธารณประโยชน์ของชุมชนมุสลิมและสังคมโดยรวม',
      priority: 'พัฒนาการศึกษาและสังคม'
    },
    {
      no: '5',
      title: 'ผู้เดินทางตกยาก (Ibn Al-Sabil / اِبْن السَّبِيل)',
      desc: 'ผู้ที่เดินทางโดยชอบธรรมด้วยศาสนบัญญัติและกฎหมาย แต่ประสบเหตุฉุกเฉินทำให้ขาดแคลนปัจจัยหรือค่าพาหนะในการเดินทางกลับภูมิลำเนา',
      priority: 'สงเคราะห์การเดินทาง'
    },
    {
      no: '6',
      title: 'ผู้เข้ารับอิสลามใหม่ (Al-Muallafatu Qulubuhum / المُؤَلَّفَةِ قُلُوبُهُم)',
      desc: 'ผู้ที่เพิ่งเข้ารับอิสลามหรือผู้ที่ต้องการสร้างความสมานฉันท์และความอบอุ่นในหัวใจ เพื่อช่วยปรับตัวและสร้างความมั่นคงในวิถีชีวิตใหม่',
      priority: 'เสริมสร้างกำลังใจ'
    },
    {
      no: '7',
      title: 'เจ้าหน้าที่จัดการซะกาต (Al-Amilina Alayha / العَامِلِينَ عَلَيْهَا)',
      desc: 'เจ้าหน้าที่ผู้ทำหน้าที่สำรวจ ลงพื้นที่ ตรวจเอกสาร จัดเก็บ รักษา และกระจายเงินซะกาตให้ถึงมือผู้รับความช่วยเหลืออย่างเป็นธรรม',
      priority: 'ค่าดำเนินงานตามสัดส่วนที่อนุมัติ'
    },
    {
      no: '8',
      title: 'การปลดปล่อยทาสหรือภาระผูกพัน (Fi Al-Riqab / فِي الرِّقَاب)',
      desc: 'ในยุคปัจจุบันครอบคลุมถึงการช่วยเหลือผู้ถูกกักขังอย่างไม่เป็นธรรม หรือผู้ที่ตกเป็นเหยื่อของการค้ามนุษย์และการใช้แรงงานทาส',
      priority: 'สิทธิมนุษยชน'
    }
  ];

  return (
    <div className="space-y-12 animate-fadeIn pb-16">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>เกี่ยวกับมูลนิธิและหลักการบริหาร</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight">
            รู้จักมูลนิธิซะกาตและสาธารณกุศล
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            เจตนารมณ์ วิสัยทัศน์ พันธกิจ คณะกรรมการผู้ทรงคุณวุฒิ และเกณฑ์การพิจารณาผู้รับซะกาต 8 จำพวกตามหลักศาสนบัญญัติ
          </p>
        </div>

        <button
          onClick={() => onNavigate('public-payment')}
          className="px-5 py-3 rounded-2xl bg-emerald-700 text-white font-bold text-sm hover:bg-emerald-800 transition-colors shadow-sm shrink-0 flex items-center gap-2"
        >
          <Heart className="w-4 h-4 fill-white/20" />
          <span>ร่วมสนับสนุนมูลนิธิ</span>
        </button>
      </div>

      {/* Vision & Mission */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-emerald-900 text-white p-8 rounded-3xl shadow-lg border border-emerald-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold">วิสัยทัศน์ (Vision)</h2>
          <p className="text-emerald-100 text-sm leading-relaxed">
            "เป็นสถาบันบริหารจัดการซะกาตและสวัสดิการสังคมที่ได้รับความไว้วางใจสูงสุดในประเทศไทย 
            ขับเคลื่อนด้วยนวัตกรรมดิจิทัลที่โปร่งใส ยึดมั่นในหลักชารีอะฮ์ และเป็นพลังสำคัญในการสร้างสังคมที่ไร้ความยากจน"
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-700">
            <Scale className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">พันธกิจ (Mission)</h2>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>รวบรวมและจัดสรรเงินซะกาตให้ถึงมือผู้มีสิทธิ์รับ 8 จำพวกอย่างเป็นธรรมและทั่วถึง</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>ใช้ระบบบัญชีแยกกองทุน (Fund Accounting) เพื่อความโปร่งใสและตรวจสอบย้อนกลับได้ทุกขั้นตอน</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>ปกป้องศักดิ์ศรีความเป็นมนุษย์และความเป็นส่วนตัวของผู้รับความช่วยเหลือตามกฎหมาย PDPA</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>ส่งเสริมการพึ่งพาตนเองในระยะยาว ผ่านโครงการทุนการศึกษาและเครื่องมือประกอบอาชีพ</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 8 Asnaf Detailed Guide */}
      <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="max-w-2xl space-y-1">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
            คำอธิบายเชิงวิชาการ
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            เกณฑ์ 8 จำพวกผู้มีสิทธิ์รับซะกาต (The 8 Asnaf)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            อ้างอิงจากอัลกุรอาน ซูเราะฮ์ อัตเตาบะฮ์ อายะฮ์ที่ 60 และมติคณะกรรมการชะรีอะฮ์
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {asnafDetails.map((asnaf) => (
            <div 
              key={asnaf.no}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/20 transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center justify-center">
                  {asnaf.no}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {asnaf.priority}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                {asnaf.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {asnaf.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Shariah Board & Governance */}
      <div className="bg-slate-900 text-white p-8 sm:p-10 rounded-3xl shadow-xl space-y-6">
        <div className="max-w-2xl space-y-1">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            ธรรมาภิบาลและความโปร่งใส
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold">
            คณะกรรมการชะรีอะฮ์และการตรวจสอบภายใน
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            ทุกขั้นตอนตั้งแต่การรับเงิน การจัดสรร การลงพื้นที่ตรวจเยี่ยม และการจ่ายเงิน อยู่ภายใต้การกำกับดูแลของคณะผู้ทรงคุณวุฒิ
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-2">
            <div className="font-bold text-emerald-400 text-sm">คณะกรรมการชะรีอะฮ์</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              ผู้ทรงคุณวุฒิด้านนิติศาสตร์อิสลาม ทำหน้าที่กำหนดสูตรการคำนวณซะกาต นิศอบ และรับรองความถูกต้องของโครงการ
            </p>
          </div>

          <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-2">
            <div className="font-bold text-emerald-400 text-sm">คณะกรรมการพิจารณาคำร้อง</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              กลั่นกรองผลประเมินภาคสนาม ตรวจสอบหลักฐานความยากไร้ และอนุมัติวงเงินช่วยเหลือตามเกณฑ์การคัดเลือก
            </p>
          </div>

          <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-2">
            <div className="font-bold text-emerald-400 text-sm">ฝ่ายตรวจสอบบัญชีอิสระ</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              ตรวจสอบการไหลเวียนของเงินในทุกบัญชีกองทุน ยืนยันการไม่จ่ายข้ามกองทุน และจัดทำรายงานเปิดเผยต่อสาธารณะ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
