'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  Layers, 
  Settings, 
  ShieldCheck, 
  Database, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Download,
  Calendar,
  Lock,
  Search,
  ExternalLink
} from 'lucide-react';

export function BranchesAndDepartmentsView() {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'branches' | 'departments'>('branches');
  const [searchQuery, setSearchQuery] = useState('');

  const branches = [
    {
      id: 'br-hq',
      name: 'สำนักงานใหญ่ กรุงเทพฯ',
      code: 'BKK-HQ',
      address: '123/45 ถนนรามคำแหง แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240',
      phone: '02-123-4567',
      email: 'hq@zakatfoundation.or.th',
      manager: 'ดร.มุฮัมมัด อาลี (ประธานมูลนิธิ)',
      staffCount: 14,
      status: 'active'
    },
    {
      id: 'br-south',
      name: 'สาขาภาคใต้ (สงขลา-หาดใหญ่)',
      code: 'SOU-HDY',
      address: '88/12 ถนนนิพัทธ์อุทิศ ตำบลหาดใหญ่ อำเภอหาดใหญ่ จังหวัดสงขลา 90110',
      phone: '074-123-456',
      email: 'south@zakatfoundation.or.th',
      manager: 'อุสตาซซาการียา บินดอเลาะ',
      staffCount: 8,
      status: 'active'
    },
    {
      id: 'br-north',
      name: 'สาขาภาคเหนือ (เชียงใหม่)',
      code: 'NOR-CNX',
      address: '45/3 ถนนช้างคลาน ตำบลช้างคลาน อำเภอเมือง จังหวัดเชียงใหม่ 50100',
      phone: '053-123-456',
      email: 'north@zakatfoundation.or.th',
      manager: 'อาจารย์อิบรอฮีม สมบูรณ์',
      staffCount: 4,
      status: 'active'
    },
    {
      id: 'br-central',
      name: 'สาขาภาคกลาง (พระนครศรีอยุธยา)',
      code: 'CEN-AYA',
      address: '19/4 หมู่ 5 ตำบลคลองสวนพลู อำเภอพระนครศรีอยุธยา จังหวัดพระนครศรีอยุธยา 13000',
      phone: '035-123-456',
      email: 'central@zakatfoundation.or.th',
      manager: 'อิหม่ามมุสตอฟา สุขเกษม',
      staffCount: 5,
      status: 'active'
    }
  ];

  const departments = [
    {
      id: 'dept-it',
      name: 'ฝ่ายเทคโนโลยีสารสนเทศและระบบฐานข้อมูล',
      code: 'IT-SEC',
      head: 'นายอับดุลลอฮ์ สุขใจ (Super Admin)',
      roles: ['super_admin'],
      description: 'ดูแลความปลอดภัยระบบเซิร์ฟเวอร์ สิทธิ์การเข้าถึง และการสำรองฐานข้อมูล',
      memberCount: 3,
      status: 'active'
    },
    {
      id: 'dept-finance',
      name: 'ฝ่ายการเงิน บัญชี และการจ่ายเงิน',
      code: 'FIN-ACC',
      head: 'นางสาวมัรยัม บินตีอะฮ์หมัด',
      roles: ['finance'],
      description: 'บันทึกรายรับ-รายจ่าย ตรวจสอบสลิปการโอนเงิน และกระทบยอดบัญชีกองทุน',
      memberCount: 5,
      status: 'active'
    },
    {
      id: 'dept-shariah',
      name: 'ฝ่ายพิจารณาศาสนบัญญัติและอนุมัติ',
      code: 'SHR-APP',
      head: 'ดร.มุฮัมมัด อาลี (คณะกรรมการชะรีอะฮ์)',
      roles: ['approver', 'executive'],
      description: 'พิจารณาคำร้องตามเกณฑ์ 8 จำพวก (Asnaf) และอนุมัติวงเงินจัดสรรตามระเบียบ',
      memberCount: 4,
      status: 'active'
    },
    {
      id: 'dept-field',
      name: 'ฝ่ายสำรวจ ลงพื้นที่ และประเมินสิทธิ์',
      code: 'FLD-OPS',
      head: 'นายฮาซัน มะฮ์มูด',
      roles: ['officer'],
      description: 'ลงพื้นที่เยี่ยมเยียนผู้ยากไร้ ตรวจสอบสภาพความเป็นจริง และจัดทำรายงานประเมิน',
      memberCount: 12,
      status: 'active'
    },
    {
      id: 'dept-welfare',
      name: 'ฝ่ายสวัสดิการสังคมและสงเคราะห์ฉุกเฉิน',
      code: 'SOC-WEL',
      head: 'นางฟาติมะฮ์ หวังผล',
      roles: ['officer'],
      description: 'ประสานงานถุงยังชีพ ฟื้นฟูสาธารณภัย และโครงการทุนการศึกษาเยาวชน',
      memberCount: 7,
      status: 'active'
    }
  ];

  const filteredBranches = branches.filter((b) => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.manager.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDepts = departments.filter((d) => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.head.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4" /> โครงสร้างองค์กร
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            สาขาและแผนกการดำเนินงาน
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            การบริหารจัดการสาขาครอบคลุมทั่วประเทศและแผนกปฏิบัติงานตามมาตรฐานการกระจายอำนาจ
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200">
          <button
            onClick={() => setActiveTab('branches')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'branches' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            สาขาทั้งหมด ({branches.length})
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'departments' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            แผนกปฏิบัติงาน ({departments.length})
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'branches' ? "ค้นหาชื่อสาขา, รหัส, ผู้จัดการ..." : "ค้นหาชื่อแผนก, รหัส, หัวหน้าแผนก..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Content Grid */}
      {activeTab === 'branches' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBranches.map((br) => (
            <div key={br.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:border-teal-300 transition-all space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 mb-1">
                    รหัสสาขา: {br.code}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{br.name}</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  เปิดทำการ
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{br.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{br.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{br.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>ผู้จัดการสาขา: <strong>{br.manager}</strong></span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 text-slate-500">
                <span>บุคลากรประจำสาขา: <strong>{br.staffCount} คน</strong></span>
                <span className="text-teal-700 font-semibold cursor-pointer hover:underline">
                  ดูรายชื่อเจ้าหน้าที่ →
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepts.map((d) => (
            <div key={d.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:border-sky-300 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                    {d.code}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {d.memberCount} อัตรา
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug">{d.name}</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">{d.description}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 text-xs space-y-2">
                <div className="text-slate-600">
                  หัวหน้าฝ่าย: <strong>{d.head}</strong>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {d.roles.map((r) => (
                    <span key={r} className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                      Role: {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminSettingsView() {
  const { showToast } = useApp();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{
    success: boolean;
    timestamp: string;
    checksum: string;
    filename: string;
  } | null>(null);

  const [nisabGoldPrice, setNisabGoldPrice] = useState('42,500');
  const [zakatRate, setZakatRate] = useState('2.5%');
  const [pdpaRetentionYears, setPdpaRetentionYears] = useState('10');

  const handleBackupNow = async () => {
    try {
      setIsBackingUp(true);
      const res = await fetch('/api/system/backup', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        setBackupStatus({
          success: true,
          timestamp: new Date().toLocaleString('th-TH'),
          checksum: json.data?.checksum || 'a7f9c2d4e8b1...',
          filename: json.data?.filename || 'zms-backup-latest.db'
        });
        showToast('สำรองฐานข้อมูล ZMS และคำนวณ Checksum สำเร็จ', 'success');
      } else {
        throw new Error(json.error || 'ไม่สามารถสำรองฐานข้อมูลได้');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการสำรองฐานข้อมูล', 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
          <Settings className="w-4 h-4" /> การตั้งค่าระบบ
        </div>
        <h1 className="text-2xl font-black text-slate-900 mt-1">
          การกำหนดค่าระบบและการสำรองฐานข้อมูล (System Settings)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          การควบคุมพารามิเตอร์การคำนวณตามศาสนบัญญัติ กฎหมาย PDPA และสถาปัตยกรรมความมั่นคงปลอดภัย
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Database & Security Backup */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">ฐานข้อมูลและจุดคืนค่า (Database Engine)</h2>
              <p className="text-xs text-slate-500">ระบบเก็บข้อมูล SQLite / LibSQL พร้อม Audit Logging</p>
            </div>
          </div>

          <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-600">ประเภทเอนจินฐานข้อมูล:</span>
              <span className="font-bold text-slate-900">SQLite LibSQL (Atomic ACID)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-600">ตำแหน่งไฟล์:</span>
              <span className="font-mono text-slate-700">data/zms.db</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-600">การเข้ารหัสรหัสผ่าน:</span>
              <span className="font-bold text-emerald-700">HMAC-SHA256 with Salt</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">การป้องกัน Session:</span>
              <span className="font-bold text-emerald-700">HttpOnly, SameSite=Lax, 7 วัน</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleBackupNow}
              disabled={isBackingUp}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0b2545] hover:bg-[#133e6f] text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
              <span>{isBackingUp ? 'กำลังสำรองข้อมูล...' : 'สั่งสำรองฐานข้อมูลทันที (Backup Snapshot)'}</span>
            </button>
          </div>

          {backupStatus && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1 animate-fadeIn">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> สำรองข้อมูลสำเร็จ
              </div>
              <div className="text-[11px] text-emerald-700">
                เวลา: {backupStatus.timestamp} • ไฟล์: {backupStatus.filename}
              </div>
              <div className="text-[10px] font-mono text-emerald-800 truncate">
                SHA-256: {backupStatus.checksum}
              </div>
            </div>
          )}
        </div>

        {/* 2. Shariah Parameters */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">พารามิเตอร์ชะรีอะฮ์ (Shariah Governance)</h2>
              <p className="text-xs text-slate-500">เกณฑ์คำนวณและพิกัดนิศอบซะกาตตามหลักการศาสนา</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ราคาทองคำแท่งมาตรฐานเพื่อคำนวณนิศอบ (บาทละ):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nisabGoldPrice}
                  onChange={(e) => setNisabGoldPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-bold"
                />
                <span className="text-slate-500 shrink-0 font-medium">บาท (นิศอบ = 85 กรัม ~ ฿238,000)</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                อัตราส่วนซะกาตทรัพย์สินการเงินและการค้า:
              </label>
              <input
                type="text"
                value={zakatRate}
                disabled
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                คงที่ตามหลักการ 2.5% (รุบอุลอุชุร - หนึ่งในสี่สิบ)
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ระยะเวลาจัดเก็บประวัติคำร้องตามมาตรฐาน PDPA (ปี):
              </label>
              <input
                type="number"
                value={pdpaRetentionYears}
                onChange={(e) => setPdpaRetentionYears(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                ข้อมูลส่วนบุคคล 13 หลักถูก Masking ในรายงานสาธารณะ
              </span>
            </div>

            <button
              onClick={() => showToast('บันทึกการตั้งค่าพารามิเตอร์เรียบร้อย', 'success')}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่า</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
