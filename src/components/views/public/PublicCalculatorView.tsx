'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Coins, 
  Briefcase, 
  Sprout, 
  Wheat, 
  HelpCircle, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  RotateCcw,
  Sparkles,
  Download,
  Printer,
  ShieldCheck,
  Info
} from 'lucide-react';
import { ZakatFormulaItem } from '@/services/publicPortalService';

interface PublicCalculatorViewProps {
  onNavigate: (view: string) => void;
  onSetCheckoutAmount?: (amount: number, category: string) => void;
}

export function PublicCalculatorView({ onNavigate, onSetCheckoutAmount }: PublicCalculatorViewProps) {
  const [activeCategory, setActiveCategory] = useState<'financial' | 'income' | 'business' | 'agri' | 'livestock' | 'gold'>('financial');
  const [formulas, setFormulas] = useState<ZakatFormulaItem[]>([]);
  const [goldPrice, setGoldPrice] = useState<number>(42500); // ฿/บาททองคำ
  const [isCalculated, setIsCalculated] = useState<boolean>(true);

  // Nisab standard: 85g pure gold (~5.61 Baht gold)
  const nisabGoldGrams = 85;
  const bahtToGrams = 15.2; // 1 บาททอง = 15.2 กรัม
  const nisabBahtWeight = nisabGoldGrams / bahtToGrams; // ~5.592 บาท
  const nisabThreshold = Math.round(nisabBahtWeight * goldPrice); // ~237,664 บาท

  // Form Inputs:
  // 1. Financial Assets
  const [cashOnHand, setCashOnHand] = useState<number>(100000);
  const [bankDeposits, setBankDeposits] = useState<number>(250000);
  const [investmentsStocks, setInvestmentsStocks] = useState<number>(50000);
  const [shortTermDebts, setShortTermDebts] = useState<number>(25000);
  const [haulComplete, setHaulComplete] = useState<boolean>(true);

  // 2. Income / Salary
  const [annualSalary, setAnnualSalary] = useState<number>(600000);
  const [otherIncome, setOtherIncome] = useState<number>(80000);
  const [livingExpenseDeduction, setLivingExpenseDeduction] = useState<number>(240000);
  const [annualDebtRepayment, setAnnualDebtRepayment] = useState<number>(60000);

  // 3. Business / Trade
  const [currentCash, setCurrentCash] = useState<number>(150000);
  const [inventoryValue, setInventoryValue] = useState<number>(500000);
  const [receivables, setReceivables] = useState<number>(100000);
  const [businessPayables, setBusinessPayables] = useState<number>(200000);

  // 4. Agri
  const [cropKilos, setCropKilos] = useState<number>(2500); // กก.
  const [cropPricePerKg, setCropPricePerKg] = useState<number>(15);
  const [irrigationSource, setIrrigationSource] = useState<'rain' | 'irrigated'>('irrigated');

  // 5. Livestock
  const [cattleCount, setCattleCount] = useState<number>(35);
  const [goatSheepCount, setGoatSheepCount] = useState<number>(45);

  // 6. Gold / Jewelry
  const [goldWeightBaht, setGoldWeightBaht] = useState<number>(8);
  const [isWornJewelry, setIsWornJewelry] = useState<boolean>(false); // เครื่องประดับที่ใช้ประจำวันตามจารีต

  useEffect(() => {
    async function loadFormulas() {
      try {
        const res = await fetch('/api/public/formulas');
        if (res.ok) {
          const json = await res.json();
          if (json.success) setFormulas(json.data);
        }
      } catch (err) {
        console.error('Failed to load formulas:', err);
      }
    }
    loadFormulas();
  }, []);

  // Calculation Logic per category:
  let grossAmount = 0;
  let deductions = 0;
  let netAmount = 0;
  let zakatRatePercent = 2.5;
  let zakatDue = 0;
  let isEligible = false;
  let categoryTitle = 'ซะกาตทรัพย์สินทางการเงิน';
  let calculationExplanation = '';
  let nisabBenchmark = nisabThreshold;

  if (activeCategory === 'financial') {
    grossAmount = cashOnHand + bankDeposits + investmentsStocks;
    deductions = shortTermDebts;
    netAmount = Math.max(0, grossAmount - deductions);
    isEligible = netAmount >= nisabThreshold && haulComplete;
    zakatDue = isEligible ? Math.round(netAmount * 0.025) : 0;
    categoryTitle = 'ซะกาตทรัพย์สินทางการเงินและเงินออม';
    calculationExplanation = `ทรัพย์สินสุทธิ (฿${netAmount.toLocaleString()}) ${
      netAmount >= nisabThreshold ? 'ถึงเกณฑ์นิศอบ' : 'ยังไม่ถึงเกณฑ์นิศอบ'
    } และ ${haulComplete ? 'ครบรอบปีฮาวล์ 1 ปีแล้ว' : 'ยังไม่ครบรอบปีฮาวล์'} คำนวณอัตรา 2.5%`;
  } else if (activeCategory === 'income') {
    grossAmount = annualSalary + otherIncome;
    deductions = livingExpenseDeduction + annualDebtRepayment;
    netAmount = Math.max(0, grossAmount - deductions);
    isEligible = netAmount >= nisabThreshold;
    zakatDue = isEligible ? Math.round(netAmount * 0.025) : 0;
    categoryTitle = 'ซะกาตรายได้และเงินเดือนสะสม';
    calculationExplanation = `รายได้สุทธิหลังหักค่าใช้จ่ายส่วนตัวและหนี้จำเป็น (฿${netAmount.toLocaleString()}) ${
      isEligible ? 'เกินเกณฑ์นิศอบทองคำ' : 'ต่ำกว่าเกณฑ์นิศอบ'
    } คำนวณอัตรา 2.5%`;
  } else if (activeCategory === 'business') {
    grossAmount = currentCash + inventoryValue + receivables;
    deductions = businessPayables;
    netAmount = Math.max(0, grossAmount - deductions);
    isEligible = netAmount >= nisabThreshold && haulComplete;
    zakatDue = isEligible ? Math.round(netAmount * 0.025) : 0;
    categoryTitle = 'ซะกาตธุรกิจการค้าและสินค้าคงเหลือ';
    calculationExplanation = `มูลค่าธุรกิจหมุนเวียนสุทธิ (฿${netAmount.toLocaleString()}) ${
      isEligible ? 'ถึงเกณฑ์นิศอบและครบรอบฮาวล์' : 'ยังไม่เข้าเกณฑ์'
    } คำนวณอัตรา 2.5%`;
  } else if (activeCategory === 'agri') {
    grossAmount = cropKilos * cropPricePerKg;
    deductions = 0;
    netAmount = grossAmount;
    const agriNisabKg = 653; // 5 Wasq
    nisabBenchmark = agriNisabKg * cropPricePerKg;
    isEligible = cropKilos >= agriNisabKg;
    zakatRatePercent = irrigationSource === 'rain' ? 10.0 : 5.0;
    zakatDue = isEligible ? Math.round(netAmount * (zakatRatePercent / 100)) : 0;
    categoryTitle = 'ซะกาตผลผลิตการเกษตร';
    calculationExplanation = `ผลผลิต ${cropKilos.toLocaleString()} กก. ${
      isEligible ? 'เกินเกณฑ์นิศอบ 5 วะสัก (653 กก.)' : 'ยังไม่ถึง 653 กก.'
    } ใช้อัตรา ${zakatRatePercent}% (${irrigationSource === 'rain' ? 'น้ำฝนธรรมชาติ 10%' : 'มีต้นทุนชลประทาน 5%'})`;
  } else if (activeCategory === 'gold') {
    const goldValue = goldWeightBaht * goldPrice;
    grossAmount = goldValue;
    deductions = isWornJewelry ? goldValue : 0; // Exclude customary jewelry
    netAmount = Math.max(0, grossAmount - deductions);
    isEligible = netAmount >= nisabThreshold && haulComplete;
    zakatDue = isEligible ? Math.round(netAmount * 0.025) : 0;
    categoryTitle = 'ซะกาตทองคำและเครื่องประดับสะสม';
    calculationExplanation = isWornJewelry 
      ? 'ทองคำที่สวมใส่ตามธรรมเนียมสตรีได้รับการยกเว้นซะกาตตามทัศนะส่วนใหญ่' 
      : `ทองคำสะสม/แท่งมูลค่า ฿${netAmount.toLocaleString()} ${isEligible ? 'ถึงเกณฑ์นิศอบ 85 กรัม' : 'ยังไม่ถึงเกณฑ์'} คิด 2.5%`;
  } else if (activeCategory === 'livestock') {
    grossAmount = (cattleCount * 25000) + (goatSheepCount * 5000);
    netAmount = grossAmount;
    isEligible = cattleCount >= 30 || goatSheepCount >= 40;
    categoryTitle = 'ซะกาตปศุสัตว์ (วัว/แพะ/แกะ)';
    let cattleDueText = 'ไม่ถึงนิศอบวัว (30 ตัว)';
    if (cattleCount >= 40) cattleDueText = 'วัวอายุ 2 ปีขึ้นไป (มุซินนะฮ์) 1 ตัว';
    else if (cattleCount >= 30) cattleDueText = 'ลูกวัวอายุ 1 ปี (ตะบีอ์) 1 ตัว';

    let goatDueText = 'ไม่ถึงนิศอบแพะ (40 ตัว)';
    if (goatSheepCount >= 40) goatDueText = 'แพะหรือแกะ 1 ตัว';

    calculationExplanation = `วัว ${cattleCount} ตัว: ${cattleDueText} | แพะ/แกะ ${goatSheepCount} ตัว: ${goatDueText}`;
    // Approximate monetary equivalent for payment convenience
    let monetaryEstimate = 0;
    if (cattleCount >= 40) monetaryEstimate += 22000;
    else if (cattleCount >= 30) monetaryEstimate += 15000;
    if (goatSheepCount >= 40) monetaryEstimate += 4500;
    zakatDue = monetaryEstimate;
  }

  const handleProceedToPayment = () => {
    if (onSetCheckoutAmount) {
      onSetCheckoutAmount(zakatDue, categoryTitle);
    }
    onNavigate('public-payment');
  };

  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* 1. Header & Live Nisab Benchmark */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-1 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <Calculator className="w-3.5 h-3.5" />
            <span>มาตรฐานคำนวณตามหลักชารีอะฮ์ เวอร์ชัน 2569.1</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
            เครื่องคำนวณซะกาตออนไลน์ (Zakat Calculator)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            ระบบคำนวณอัตโนมัติแยกตามประเภททรัพย์สิน ตรวจสอบเกณฑ์นิศอบ (Nisab) และระยะเวลาครบปีฮาวล์ (Hawl) อย่างแม่นยำ
          </p>
        </div>

        {/* Live Gold Benchmark Box */}
        <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
            <Coins className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-0.5">
            <div className="font-bold text-amber-950">
              เกณฑ์นิศอบทองคำ 85 กรัม: ฿{nisabThreshold.toLocaleString()} บาท
            </div>
            <div className="text-[11px] text-amber-800">
              ราคาทองคำแท่งอ้างอิง: ฿{goldPrice.toLocaleString()}/บาท (5.61 บาททอง)
            </div>
          </div>
        </div>
      </div>

      {/* 2. Step 1: Select Category Tabs */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          ขั้นตอนที่ 1: เลือกประเภททรัพย์สินที่ต้องการคำนวณ
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            { id: 'financial', label: '1. เงินฝาก/ออม', icon: Coins },
            { id: 'income', label: '2. เงินเดือน/รายได้', icon: Briefcase },
            { id: 'business', label: '3. ธุรกิจ/การค้า', icon: Calculator },
            { id: 'gold', label: '4. ทองคำ/ของสะสม', icon: Sparkles },
            { id: 'agri', label: '5. พืชผลการเกษตร', icon: Wheat },
            { id: 'livestock', label: '6. ปศุสัตว์', icon: Sprout },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as any)}
                className={`p-3.5 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-2 border text-center ${
                  isActive
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-md shadow-emerald-900/15 scale-102'
                    : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-300' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Form (Step 2 & 3) vs Result Card (Step 4 & 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Input Form (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">
                2
              </span>
              <span>กรอกข้อมูลทรัพย์สินและรายการหัก ({categoryTitle})</span>
            </h2>
            <button
              onClick={() => {
                setCashOnHand(0);
                setBankDeposits(0);
                setInvestmentsStocks(0);
                setShortTermDebts(0);
              }}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> ล้างค่า
            </button>
          </div>

          {/* Form Fields according to category */}
          {activeCategory === 'financial' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เงินสดในมือและเงินสำรอง (บาท)
                </label>
                <input
                  type="number"
                  value={cashOnHand || ''}
                  onChange={(e) => setCashOnHand(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เงินฝากในบัญชีธนาคารทุกบัญชี (บาท)
                </label>
                <input
                  type="number"
                  value={bankDeposits || ''}
                  onChange={(e) => setBankDeposits(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  หุ้น กองทุนรวม หรือสินทรัพย์การเงินที่สามารถเปลี่ยนเป็นเงินสดได้ (บาท)
                </label>
                <input
                  type="number"
                  value={investmentsStocks || ''}
                  onChange={(e) => setInvestmentsStocks(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block font-semibold text-rose-800 mb-1">
                  หัก: หนี้สินระยะสั้นที่ถึงกำหนดชำระในปีนี้ (บาท)
                </label>
                <input
                  type="number"
                  value={shortTermDebts || ''}
                  onChange={(e) => setShortTermDebts(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-rose-50/50 border border-rose-200 rounded-xl font-bold text-rose-950 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                  placeholder="0"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={haulComplete}
                    onChange={(e) => setHaulComplete(e.target.checked)}
                    className="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-500"
                  />
                  <span className="text-emerald-950 font-medium">
                    ทรัพย์สินนี้อยู่ในความครอบครองครบรอบ 1 ปีจันทรคติแล้ว (ครบรอบฮาวล์ - Hawl)
                  </span>
                </label>
              </div>
            </div>
          )}

          {activeCategory === 'income' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  รายได้ประจำจากเงินเดือนตลอดทั้งปี (บาท)
                </label>
                <input
                  type="number"
                  value={annualSalary || ''}
                  onChange={(e) => setAnnualSalary(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  โบนัส เบี้ยเลี้ยง ค่าคอมมิชชัน หรือรายได้เสริมอื่นทั้งปี (บาท)
                </label>
                <input
                  type="number"
                  value={otherIncome || ''}
                  onChange={(e) => setOtherIncome(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-rose-800 mb-1">
                  หัก: ค่าใช้จ่ายส่วนตัวและค่าเลี้ยงดูครอบครัวตามเกณฑ์จำเป็นทั้งปี (บาท)
                </label>
                <input
                  type="number"
                  value={livingExpenseDeduction || ''}
                  onChange={(e) => setLivingExpenseDeduction(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-rose-50/50 border border-rose-200 rounded-xl font-bold text-rose-950 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-rose-800 mb-1">
                  หัก: ยอดผ่อนชำระหนี้สินจำเป็นในปีนี้ (บาท)
                </label>
                <input
                  type="number"
                  value={annualDebtRepayment || ''}
                  onChange={(e) => setAnnualDebtRepayment(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-rose-50/50 border border-rose-200 rounded-xl font-bold text-rose-950 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>
          )}

          {activeCategory === 'business' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เงินสดในกิจการและเงินฝากบัญชีธุรกิจ (บาท)
                </label>
                <input
                  type="number"
                  value={currentCash || ''}
                  onChange={(e) => setCurrentCash(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  มูลค่าสินค้าคงเหลือ (สต็อกสินค้าเพื่อขายตามราคาตลาด) (บาท)
                </label>
                <input
                  type="number"
                  value={inventoryValue || ''}
                  onChange={(e) => setInventoryValue(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ลูกหนี้การค้าที่คาดว่าจะเรียกเก็บได้แน่นอน (บาท)
                </label>
                <input
                  type="number"
                  value={receivables || ''}
                  onChange={(e) => setReceivables(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-rose-800 mb-1">
                  หัก: เจ้าหนี้การค้าและหนี้สินธุรกิจที่ต้องจ่ายในปีนี้ (บาท)
                </label>
                <input
                  type="number"
                  value={businessPayables || ''}
                  onChange={(e) => setBusinessPayables(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-rose-50/50 border border-rose-200 rounded-xl font-bold text-rose-950 outline-none"
                />
              </div>
            </div>
          )}

          {activeCategory === 'gold' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  น้ำหนักทองคำแท่งหรือทองคำรูปพรรณเพื่อการสะสม (บาททอง)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={goldWeightBaht || ''}
                  onChange={(e) => setGoldWeightBaht(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  1 บาททองคำ = 15.2 กรัม (นิศอบ 85 กรัม = ประมาณ 5.61 บาททองคำ)
                </span>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isWornJewelry}
                    onChange={(e) => setIsWornJewelry(e.target.checked)}
                    className="w-4 h-4 text-emerald-700 rounded"
                  />
                  <span className="text-slate-800 font-medium">
                    เป็นเครื่องประดับสตรีที่สวมใส่ตามปกติในชีวิตประจำวัน (ยกเว้นซะกาตตามทัศนะส่วนใหญ่)
                  </span>
                </label>
              </div>
            </div>
          )}

          {activeCategory === 'agri' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ปริมาณผลผลิตที่เก็บเกี่ยวได้ (กิโลกรัม)
                </label>
                <input
                  type="number"
                  value={cropKilos || ''}
                  onChange={(e) => setCropKilos(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  เกณฑ์นิศอบผลผลิต: 5 วะสัก (Wasq) = 653 กิโลกรัม
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ราคาผลผลิตเฉลี่ยต่อกิโลกรัม (บาท)
                </label>
                <input
                  type="number"
                  value={cropPricePerKg || ''}
                  onChange={(e) => setCropPricePerKg(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  แหล่งน้ำและระบบชลประทาน
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIrrigationSource('rain')}
                    className={`p-3 rounded-xl border text-xs font-semibold text-left ${
                      irrigationSource === 'rain'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <div>น้ำฝนธรรมชาติ (10%)</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">ไม่มีต้นทุนการสูบน้ำ</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIrrigationSource('irrigated')}
                    className={`p-3 rounded-xl border text-xs font-semibold text-left ${
                      irrigationSource === 'irrigated'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <div>มีระบบชลประทาน (5%)</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">มีค่าสูบน้ำหรือค่าแรงชลประทาน</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'livestock' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  จำนวนวัวหรือควายที่เลี้ยงในทุ่งหญ้าธรรมชาติ (ตัว)
                </label>
                <input
                  type="number"
                  value={cattleCount || ''}
                  onChange={(e) => setCattleCount(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  นิศอบวัว: 30 ตัว จ่ายลูกวัว 1 ปี (ตะบีอ์) | 40 ตัว จ่ายวัว 2 ปี (มุซินนะฮ์)
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  จำนวนแพะหรือแกะ (ตัว)
                </label>
                <input
                  type="number"
                  value={goatSheepCount || ''}
                  onChange={(e) => setGoatSheepCount(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  นิศอบแพะ/แกะ: 40 - 120 ตัว จ่ายแพะหรือแกะ 1 ตัว
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Step 4 Calculation Breakdown & Step 5 Next Action (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-slate-800 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  ขั้นตอนที่ 3 & 4
                </span>
                <h3 className="text-lg font-bold text-white">
                  ผลการประเมินซะกาต
                </h3>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                isEligible ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
              }`}>
                {isEligible ? 'เข้าเกณฑ์ต้องจ่าย' : 'ยังไม่ถึงเกณฑ์'}
              </span>
            </div>

            {/* Breakdown Items */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80 text-slate-300">
                <span>มูลค่าทรัพย์สินรวมที่พิจารณา:</span>
                <span className="font-semibold text-white">฿{grossAmount.toLocaleString()} บาท</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/80 text-slate-300">
                <span>รายการหักที่ได้รับอนุญาต:</span>
                <span className="font-semibold text-rose-400">-฿{deductions.toLocaleString()} บาท</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/80 text-slate-300">
                <span>มูลค่าสุทธิที่นำมาเทียบเกณฑ์:</span>
                <span className="font-bold text-emerald-300">฿{netAmount.toLocaleString()} บาท</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/80 text-slate-300">
                <span>เกณฑ์นิศอบ (Nisab Benchmark):</span>
                <span className="font-medium text-amber-300">฿{nisabBenchmark.toLocaleString()} บาท</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/80 text-slate-300">
                <span>อัตราการจ่าย (Zakat Rate):</span>
                <span className="font-semibold text-white">{zakatRatePercent}%</span>
              </div>
            </div>

            {/* Total Zakat Due Display */}
            <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-950 to-teal-950 border border-emerald-800/80 text-center space-y-1">
              <div className="text-xs text-emerald-300 font-semibold">
                จำนวนเงินซะกาตที่ต้องจ่าย (Zakat Due)
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                ฿{zakatDue.toLocaleString()}
                <span className="text-xs font-normal text-emerald-200 ml-1.5">บาท</span>
              </div>
              <div className="text-[11px] text-emerald-200/80 pt-1">
                {isEligible ? 'พร้อมดำเนินการจัดสรรสู่ 8 อัศนาฟ' : 'ขอพระองค์อัลลอฮ์ทรงเพิ่มพูนริสกีและความบารอกัต'}
              </div>
            </div>

            {/* Explanation text */}
            <div className="p-3 bg-slate-800/70 rounded-xl text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{calculationExplanation}</span>
            </div>

            {/* Step 5: Next Action CTA Buttons */}
            <div className="space-y-2 pt-2">
              {isEligible && zakatDue > 0 ? (
                <button
                  onClick={handleProceedToPayment}
                  className="w-full py-3.5 px-4 rounded-xl bg-amber-400 text-slate-950 font-bold text-sm shadow-md hover:bg-amber-300 transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>เริ่มชำระซะกาตยอดนี้ทันที (฿{zakatDue.toLocaleString()})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('public-payment')}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                >
                  <span>ร่วมบริจาคศอดะเกาะฮ์ทั่วไปตามสมัครใจ</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintSummary}
                  className="flex-1 py-2 px-3 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์สรุปผล</span>
                </button>
                <button
                  onClick={handlePrintSummary}
                  className="flex-1 py-2 px-3 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลดสรุป</span>
                </button>
              </div>
            </div>
          </div>

          {/* Shariah Board Certification Note */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 text-xs text-slate-500 space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>การรับรองความถูกต้อง</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              สูตรการคำนวณทั้งหมดได้รับการตรวจทานและรับรองโดยคณะกรรมการชะรีอะฮ์มูลนิธิฯ 
              อ้างอิงราคาทองคำแท่งมาตรฐานสมาคมค้าทองคำ และอัตราตามแนวทางมัซฮับที่เป็นที่ยอมรับ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
