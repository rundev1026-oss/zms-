'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Settings, 
  ChevronRight
} from 'lucide-react';
import { UserManagementView } from '../UserManagementView';
import { BranchesAndDepartmentsView } from '../AdminOrgAndSettingsViews';
import { RolesAndPermissionsTab } from './tabs/RolesAndPermissionsTab';
import { AssistanceModelsTab } from './tabs/AssistanceModelsTab';
import { AssistanceTypesTab } from './tabs/AssistanceTypesTab';
import { AsnafManagementTab } from './tabs/AsnafManagementTab';
import { AssistanceFormatsTab } from './tabs/AssistanceFormatsTab';
import { RelationshipMatrixTab } from './tabs/RelationshipMatrixTab';
import { GeneralSettingsTab } from './tabs/GeneralSettingsTab';
import { DatabaseBackupTab } from './tabs/DatabaseBackupTab';

export type AdminCenterTab = 
  | 'users' 
  | 'roles' 
  | 'org' 
  | 'matrix'
  | 'asnaf' 
  | 'types' 
  | 'formats'
  | 'models' 
  | 'general'
  | 'backup';

interface SystemAdminCenterViewProps {
  initialTab?: string;
  onNavigate: (view: string) => void;
}

export function SystemAdminCenterView({ initialTab = 'users', onNavigate }: SystemAdminCenterViewProps) {
  // Normalize initialTab from potential legacy route names
  const normalizeTab = (t?: string): AdminCenterTab => {
    if (!t) return 'users';
    if (t === 'users' || t === 'admin-users') return 'users';
    if (t === 'roles' || t === 'roles-permissions' || t === 'admin-roles') return 'roles';
    if (t === 'branches-depts' || t === 'org' || t === 'admin-org') return 'org';
    if (t === 'matrix' || t === 'relationship-matrix' || t === 'admin-matrix') return 'matrix';
    if (t === 'models' || t === 'assistance-models' || t === 'admin-models') return 'models';
    if (t === 'types' || t === 'assistance-types' || t === 'admin-types') return 'types';
    if (t === 'formats' || t === 'assistance-formats' || t === 'admin-formats') return 'formats';
    if (t === 'asnaf' || t === 'asnaf-categories' || t === 'admin-asnaf') return 'asnaf';
    if (t === 'backup') return 'backup';
    if (t === 'settings' || t === 'general-settings' || t === 'general' || t === 'admin-settings') return 'general';
    return 'users';
  };

  const [activeTab, setActiveTab] = useState<AdminCenterTab>(normalizeTab(initialTab));
  const [selectedTypeModelFilter, setSelectedTypeModelFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeTab(initialTab));
    }
  }, [initialTab]);

  const navigateToTypesWithFilter = (modelCode?: string) => {
    setSelectedTypeModelFilter(modelCode);
    setActiveTab('types');
  };

  // Determine current group and tab title for breadcrumbs
  const getBreadcrumbInfo = () => {
    switch (activeTab) {
      case 'users':
        return { group: 'การบริหารระบบ', title: 'จัดการผู้ใช้งาน (User Management)' };
      case 'roles':
        return { group: 'การบริหารระบบ', title: 'บทบาทและสิทธิ์การเข้าถึง (Roles & Permissions)' };
      case 'org':
        return { group: 'การบริหารระบบ', title: 'โครงสร้างองค์กรและหน่วยงาน (Organization Structure)' };
      case 'matrix':
        return { group: 'การตั้งค่าข้อมูลพื้นฐาน', title: 'เมทริกซ์ความสัมพันธ์ 3 ระดับ (Relationship Matrix)' };
      case 'models':
        return { group: 'การตั้งค่าข้อมูลพื้นฐาน', title: 'รูปแบบการช่วยเหลือ (Assistance Models)' };
      case 'types':
        return { group: 'การตั้งค่าข้อมูลพื้นฐาน', title: 'ประเภทความช่วยเหลือ (Assistance Types)' };
      case 'formats':
        return { group: 'การตั้งค่าข้อมูลพื้นฐาน', title: 'รูปแบบและวิธีการส่งมอบ (Assistance Formats)' };
      case 'asnaf':
        return { group: 'การตั้งค่าข้อมูลพื้นฐาน', title: 'หมวดหมู่อัสนัฟ (Asnaf Management)' };
      case 'general':
        return { group: 'การตั้งค่าข้อมูลพื้นฐาน', title: 'การตั้งค่าทั่วไป (General Settings)' };
      case 'backup':
        return { group: 'ระบบงานและเครื่องมือสนับสนุน', title: 'สำรองข้อมูล (Database Backup)' };
      default:
        return { group: 'การบริหารระบบ', title: 'การตั้งค่าและบริหารระบบ' };
    }
  };

  const { group, title } = getBreadcrumbInfo();

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Centralized Header & Breadcrumb */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-3" aria-label="Breadcrumb">
          <button 
            type="button" 
            onClick={() => onNavigate('dashboard')} 
            className="hover:text-teal-800 transition-colors font-medium"
          >
            หน้าหลัก
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-600">
            {activeTab === 'backup' ? 'ระบบงานและเครื่องมือสนับสนุน' : 'การตั้งค่าและบริหารระบบ'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-900">{title}</span>
        </nav>

        {/* Title & Hub Overview */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-teal-800 uppercase tracking-wider mb-1">
              <Settings className="w-4 h-4 text-teal-700" />
              <span>
                {activeTab === 'backup' 
                  ? 'Database Backup & Integrity Management' 
                  : 'Centralized Administration & Configuration Hub'}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#0B2545] tracking-tight">
              {activeTab === 'backup'
                ? 'สำรองข้อมูล (Database Backup)'
                : 'การตั้งค่าและบริหารระบบ (System Administration & Configuration)'}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              {activeTab === 'backup'
                ? 'ศูนย์กลางการสำรองฐานข้อมูล ZMS ตรวจสอบความถูกต้องด้วย Cryptographic SHA-256 Checksum และบันทึกประวัติการทำงาน (Audit Trail)'
                : 'ศูนย์กลางควบคุมการตั้งค่าระบบมูลนิธิแบบครบวงจร Single Source of Truth บริหารบัญชีผู้ใช้ สิทธิ์การเข้าถึง โครงสร้างองค์กร รูปแบบและประเภทความช่วยเหลือ และอัสนัฟจากจุดเดียว'}
            </p>
          </div>
        </div>

        {/* Tab Navigation Bar with Clear Functional Groupings (Group A & Group B) */}
        <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            {/* Group A: System Administration */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
                การบริหารระบบ:
              </span>
              {[
                { id: 'users', label: 'จัดการผู้ใช้งาน' },
                { id: 'roles', label: 'บทบาทและสิทธิ์' },
                { id: 'org', label: 'โครงสร้างองค์กร' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as AdminCenterTab)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-teal-800 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="h-4 w-px bg-slate-200 hidden lg:block" />

            {/* Group B: Master Data Configuration */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
                ข้อมูลพื้นฐาน:
              </span>
              {[
                { id: 'formats', label: 'รูปแบบการส่งมอบ' },
                { id: 'models', label: 'แผนการช่วยเหลือ' },
                { id: 'types', label: 'ประเภทความช่วยเหลือ' },
                { id: 'asnaf', label: 'หมวดหมู่อัสนัฟ' },
                { id: 'general', label: 'ตั้งค่าทั่วไป' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as AdminCenterTab)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-teal-800 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="h-4 w-px bg-slate-200 hidden lg:block" />

            {/* Support & Governance Tools */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
                กำกับดูแล:
              </span>
              {[
                { id: 'matrix', label: 'เมทริกซ์ 3 ระดับ', badge: 'เชื่อมโยง' },
                { id: 'backup', label: 'สำรองข้อมูล' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as AdminCenterTab)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-teal-800 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase ${
                          isActive ? 'bg-amber-400 text-teal-950' : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Render Active Tab Sub-view */}
      <div>
        {activeTab === 'users' && (
          <UserManagementView onNavigate={onNavigate} />
        )}

        {activeTab === 'roles' && (
          <RolesAndPermissionsTab />
        )}

        {activeTab === 'org' && (
          <BranchesAndDepartmentsView onNavigate={onNavigate} />
        )}

        {activeTab === 'matrix' && (
          <RelationshipMatrixTab />
        )}

        {activeTab === 'models' && (
          <AssistanceModelsTab onNavigateToTypes={navigateToTypesWithFilter} />
        )}

        {activeTab === 'types' && (
          <AssistanceTypesTab initialFilterCategory={selectedTypeModelFilter} />
        )}

        {activeTab === 'formats' && (
          <AssistanceFormatsTab />
        )}

        {activeTab === 'asnaf' && (
          <AsnafManagementTab 
            onNavigateToTypes={navigateToTypesWithFilter} 
            onNavigateToMatrix={() => setActiveTab('matrix')}
          />
        )}

        {activeTab === 'general' && (
          <GeneralSettingsTab />
        )}

        {activeTab === 'backup' && (
          <DatabaseBackupTab />
        )}
      </div>
    </div>
  );
}

