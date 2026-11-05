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
import { GeneralSettingsTab } from './tabs/GeneralSettingsTab';

export type AdminCenterTab = 
  | 'users' 
  | 'roles' 
  | 'org' 
  | 'models' 
  | 'types' 
  | 'asnaf' 
  | 'general';

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
    if (t === 'models' || t === 'assistance-models' || t === 'admin-models') return 'models';
    if (t === 'types' || t === 'assistance-types' || t === 'admin-types') return 'types';
    if (t === 'asnaf' || t === 'asnaf-categories' || t === 'admin-asnaf') return 'asnaf';
    if (t === 'settings' || t === 'general-settings' || t === 'general' || t === 'admin-settings' || t === 'backup') return 'general';
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
      case 'models':
        return { group: 'การตั้งค่าข้อมูลพื้นฐาน', title: 'รูปแบบการช่วยเหลือ (Assistance Models)' };
      case 'types':
        return { group: 'การตั้งค่าข้อมูลพื้นฐาน', title: 'ประเภทความช่วยเหลือ (Assistance Types)' };
      case 'asnaf':
        return { group: 'การตั้งค่าข้อมูลพื้นฐาน', title: 'หมวดหมู่อัสนัฟ (Asnaf Management)' };
      case 'general':
        return { group: 'การตั้งค่าข้อมูลพื้นฐาน', title: 'การตั้งค่าทั่วไป (General Settings)' };
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
          <span className="font-medium text-slate-600">การตั้งค่าและบริหารระบบ</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-teal-800">{group}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-900">{title}</span>
        </nav>

        {/* Title & Hub Overview */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-teal-800 uppercase tracking-wider mb-1">
              <Settings className="w-4 h-4 text-teal-700" />
              <span>Centralized Administration & Configuration Hub</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#0B2545] tracking-tight">
              การตั้งค่าและบริหารระบบ (System Administration & Configuration)
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              ศูนย์กลางควบคุมการตั้งค่าระบบมูลนิธิแบบครบวงจร Single Source of Truth บริหารบัญชีผู้ใช้ สิทธิ์การเข้าถึง โครงสร้างองค์กร รูปแบบและประเภทความช่วยเหลือ และอัสนัฟจากจุดเดียว
            </p>
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

        {activeTab === 'models' && (
          <AssistanceModelsTab onNavigateToTypes={navigateToTypesWithFilter} />
        )}

        {activeTab === 'types' && (
          <AssistanceTypesTab initialFilterCategory={selectedTypeModelFilter} />
        )}

        {activeTab === 'asnaf' && (
          <AsnafManagementTab onNavigateToTypes={navigateToTypesWithFilter} />
        )}

        {activeTab === 'general' && (
          <GeneralSettingsTab initialSubSection={initialTab === 'backup' ? 'backup' : 'org'} />
        )}
      </div>
    </div>
  );
}

