'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Layers,
  Sparkles,
  Inbox
} from 'lucide-react';
import { SystemNotification, NotificationType, NotificationModule } from '@/types';

interface NotificationCenterPopoverProps {
  onNavigate?: (view: string) => void;
}

export function NotificationCenterPopover({ onNavigate }: NotificationCenterPopoverProps) {
  const router = useRouter();
  const { 
    notifications, 
    unreadNotificationsCount, 
    markNotificationAsRead, 
    markAllNotificationsAsRead,
    refreshNotifications 
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all');
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filter items
  const filteredItems = (notifications || []).filter((item: SystemNotification) => {
    if (activeTab === 'unread') return !item.isRead;
    if (activeTab === 'read') return item.isRead;
    return true;
  });

  const handleItemClick = async (item: SystemNotification) => {
    if (!item.isRead) {
      await markNotificationAsRead(item.id);
    }
    setIsOpen(false);
    if (item.actionUrl) {
      if (onNavigate) {
        const clean = item.actionUrl.replace(/^\//, '');
        onNavigate(clean);
      } else {
        router.push(item.actionUrl);
      }
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

  const handleViewAll = () => {
    setIsOpen(false);
    if (onNavigate) {
      onNavigate('notifications');
    } else {
      router.push('/notifications');
    }
  };

  const getModuleBadge = (mod: NotificationModule) => {
    switch (mod) {
      case 'beneficiary':
        return { label: 'ทะเบียนผู้มีสิทธิ์', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'request':
        return { label: 'คำร้องขอความช่วยเหลือ', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'assessment':
        return { label: 'ประเมินสิทธิ์', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'approval':
        return { label: 'พิจารณาอนุมัติ', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'disbursement':
        return { label: 'เบิกจ่ายเงิน', color: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'followup':
        return { label: 'ติดตามผล', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'finance':
        return { label: 'การเงินและบัญชี', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
      default:
        return { label: 'ระบบ', color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'error':
        return <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-sky-600 shrink-0" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) return 'เมื่อสักครู่';
      if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
      if (diffHour < 24) return `${diffHour} ชั่วโมงที่แล้ว`;
      if (diffDay === 1) return 'เมื่อวานนี้';
      if (diffDay < 7) return `${diffDay} วันที่แล้ว`;

      return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button (44x44px target on mobile) */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            refreshNotifications();
          }
        }}
        className={`relative flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-all duration-200 ${
          isOpen
            ? 'bg-slate-100 text-[#0b2545] border-slate-300 shadow-inner'
            : 'text-slate-600 hover:text-[#0b2545] hover:bg-slate-100 border-transparent hover:border-slate-200'
        }`}
        title="ศูนย์แจ้งเตือนระบบ (Notifications)"
        aria-label={`การแจ้งเตือน (${unreadNotificationsCount} รายการใหม่)`}
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 text-slate-700" />

        {/* Unread Badge with optional Pulse effect */}
        {unreadNotificationsCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-extrabold text-white shadow-xs">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60" />
            <span className="relative">
              {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
            </span>
          </span>
        )}
      </button>

      {/* Popover Dropdown (Fixed on Mobile, Absolute on sm+) */}
      {isOpen && (
        <div 
          className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-[420px] max-h-[85vh] sm:max-h-[580px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          role="region"
          aria-label="หน้าต่างการแจ้งเตือน"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-[#0b2545] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-300" />
              <span className="font-bold text-sm">การแจ้งเตือนระบบ</span>
              {unreadNotificationsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {unreadNotificationsCount} ใหม่
                </span>
              )}
            </div>

            {unreadNotificationsCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                className="zms-action text-[11px] text-teal-300 hover:text-white flex items-center gap-1 font-semibold transition-colors disabled:opacity-50"
                title="ทำเครื่องหมายว่าอ่านแล้วทั้งหมด"
               aria-label="อ่านทั้งหมด">
                <CheckCheck className="w-3.5 h-3.5" />
                <span>อ่านทั้งหมด</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1 shrink-0 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeTab === 'all'
                  ? 'bg-white text-[#0b2545] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              ทั้งหมด ({(notifications || []).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'unread'
                  ? 'bg-white text-rose-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <span>ยังไม่อ่าน</span>
              {unreadNotificationsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('read')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeTab === 'read'
                  ? 'bg-white text-slate-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              อ่านแล้ว
            </button>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400 flex flex-col items-center justify-center">
                <Inbox className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                <div className="text-sm font-semibold text-slate-600">ไม่มีรายการแจ้งเตือน</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {activeTab === 'unread' ? 'ท่านได้อ่านการแจ้งเตือนทั้งหมดแล้ว' : 'ไม่มีรายการในหมวดนี้'}
                </div>
              </div>
            ) : (
              filteredItems.map((item: SystemNotification) => {
                const modBadge = getModuleBadge(item.module);
                const typeIcon = getTypeIcon(item.type);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                      item.isRead ? 'bg-white hover:bg-slate-50' : 'bg-sky-50/50 hover:bg-sky-50/80 font-medium'
                    }`}
                  >
                    {/* Unread indicator dot */}
                    <div className="pt-1.5 shrink-0">
                      {!item.isRead ? (
                        <span className="block w-2 h-2 rounded-full bg-rose-500 shadow-xs" title="ยังไม่อ่าน" />
                      ) : (
                        <span className="block w-2 h-2 rounded-full bg-transparent" />
                      )}
                    </div>

                    {/* Type icon */}
                    <div className="pt-0.5 shrink-0">{typeIcon}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${modBadge.color}`}>
                          {modBadge.label}
                        </span>
                        {item.referenceId && (
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                            {item.referenceId}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 ml-auto shrink-0">
                          <Clock className="w-2.5 h-2.5" />
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      <div className={`text-xs ${item.isRead ? 'text-slate-800' : 'text-slate-900 font-bold'} leading-tight`}>
                        {item.title}
                      </div>

                      <div className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                        {item.message}
                      </div>
                    </div>

                    {/* Mark read button */}
                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markNotificationAsRead(item.id);
                        }}
                        className="zms-action opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all shrink-0"
                        title="ทำเครื่องหมายว่าอ่านแล้ว"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with "ดูทั้งหมด" button */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
            <span className="text-[11px] text-slate-500 font-medium">
              แสดงรายการล่าสุด
            </span>
            <button
              type="button"
              onClick={handleViewAll}
              className="zms-action inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0b2545] hover:bg-[#143761] text-white font-bold transition-colors"
             aria-label="ดูการแจ้งเตือนทั้งหมด" title="ดูการแจ้งเตือนทั้งหมด">
              <span>ดูการแจ้งเตือนทั้งหมด</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
