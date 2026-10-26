'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Building2,
  Calculator,
  Heart,
  HelpCircle,
  FileText,
  User,
  LogIn,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  UserPlus,
  KeyRound,
  Receipt,
  Coins,
  Sparkles
} from 'lucide-react';

interface PublicHeaderProps {
  currentView?: string;
  onNavigate?: (view: string) => void;
  onSwitchToAdmin?: () => void;
}

export function PublicHeader({ currentView = 'public-home', onNavigate, onSwitchToAdmin }: PublicHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, isAuthenticated, logoutUser } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);

  const isStaffRole = isAuthenticated && ['super_admin', 'executive', 'officer', 'approver', 'finance'].includes(currentUser.role);

  // 1. Close dropdowns on click outside (handles both desktop user menu and mobile navigation drawer)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Desktop user menu dropdown
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }

      // Mobile menu drawer
      if (
        isMobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target) &&
        hamburgerButtonRef.current &&
        !hamburgerButtonRef.current.contains(target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  // 2. Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 3. Close mobile menu automatically when screen resizes to Desktop (>= 768px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 6 Core Menu Items required by Specification
  const navItems = [
    { id: 'public-home', label: 'หน้าแรก', path: '/', icon: Building2 },
    { id: 'public-about', label: 'เกี่ยวกับเรา', path: '/about', icon: HelpCircle },
    { id: 'public-calculator', label: 'คำนวณซะกาต', path: '/zakat-calculator', icon: Calculator },
    { id: 'public-transparency', label: 'รายงานความโปร่งใส', path: '/transparency', icon: ShieldCheck },
  ];

  const handleNav = (item: typeof navItems[0]) => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);

    // If in single-page workbench and onNavigate is provided
    if (onNavigate) {
      onNavigate(item.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push(item.path);
    }
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    await logoutUser();
    router.push('/login?logout=success');
  };

  // Determine active state either by currentView prop or current pathname
  const isItemActive = (item: typeof navItems[0]) => {
    if (currentView && currentView === item.id) return true;
    if (pathname === item.path) return true;
    if (item.path !== '/' && pathname.startsWith(item.path)) return true;
    return false;
  };

  return (
    <header className="w-full sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all pt-safe">
      {/* 1. Top Islamic Trust Bar (Deep Navy Tone, 100% Full-Width) */}
      <div className="w-full bg-[#0b2545] text-white text-[11px] sm:text-xs px-4 sm:px-6 lg:px-12 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#133863]">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-amber-400 text-[#0b2545] uppercase tracking-wider text-[10px]">
              <Sparkles className="w-3 h-3 text-[#0b2545]" />
              องค์กรสาธารณกุศล
            </span>
            <span className="text-slate-200 hidden sm:inline font-medium">
              มูลนิธิซะกาตและสาธารณกุศลแห่งประเทศไทย • บริหารจัดการซะกาตตามหลักศาสนบัญญัติเพื่อ 8 กลุ่มอัศนาฟ 100%
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Staff workbench switcher for authorized staff */}
            {isStaffRole && (
              <button
                onClick={() => {
                  if (onSwitchToAdmin) {
                    onSwitchToAdmin();
                  } else {
                    router.push('/#admin');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-[#133e6f] hover:bg-[#1a4f8c] text-sky-200 hover:text-white transition-colors text-[11px] font-semibold border border-sky-400/20"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-sky-300" />
                <span className="hidden sm:inline">ระบบหลังบ้านเจ้าหน้าที่</span>
                <span className="sm:hidden">หลังบ้าน</span>
                <ChevronRight className="w-3 h-3 text-sky-300" />
              </button>
            )}

            {/* User status badge */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-1.5 text-xs text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>ผู้ใช้งาน:</span>
                <span className="font-semibold text-white">{currentUser.name.split(' ')[0]}</span>
                <span className="text-[11px] text-slate-300 font-normal">({currentUser.roleTitleTh})</span>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>บริการสาธารณะสำหรับประชาชน</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Bar (64-72px on iPhone 15 / Mobile, 80-96px on Desktop) */}
      <div className="w-full px-4 sm:px-6 lg:px-12">
        <div className="flex items-center justify-between h-16 sm:h-[72px] md:h-20 lg:h-24 gap-3 sm:gap-4 lg:gap-8">
          {/* Brand Logo & Name (Left Aligned) */}
          <Link
            href="/"
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault();
                onNavigate('public-home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-2.5 sm:gap-3.5 text-left group shrink-0 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0b2545] rounded-2xl"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-tr from-[#0b2545] via-[#133e6f] to-teal-600 flex items-center justify-center text-white shadow-md shadow-[#0b2545]/20 group-hover:scale-105 transition-transform">
              <span className="font-black text-lg sm:text-xl lg:text-2xl tracking-wider text-amber-300">ZMS</span>
            </div>
            <div>
              <div className="text-sm sm:text-base lg:text-xl font-black text-[#0b2545] group-hover:text-teal-700 transition-colors flex items-center gap-1.5 leading-tight tracking-tight">
                <span>มูลนิธิซะกาตและสาธารณกุศล</span>
              </div>
              <div className="text-[10px] sm:text-xs lg:text-[12px] text-slate-500 font-semibold tracking-wider uppercase">
                FOUNDATION OF ZAKAT AND PUBLIC CHARITY
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links (Visible on >= 768px, 16-18px font size, 6 Core Items) */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-1 xl:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item)}
                  className={`px-2.5 xl:px-3.5 py-2 xl:py-2.5 rounded-xl text-xs xl:text-[16px] 2xl:text-[17px] font-semibold transition-all flex items-center gap-1.5 xl:gap-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0b2545] ${active
                    ? 'bg-sky-50 text-[#0b2545] font-extrabold border border-sky-300/80 shadow-2xs ring-1 ring-sky-200'
                    : 'text-slate-700 hover:text-[#0b2545] hover:bg-slate-100/80'
                    }`}
                >
                  <Icon className={`w-4 h-4 xl:w-4.5 xl:h-4.5 shrink-0 ${active ? 'text-teal-600 stroke-[2.5]' : 'text-slate-400 group-hover:text-[#0b2545]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Area: Highlighted CTA Button + Auth Buttons (Desktop/Tablet >= 768px) */}
          <div className="hidden md:flex items-center gap-2.5 lg:gap-3 shrink-0">
            {/* Prominent Donation / Payment CTA Button */}
            <button
              onClick={() => {
                if (onNavigate) {
                  onNavigate('public-payment');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  router.push('/zakat-payment');
                }
              }}
              className="inline-flex items-center gap-1.5 lg:gap-2 px-3.5 lg:px-5 py-2 lg:py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#0b2545] font-black text-xs lg:text-base shadow-md shadow-amber-500/20 transition-all hover:scale-102 active:scale-98 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Coins className="w-4 h-4 lg:w-4.5 lg:h-4.5 text-[#0b2545]" />
              <span>ชำระซะกาต</span>
            </button>

            {/* Authenticated State */}
            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="p-1.5 pr-3.5 rounded-2xl border border-slate-200 hover:border-teal-400 bg-white hover:bg-slate-50 transition-all flex items-center gap-2 text-xs font-semibold shadow-xs focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0b2545]"
                  aria-expanded={isUserMenuOpen}
                >
                  <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-gradient-to-tr from-[#0b2545] to-teal-600 text-white font-black flex items-center justify-center text-xs lg:text-sm shadow-xs">
                    {currentUser.name.slice(0, 1)}
                  </div>
                  <div className="text-left hidden lg:block">
                    <div className="text-[#0b2545] font-bold leading-tight truncate max-w-[120px]">
                      {currentUser.name.split(' ')[0]}
                    </div>
                    <div className="text-[10px] text-teal-700 font-medium">
                      {currentUser.roleTitleTh.split(' ')[0]}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 animate-fadeIn text-xs">
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                      <div className="font-bold text-slate-900 truncate">{currentUser.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{currentUser.email || currentUser.phone}</div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          {currentUser.roleTitleTh}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                          {currentUser.branch}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/my-account"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full px-4 py-2.5 flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                      >
                        <Receipt className="w-4 h-4 text-teal-600" />
                        <div>
                          <div className="font-semibold text-slate-800">บัญชีของฉัน</div>
                          <div className="text-[10px] text-slate-400">ประวัติการจ่ายซะกาต & ติดตามคำร้อง</div>
                        </div>
                      </Link>

                      <Link
                        href="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full px-4 py-2.5 flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                      >
                        <User className="w-4 h-4 text-teal-600" />
                        <div>
                          <div className="font-semibold text-slate-800">โปรไฟล์ผู้ใช้งาน</div>
                          <div className="text-[10px] text-slate-400">แก้ไขข้อมูลส่วนตัว & รหัสผ่าน</div>
                        </div>
                      </Link>

                      {isStaffRole && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            if (onSwitchToAdmin) onSwitchToAdmin();
                            else router.push('/#admin');
                          }}
                          className="w-full px-4 py-2.5 flex items-center gap-2.5 text-slate-700 hover:bg-sky-50 font-medium transition-colors text-left"
                        >
                          <LayoutDashboard className="w-4 h-4 text-[#0b2545]" />
                          <div>
                            <div className="font-semibold text-[#0b2545]">ระบบหลังบ้านเจ้าหน้าที่</div>
                            <div className="text-[10px] text-slate-400">เข้าสู่ Workbench ปฏิบัติงาน</div>
                          </div>
                        </button>
                      )}
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2.5 flex items-center gap-2.5 text-red-700 hover:bg-red-50 font-bold transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4 text-red-600" />
                        <span>ออกจากระบบ (Logout)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Guest State: Login & Register Buttons */
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 lg:px-4 py-2 lg:py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs lg:text-sm transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  <LogIn className="w-4 h-4 text-teal-700" />
                  <span>เข้าสู่ระบบ</span>
                </Link>

                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-3.5 lg:px-4 py-2 lg:py-2.5 rounded-xl bg-[#0b2545] hover:bg-[#133e6f] text-white font-bold text-xs lg:text-sm shadow-xs transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0b2545]"
                >
                  <UserPlus className="w-4 h-4 text-amber-300" />
                  <span>สมัครสมาชิก</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Right Controls: User Pill / Login + Hamburger Button (< 768px, iPhone 15 Touch Target 44x44px) */}
          <div className="flex md:hidden items-center gap-2">
            {!isAuthenticated ? (
              <Link
                href="/login"
                className="px-3 py-2 rounded-xl bg-[#0b2545] text-white text-xs font-bold shrink-0 min-h-[38px] flex items-center"
              >
                เข้าสู่ระบบ
              </Link>
            ) : (
              <Link
                href="/my-account"
                className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 font-bold flex items-center justify-center text-xs border border-teal-200 shrink-0"
                title={currentUser.name}
              >
                {currentUser.name.slice(0, 1)}
              </Link>
            )}

            {/* Hamburger Button (Min 44x44px touch target, ☰ / ✕ icon toggle) */}
            <button
              ref={hamburgerButtonRef}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors border border-slate-200/80 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0b2545]"
              aria-label={isMobileMenuOpen ? 'ปิดเมนูหลัก' : 'เปิดเมนูหลัก'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation-menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-[#0b2545]" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6 text-slate-800" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Mobile Navigation Drawer (Optimized for iPhone 15 393px, Safe Area Support) */}
      {isMobileMenuOpen && (
        <div
          id="mobile-navigation-menu"
          ref={mobileMenuRef}
          className="md:hidden bg-white/98 backdrop-blur-lg border-b border-slate-200 px-4 sm:px-6 pt-3 pb-8 pb-safe space-y-3.5 animate-fadeIn shadow-2xl max-h-[calc(100vh-76px)] overflow-y-auto touch-scroll"
        >
          {/* Quick Donate / Payment Button for Mobile */}
          <div className="pb-1">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (onNavigate) {
                  onNavigate('public-payment');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  router.push('/zakat-payment');
                }
              }}
              className="w-full h-12 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#0b2545] font-black text-sm flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-transform"
            >
              <Coins className="w-4.5 h-4.5 text-[#0b2545]" />
              <span>ชำระซะกาต / บริจาคทันที</span>
            </button>
          </div>

          {/* Core Menu Navigation Links */}
          <div className="grid grid-cols-1 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item)}
                  className={`w-full min-h-[46px] px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 text-left transition-colors ${active
                    ? 'bg-sky-50 text-[#0b2545] font-bold border border-sky-200/80'
                    : 'text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-teal-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Authentication & User Account Drawer Section */}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                {/* User Card */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 mb-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0b2545] to-teal-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                      {currentUser.name.slice(0, 1)}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-bold text-slate-900 text-sm truncate">{currentUser.name}</div>
                      <div className="text-xs text-slate-500 truncate">{currentUser.email || currentUser.phone}</div>
                      <div className="text-[10px] text-teal-700 font-semibold mt-0.5">
                        {currentUser.roleTitleTh} • {currentUser.branch}
                      </div>
                    </div>
                  </div>
                </div>

                <Link
                  href="/my-account"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full min-h-[44px] py-2.5 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 flex items-center justify-between hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2.5">
                    <Receipt className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>บัญชีของฉัน (ประวัติ & ติดตามคำร้อง)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </Link>

                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full min-h-[44px] py-2.5 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 flex items-center justify-between hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2.5">
                    <KeyRound className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>ข้อมูลส่วนตัว & เปลี่ยนรหัสผ่าน</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </Link>

                {isStaffRole && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (onSwitchToAdmin) onSwitchToAdmin();
                      else router.push('/#admin');
                    }}
                    className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-[#0b2545] text-white text-sm font-bold flex items-center justify-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4 text-sky-300 shrink-0" />
                    <span>ระบบหลังบ้านเจ้าหน้าที่ (Admin Portal)</span>
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-bold flex items-center justify-center gap-2 mt-1"
                >
                  <LogOut className="w-4 h-4 text-red-600 shrink-0" />
                  <span>ออกจากระบบ (Logout)</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full min-h-[48px] py-3 px-3 rounded-xl bg-[#0b2545] text-white font-bold text-sm text-center shadow-sm flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>เข้าสู่ระบบสมาชิก</span>
                </Link>

                <Link
                  href="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full min-h-[44px] py-2.5 px-3 rounded-xl border border-slate-300 text-slate-800 font-bold text-sm text-center hover:bg-slate-50 flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>สมัครสมาชิกใหม่</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
