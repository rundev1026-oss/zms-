'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { MOCK_NISAB_CONFIG } from '@/data/mockData';
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
  Sparkles
} from 'lucide-react';

interface ZakatCalculatorViewProps {
  onNavigate: (view: string) => void;
  onSetCheckoutAmount?: (amount: number, category: string) => void;
}

export function ZakatCalculatorView({ onNavigate, onSetCheckoutAmount }: ZakatCalculatorViewProps) {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'financial' | 'income' | 'business' | 'agri' | 'livestock'>('financial');

  // 1. Financial Assets Zakat
  const [cash, setCash] = useState<number>(150000);
  const [bankSavings, setBankSavings] = useState<number>(200000);
  const [goldBahtWeight, setGoldBahtWeight] = useState<number>(3); // 3 บาททอง
  const [sharesInvestments, setSharesInvestments] = useState<number>(50000);
  const [shortTermDebts, setShortTermDebts] = useState<number>(20000);
  const [isHawlComplete, setIsHawlComplete] = useState<boolean>(true);

  // 2. Income Zakat
  const [annualSalary, setAnnualSalary] = useState<number>(600000);
  const [bonusOtherIncome, setBonusOtherIncome] = useState<number>(80000);
  const [personalDeductions, setPersonalDeductions] = useState<number>(240000);
  const [annualDebtPayments, setAnnualDebtPayments] = useState<number>(60000);

  // 3. Business Zakat
  const [currentAssets, setCurrentAssets] = useState<number>(850000);
  const [inventoryValue, setInventoryValue] = useState<number>(450000);
  const [businessCash, setBusinessCash] = useState<number>(120000);
  const [businessDebts, setBusinessDebts] = useState<number>(220000);

  // 4. Agriculture Zakat
  const [cropKilos, setCropKilos] = useState<number>(2500); // กิโลกรัม
  const [cropPricePerKg, setCropPricePerKg] = useState<number>(14); // บาทต่อกิโลกรัม
  const [irrigationType, setIrrigationType] = useState<'rain' | 'irrigated'>('irrigated'); // 10% vs 5%

  // 5. Livestock Zakat
  const [cattleCount, setCattleCount] = useState<number>(35); // วัว
  const [goatCount, setGoatCount] = useState<number>(45); // แพะ/แกะ

  // Calculations
  const goldValue = goldBahtWeight * MOCK_NISAB_CONFIG.goldPricePerBaht;
  const nisabValue = MOCK_NISAB_CONFIG.nisabValueThb; // 237,575 บาท

  // 1. Financial Calc
  const totalFinancialAssets = cash + bankSavings + goldValue + sharesInvestments;
  const netFinancialWealth = Math.max(0, totalFinancialAssets - shortTermDebts);
  const isFinancialEligible = netFinancialWealth >= nisabValue && isHawlComplete;
  const financialZakatDue = isFinancialEligible ? Math.round(netFinancialWealth * 0.025) : 0;

  // 2. Income Calc
  const totalIncomeAnnual = annualSalary + bonusOtherIncome;
  const netIncomeWealth = Math.max(0, totalIncomeAnnual - personalDeductions - annualDebtPayments);
  const isIncomeEligible = netIncomeWealth >= nisabValue;
  const incomeZakatDue = isIncomeEligible ? Math.round(netIncomeWealth * 0.025) : 0;

  // 3. Business Calc
  const totalBusinessWealth = currentAssets + inventoryValue + businessCash;
  const netBusinessWealth = Math.max(0, totalBusinessWealth - businessDebts);
  const isBusinessEligible = netBusinessWealth >= nisabValue;
  const businessZakatDue = isBusinessEligible ? Math.round(netBusinessWealth * 0.025) : 0;

  // 4. Agri Calc
  const totalAgriValue = cropKilos * cropPricePerKg;
  const isAgriEligible = cropKilos >= 653; // 5 Wasq
  const agriRate = irrigationType === 'rain' ? 0.10 : 0.05;
  const agriZakatDue = isAgriEligible ? Math.round(totalAgriValue * agriRate) : 0;

  // Current Active Calculations
  let currentGross = totalFinancialAssets;
  let currentDeduction = shortTermDebts;
  let currentNet = netFinancialWealth;
  let currentDue = financialZakatDue;
  let currentCategoryTitle = 'ซะกาตทรัพย์สินทางการเงิน';
  let isEligible = isFinancialEligible;

  if (activeTab === 'income') {
    currentGross = totalIncomeAnnual;
    currentDeduction = personalDeductions + annualDebtPayments;
    currentNet = netIncomeWealth;
    currentDue = incomeZakatDue;
    currentCategoryTitle = 'ซะกาตรายได้และเงินเดือน';
    isEligible = isIncomeEligible;
  } else if (activeTab === 'business') {
    currentGross = totalBusinessWealth;
    currentDeduction = businessDebts;
    currentNet = netBusinessWealth;
    currentDue = businessZakatDue;
    currentCategoryTitle = 'ซะกาตธุรกิจการค้า';
    isEligible = isBusinessEligible;
  } else if (activeTab === 'agri') {
    currentGross = totalAgriValue;
    currentDeduction = 0;
    currentNet = totalAgriValue;
    currentDue = agriZakatDue;
    currentCategoryTitle = 'ซะกาตผลผลิตเกษตรกรรม';
    isEligible = isAgriEligible;
  }

  const handleProceedToPayment = () => {
    if (onSetCheckoutAmount) {
      onSetCheckoutAmount(currentDue, currentCategoryTitle);
    }
    onNavigate('payment');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-700" />
              เครื่องคำนวณซะกาตตามหลักศาสนบัญญัติ (Zakat Calculator)
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              อิงราคาทองคำจริง
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            คำนวณซะกาต 5 หมวดหมู่อย่างแม่นยำ พร้อมตรวจสอบนิศอบ (Nisab) และระยะเวลาครบรอบปีฮาวล์ (Hawl)
          </p>
        </div>

        {/* Nisab Benchmark Badge */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
          <Coins className="w-4 h-4 text-amber-700 shrink-0" />
          <div>
            <div className="font-bold">นิศอบทองคำ 85 กรัม: ฿{nisabValue.toLocaleString()} บาท</div>
            <div className="text-[10px] text-amber-700">ทองคำ ฿{MOCK_NISAB_CONFIG.goldPricePerBaht.toLocaleString()}/บาท (ณ {MOCK_NISAB_CONFIG.lastUpdated})</div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { id: 'financial', label: '1. ทรัพย์สิน/เงินฝาก', icon: Coins },
          { id: 'income', label: '2. รายได้/เงินเดือน', icon: Briefcase },
          { id: 'business', label: '3. ธุรกิจและการค้า', icon: Calculator },
          { id: 'agri', label: '4. เกษตรกรรม/ข้าว', icon: Wheat },
          { id: 'livestock', label: '5. ปศุสัตว์ (วัว/แพะ)', icon: Sprout },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                isActive
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-center">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Calculator Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Input Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          {/* TAB 1: Financial Wealth */}
          {activeTab === 'financial' && (
            <div className="space-y-4 animate-fadeIn text-xs">
              <h2 className="text-sm font-bold text-slate-900 border-b pb-2">
                คำนวณซะกาตเงินสด เงินฝาก และทรัพย์สินทางการเงิน
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เงินสดในครอบครอง (บาท)
                  </label>
                  <input
                    type="number"
                    value={cash}
                    onChange={(e) => setCash(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เงินฝากธนาคารทุกบัญชี (บาท)
                  </label>
                  <input
                    type="number"
                    value={bankSavings}
                    onChange={(e) => setBankSavings(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ทองคำแท่ง/รูปพรรณส่วนเกิน (น้ำหนัก: บาททองคำ)
                  </label>
                  <input
                    type="number"
                    value={goldBahtWeight}
                    onChange={(e) => setGoldBahtWeight(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    มูลค่าประเมิน: ฿{goldValue.toLocaleString()} บาท
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    หุ้น กองทุน และสินทรัพย์การเงินอื่นๆ (บาท)
                  </label>
                  <input
                    type="number"
                    value={sharesInvestments}
                    onChange={(e) => setSharesInvestments(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    รายการหัก: หนี้สินระยะสั้นที่ถึงกำหนดชำระในรอบปี (บาท)
                  </label>
                  <input
                    type="number"
                    value={shortTermDebts}
                    onChange={(e) => setShortTermDebts(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">ครบรอบ 1 ปีจันทรคติ (ฮาวล์ / Hawl)</div>
                    <div className="text-[11px] text-slate-500">ถือครองทรัพย์สินนี้ต่อเนื่องครบ 1 ปีบริบูรณ์</div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHawlComplete}
                      onChange={(e) => setIsHawlComplete(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="font-semibold text-slate-700">ครบรอบปีแล้ว</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Income Zakat */}
          {activeTab === 'income' && (
            <div className="space-y-4 animate-fadeIn text-xs">
              <h2 className="text-sm font-bold text-slate-900 border-b pb-2">
                คำนวณซะกาตรายได้ เงินเดือน และวิชาชีพ
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เงินเดือนรวมทั้งปี (12 เดือน)
                  </label>
                  <input
                    type="number"
                    value={annualSalary}
                    onChange={(e) => setAnnualSalary(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    โบนัส เงินพิเศษ และรายได้เสริมทั้งปี
                  </label>
                  <input
                    type="number"
                    value={bonusOtherIncome}
                    onChange={(e) => setBonusOtherIncome(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    หัก: ค่าใช้จ่ายจำเป็นส่วนบุคคลและครอบครัวต่อปี
                  </label>
                  <input
                    type="number"
                    value={personalDeductions}
                    onChange={(e) => setPersonalDeductions(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    หัก: ภาระหนี้สินผ่อนชำระจำเป็นในรอบปี
                  </label>
                  <input
                    type="number"
                    value={annualDebtPayments}
                    onChange={(e) => setAnnualDebtPayments(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Business Zakat */}
          {activeTab === 'business' && (
            <div className="space-y-4 animate-fadeIn text-xs">
              <h2 className="text-sm font-bold text-slate-900 border-b pb-2">
                คำนวณซะกาตธุรกิจการค้าและสินค้าคงคลัง
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    สินค้าคงเหลือ (คิดตามราคาต้นทุน)
                  </label>
                  <input
                    type="number"
                    value={inventoryValue}
                    onChange={(e) => setInventoryValue(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ลูกหนี้การค้าที่คาดว่าจะได้รับเงิน
                  </label>
                  <input
                    type="number"
                    value={currentAssets}
                    onChange={(e) => setCurrentAssets(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เงินสดและเงินฝากในบัญชีธุรกิจ
                  </label>
                  <input
                    type="number"
                    value={businessCash}
                    onChange={(e) => setBusinessCash(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    หัก: เจ้าหนี้การค้าและหนี้สินระยะสั้น
                  </label>
                  <input
                    type="number"
                    value={businessDebts}
                    onChange={(e) => setBusinessDebts(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Agriculture Zakat */}
          {activeTab === 'agri' && (
            <div className="space-y-4 animate-fadeIn text-xs">
              <h2 className="text-sm font-bold text-slate-900 border-b pb-2">
                คำนวณซะกาตผลผลิตเกษตรกรรม (จ่ายทันทีในวันเก็บเกี่ยว ไม่ต้องรอครบปี)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ปริมาณผลผลิตที่เก็บเกี่ยวได้ (กิโลกรัม)
                  </label>
                  <input
                    type="number"
                    value={cropKilos}
                    onChange={(e) => setCropKilos(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    นิศอบพืชผล: 5 วะสัก (ประมาณ 653 กิโลกรัม)
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ราคาตลาดประเมิน (บาท/กิโลกรัม)
                  </label>
                  <input
                    type="number"
                    value={cropPricePerKg}
                    onChange={(e) => setCropPricePerKg(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    ระบบการรดน้ำและการให้น้ำ
                  </label>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer ${
                      irrigationType === 'irrigated' ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="irrigation"
                        checked={irrigationType === 'irrigated'}
                        onChange={() => setIrrigationType('irrigated')}
                      />
                      <div>
                        <div className="font-bold text-slate-800">มีต้นทุนการรดน้ำ (จ่าย 5%)</div>
                        <div className="text-[10px] text-slate-500">ใช้เครื่องสูบน้ำหรือระบบชลประทาน</div>
                      </div>
                    </label>

                    <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer ${
                      irrigationType === 'rain' ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="irrigation"
                        checked={irrigationType === 'rain'}
                        onChange={() => setIrrigationType('rain')}
                      />
                      <div>
                        <div className="font-bold text-slate-800">น้ำฝนธรรมชาติ (จ่าย 10%)</div>
                        <div className="text-[10px] text-slate-500">ไม่มีต้นทุนการสูบน้ำ</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Livestock Zakat */}
          {activeTab === 'livestock' && (
            <div className="space-y-4 animate-fadeIn text-xs">
              <h2 className="text-sm font-bold text-slate-900 border-b pb-2">
                คำนวณซะกาตปศุสัตว์ (วัว และ แพะ/แกะ)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="font-bold text-slate-800 block">
                    จำนวนวัวที่เลี้ยง (ตัว)
                  </label>
                  <input
                    type="number"
                    value={cattleCount}
                    onChange={(e) => setCattleCount(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                  <div className="text-[11px] text-slate-600">
                    เกณฑ์นิศอบ: ทุกๆ 30 ตัว ต้องจ่ายลูกวัวอายุ 1 ปี 1 ตัว / ทุก 40 ตัว จ่ายลูกวัว 2 ปี 1 ตัว
                  </div>
                  <div className="pt-2 font-bold text-emerald-800">
                    {cattleCount >= 30 ? `ซะกาตที่ต้องจ่าย: ลูกวัวอายุ 1 ปี ${Math.floor(cattleCount / 30)} ตัว` : 'ยังไม่ถึงเกณฑ์นิศอบ (ขั้นต่ำ 30 ตัว)'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="font-bold text-slate-800 block">
                    จำนวนแพะ / แกะ ที่เลี้ยง (ตัว)
                  </label>
                  <input
                    type="number"
                    value={goatCount}
                    onChange={(e) => setGoatCount(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                  <div className="text-[11px] text-slate-600">
                    เกณฑ์นิศอบ: 40 - 120 ตัว ต้องจ่ายแพะหรือแกะ 1 ตัว
                  </div>
                  <div className="pt-2 font-bold text-emerald-800">
                    {goatCount >= 40 ? 'ซะกาตที่ต้องจ่าย: แพะหรือแกะ 1 ตัว' : 'ยังไม่ถึงเกณฑ์นิศอบ (ขั้นต่ำ 40 ตัว)'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Calculation Summary & Proceed Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                สรุปผลการคำนวณซะกาต
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {isEligible ? '✓ เข้าเกณฑ์วาญิบ' : 'ไม่ถึงเกณฑ์นิศอบ'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>ยอดทรัพย์สินรวม:</span>
                <span className="font-semibold text-slate-900">฿{currentGross.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ยอดหักที่เข้าเกณฑ์:</span>
                <span className="font-semibold text-rose-700">-฿{currentDeduction.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-700 pt-2 border-t font-semibold">
                <span>ยอดสุทธิที่นำมาคำนวณ:</span>
                <span className="font-bold text-slate-900">฿{currentNet.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>นิศอบที่ใช้เปรียบเทียบ:</span>
                <span>฿{nisabValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>อัตราการคำนวณ:</span>
                <span>{activeTab === 'agri' ? (irrigationType === 'rain' ? '10%' : '5%') : '2.5%'}</span>
              </div>
            </div>

            {/* Final Amount Callout Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-700 text-white shadow-md shadow-emerald-900/10 space-y-1">
              <div className="text-xs text-emerald-200">ยอดเงินซะกาตที่ต้องชำระ</div>
              <div className="text-3xl font-extrabold tracking-tight">
                ฿{currentDue.toLocaleString()} <span className="text-sm font-normal text-emerald-200">บาท</span>
              </div>
              <div className="text-[10px] text-emerald-150 pt-1">
                {isEligible
                  ? '* มีหน้าที่ต้องจ่ายซะกาตตามหลักการศาสนา'
                  : '* ยอดสุทธิยังไม่ถึงนิศอบ ไม่วาญิบต้องจ่าย (สามารถบริจาคศอดะเกาะฮ์ได้ตามศรัทธา)'}
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100">
            <button
              onClick={handleProceedToPayment}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 group"
            >
              <span>ดำเนินการจ่ายซะกาต (PromptPay QR)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-[10px] text-center text-slate-400">
              ระบบจะนำยอด ฿{currentDue.toLocaleString()} เข้าสู่หน้าออก QR Code ทันที
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
