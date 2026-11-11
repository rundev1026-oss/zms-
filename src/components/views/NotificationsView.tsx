'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  Bell, 
  CheckCircle2, 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  Check, 
  CheckCheck, 
  ExternalLink,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Layers,
  Inbox,
  Calendar,
  FileText,
  User,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { SystemNotification, NotificationType, NotificationModule } from '@/types';

interface NotificationsViewProps {
  onNavigate?: (view: string) => void;
}

export function NotificationsView({ onNavigate }: NotificationsViewProps) {
  const router = useRouter();
  const { 
    currentUser,
    notifications, 
    unreadNotificationsCount, 
    markNotificationAsRead, 
    markAllNotificationsAsRead,
    refreshNotifications 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshNotifications();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleItemAction = async (item: SystemNotification) => {
    if (!item.isRead) {
      await markNotificationAsRead(item.id);
    }
    if (item.actionUrl) {
      if (onNavigate) {
        const clean = item.actionUrl.replace(/^\//, '');
        onNavigate(clean);
      } else {
        router.push(item.actionUrl);
      }
    }
  };

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return (notifications || []).filter((item) => {
      // Status filter
      if (statusFilter === 'unread' && item.isRead) return false;
      if (statusFilter === 'read' && !item.isRead) return false;

      // Module filter
      if (moduleFilter !== 'all' && item.module !== moduleFilter) return false;

      // Type filter
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(term);
        const matchMessage = item.message.toLowerCase().includes(term);
        const matchRef = item.referenceId ? item.referenceId.toLowerCase().includes(term) : false;
        if (!matchTitle && !matchMessage && !matchRef) return false;
      }

      return true;
    });
  }, [notifications, statusFilter, moduleFilter, typeFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = (notifications || []).length;
    const unread = (notifications || []).filter((n) => !n.isRead).length;
    const approvalsAndRequests = (notifications || []).filter(
      (n) => n.module === 'approval' || n.module === 'request' || n.module === 'assessment'
    ).length;
    const financeAndDisburse = (notifications || []).filter(
      (n) => n.module === 'finance' || n.module === 'disbursement'
    ).length;

    return { total, unread, approvalsAndRequests, financeAndDisburse };
  }, [notifications]);

  const getModuleMeta = (mod: NotificationModule) => {
    switch (mod) {
      case 'beneficiary':
        return { label: 'ทะเบียนผู้มีสิทธิ์', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'request':
        return { label: 'คำร้องขอความช่วยเหลือ', color: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'assessment':
        return { label: 'ประเมินสิทธิ์', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      case 'approval':
        return { label: 'พิจารณาอนุมัติ', color: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'disbursement':
        return { label: 'เบิกจ่ายเงิน', color: 'bg-teal-50 text-teal-800 border-teal-200' };
      case 'followup':
        return { label: 'ติดตามผล', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'finance':
        return { label: 'การเงินและบัญชี', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' };
      default:
        return { label: 'ระบบส่วนกลาง', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const getTypeMeta = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
          label: 'สำเร็จ',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'error':
        return {
          icon: <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />,
          label: 'ข้อผิดพลาด',
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
          label: 'แจ้งเตือน',
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-sky-600 shrink-0" />,
          label: 'ข้อมูล',
          badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
        };
    }
  };

  const formatThaiDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' น.';
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-sky-50 text-sky-700">
              <Bell className="w-5 h-5 text-[#0b2545]" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              ศูนย์การแจ้งเตือนระบบ (Global Notifications)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            ศูนย์กลางติดตามเหตุการณ์สำคัญ การอนุมัติคำร้อง การเงินและบัญชี และสถานะการดำเนินงานของระบบ ZMS
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs disabled:opacity-50"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>

          {stats.unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={isMarkingAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0b2545] hover:bg-[#143761] text-xs font-bold text-white transition-colors shadow-xs disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5 text-teal-300" />
              <span>ทำเครื่องหมายอ่านแล้วทั้งหมด</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Summary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-bold text-slate-400">การแจ้งเตือนทั้งหมด</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">ครอบคลุมทุกโมดูล</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200/80 bg-rose-50/20 shadow-2xs">
          <div className="text-xs font-bold text-rose-700 flex items-center justify-between">
            <span>ยังไม่ได้อ่าน</span>
            {stats.unread > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1">{stats.unread}</div>
          <div className="text-[11px] text-rose-600/80 mt-0.5">รอการเปิดตรวจสอบ</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-bold text-slate-400">คำร้อง & การอนุมัติ</div>
          <div className="text-2xl font-black text-[#0b2545] mt-1">{stats.approvalsAndRequests}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">คำร้อง ตรวจสอบ พิจารณา</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-bold text-slate-400">การเงิน & เบิกจ่าย</div>
          <div className="text-2xl font-black text-teal-700 mt-1">{stats.financeAndDisburse}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">เบิกจ่าย โอนเงิน กระทบยอด</div>
        </div>
      </div>

      {/* 3. Filter Controls & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        {/* Top filter row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-[#0b2545] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('unread')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                statusFilter === 'unread'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>ยังไม่อ่าน</span>
              {stats.unread > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-black">
                  {stats.unread}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('read')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'read'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              อ่านแล้ว
            </button>
          </div>

          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาข้อความ, หัวข้อ, หรือเลขที่อ้างอิง..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-[#0b2545] focus:ring-1 focus:ring-[#0b2545]"
            />
          </div>
        </div>

        {/* Dropdown filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>ตัวกรอง:</span>
          </div>

          {/* Module Select */}
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-hidden focus:border-[#0b2545]"
          >
            <option value="all">ทุกโมดูล (All Modules)</option>
            <option value="beneficiary">ทะเบียนผู้มีสิทธิ์</option>
            <option value="request">คำร้องขอความช่วยเหลือ</option>
            <option value="assessment">ตรวจสอบและประเมินสิทธิ์</option>
            <option value="approval">พิจารณาอนุมัติคำร้อง</option>
            <option value="disbursement">บันทึกการช่วยเหลือ / เบิกจ่าย</option>
            <option value="followup">ตรวจสอบและติดตามผล</option>
            <option value="finance">การเงินและบัญชี</option>
            <option value="system">ระบบส่วนกลาง</option>
          </select>

          {/* Type Select */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-hidden focus:border-[#0b2545]"
          >
            <option value="all">ทุกประเภท (All Types)</option>
            <option value="success">สำเร็จ (Success)</option>
            <option value="error">ข้อผิดพลาด (Error)</option>
            <option value="warning">แจ้งเตือน (Warning)</option>
            <option value="info">ข้อมูล (Info)</option>
          </select>

          {(moduleFilter !== 'all' || typeFilter !== 'all' || searchTerm.trim()) && (
            <button
              type="button"
              onClick={() => {
                setModuleFilter('all');
                setTypeFilter('all');
                setSearchTerm('');
              }}
              className="text-[11px] text-rose-600 hover:text-rose-800 font-bold ml-auto"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* 4. Notification Items List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-16 px-4 text-center">
            <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-1" />
            <h3 className="text-base font-bold text-slate-700">ไม่พบรายการแจ้งเตือน</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {searchTerm || moduleFilter !== 'all' || typeFilter !== 'all'
                ? 'ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรองที่เลือก'
                : 'ไม่มีรายการแจ้งเตือนในระบบในขณะนี้'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const modMeta = getModuleMeta(item.module);
            const typeMeta = getTypeMeta(item.type);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-4 shadow-2xs hover:shadow-md ${
                  item.isRead
                    ? 'border-slate-200'
                    : 'border-sky-300 bg-sky-50/20'
                }`}
              >
                {/* Left: Icon & Unread indicator */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-2.5 flex items-center justify-center">
                    {!item.isRead ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs ring-4 ring-rose-100" title="ยังไม่อ่าน" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-transparent" />
                    )}
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 shadow-2xs">
                    {typeMeta.icon}
                  </div>
                </div>

                {/* Center: Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${modMeta.color}`}>
                      {modMeta.label}
                    </span>

                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${typeMeta.badgeColor}`}>
                      {typeMeta.label}
                    </span>

                    {item.referenceId && (
                      <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {item.referenceId}
                      </span>
                    )}

                    <span className="text-xs text-slate-400 flex items-center gap-1 sm:ml-auto">
                      <Clock className="w-3 h-3" />
                      {formatThaiDateTime(item.createdAt)}
                    </span>
                  </div>

                  <h3 className={`text-sm sm:text-base ${item.isRead ? 'font-bold text-slate-800' : 'font-extrabold text-slate-900'} mt-1`}>
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed break-words">
                    {item.message}
                  </p>

                  {item.readAt && (
                    <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>อ่านเมื่อ {formatThaiDateTime(item.readAt)}</span>
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0">
                  {!item.isRead && (
                    <button
                      type="button"
                      onClick={() => markNotificationAsRead(item.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                      title="ทำเครื่องหมายว่าอ่านแล้ว"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>อ่านแล้ว</span>
                    </button>
                  )}

                  {item.actionUrl && (
                    <button
                      type="button"
                      onClick={() => handleItemAction(item)}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#0b2545] hover:bg-[#143761] text-xs font-bold text-white transition-colors shadow-xs"
                      title="เปิดดูข้อมูลที่เกี่ยวข้อง"
                    >
                      <span>เปิดดูข้อมูล</span>
                      <ArrowRight className="w-3.5 h-3.5 text-teal-300" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
