import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/components/views/BeneficiaryRegistryView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '{/* 4. Details & 10 Sections Modal */}';
const endMarker = '{/* 5. Status Transition Dialog */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found!', { startIndex, endIndex });
  process.exit(1);
}

const replacementModal = `{/* 4. Details & 6 Main Sections View Modal */}
      {selectedRegistry && !isStatusDialogOpen && !isAssistanceDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-hidden">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden">
            {/* Modal Header (Compliant with Section 7 Requirements) */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0b2545] via-[#103463] to-[#133e6f] text-white flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0 shadow-sm">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-semibold mb-1">
                  <span className="font-mono bg-white/10 px-2 py-0.5 rounded-md border border-white/10">รหัสทะเบียน: {selectedRegistry.registrationNo}</span>
                  <span>•</span>
                  <span>ขึ้นทะเบียน: {selectedRegistry.registeredDate ? new Date(selectedRegistry.registeredDate).toLocaleDateString('th-TH') : '-'}</span>
                  <span>•</span>
                  <span className="text-slate-200">ผู้รับผิดชอบ: {selectedRegistry.surveyOfficer || selectedRegistry.branchName || 'เจ้าหน้าที่ฝ่ายสงเคราะห์'}</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                    {selectedRegistry.titlePrefix} {selectedRegistry.fullName}
                  </h2>
                  <span className={\`px-2.5 py-0.5 rounded-full text-xs font-bold border \${
                    REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.bg || 'bg-slate-100'
                  } \${
                    REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.color || 'text-slate-800'
                  } \${
                    REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.border || 'border-slate-300'
                  }\`}>
                    {REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.label || selectedRegistry.registrationStatus}
                  </span>
                </div>

                <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2 mt-1.5">
                  <span>บัตร ปชช: {selectedRegistry.nationalIdMasked}</span>
                  <span>•</span>
                  <span>โทร: {selectedRegistry.phone || '-'}</span>
                  <span>•</span>
                  <span>{selectedRegistry.community || selectedRegistry.subdistrict}, {selectedRegistry.district}, {selectedRegistry.province}</span>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {!isEditing ? (
                  <>
                    {/* ปุ่มแก้ไขข้อมูล */}
                    {canEditRegistry(selectedRegistry) && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(activeMainSection)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                        title="แก้ไขข้อมูลทะเบียนรายบุคคล"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>แก้ไขข้อมูล</span>
                      </button>
                    )}

                    {/* ปรับสถานะทะเบียน */}
                    <button
                      type="button"
                      onClick={() => handleOpenStatusDialog(selectedRegistry)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-xl text-xs transition-colors shadow-sm"
                      title="ปรับสถานะทะเบียน"
                    >
                      <FileCheck2 className="w-3.5 h-3.5 text-slate-900" />
                      <span className="hidden sm:inline">ปรับสถานะ</span>
                    </button>

                    {/* ดูประวัติการแก้ไข */}
                    <button
                      type="button"
                      onClick={() => handleOpenHistoryModal(selectedRegistry.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold transition-colors border border-white/10"
                      title="ดูประวัติการแก้ไขข้อมูลรายฟิลด์ (Audit Trail)"
                    >
                      <History className="w-3.5 h-3.5 text-amber-300" />
                      <span className="hidden md:inline">ประวัติแก้ไข</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl text-xs transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>ยกเลิก</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs transition-colors shadow-md disabled:opacity-50"
                    >
                      {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
                    </button>
                  </>
                )}

                {/* ปุ่มกลับหน้ารายการ */}
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      if (confirm('คุณกำลังแก้ไขข้อมูลอยู่ ต้องการกลับหน้ารายการโดยไม่บันทึกหรือไม่?')) {
                        setIsEditing(false);
                        setSelectedRegistry(null);
                      }
                    } else {
                      setSelectedRegistry(null);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition-colors border border-white/15 ml-1"
                  title="กลับหน้ารายการทะเบียน"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>กลับหน้ารายการ</span>
                </button>
              </div>
            </div>

            {/* Mobile Navigation Dropdown (< md) - Optimised for iPhone 15 393 × 852 px */}
            <div className="md:hidden p-2.5 bg-slate-100 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 shrink-0">หมวดข้อมูล:</span>
                <select
                  value={activeMainSection}
                  onChange={(e) => setActiveMainSection(e.target.value as RegistryMainSection)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-[#0b2545]"
                >
                  {MAIN_SECTIONS.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 6-Section Navigation Tabs Bar (Desktop & Touch-scrollable) */}
            <div className="border-b border-slate-200 bg-slate-50 px-3 sm:px-4 flex items-center gap-1 overflow-x-auto text-xs font-semibold shrink-0 no-scrollbar touch-scroll">
              {MAIN_SECTIONS.map((sec) => {
                const Icon = sec.icon;
                const isActive = activeMainSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveMainSection(sec.id as RegistryMainSection)}
                    className={\`flex items-center gap-2 py-3 px-3.5 border-b-2 font-bold whitespace-nowrap transition-all text-xs \${
                      isActive
                        ? 'border-emerald-600 text-emerald-800 bg-emerald-50/70 shadow-2xs'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }\`}
                  >
                    <Icon className={\`w-4 h-4 \${isActive ? 'text-emerald-700' : 'text-slate-400'}\`} />
                    <span>{sec.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body Container with 6 Section Components */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60">
              {/* Section 1: ส่วนข้อมูลส่วนบุคคล (5 หมวด) */}
              {activeMainSection === 'personal' && (
                <PersonalSection
                  registry={selectedRegistry}
                  isEditing={isEditing}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  canEdit={canEditRegistry(selectedRegistry)}
                  onStartEdit={(subSec) => handleStartEdit('personal', subSec)}
                  activeSubTab={activePersonalSubSection}
                  setActiveSubTab={setActivePersonalSubSection}
                  asnafLabels={ASNAF_CATEGORY_LABELS}
                  canViewUnmaskedId={['super_admin', 'approver', 'officer'].includes(currentUser.role)}
                />
              )}

              {/* Section 2: ส่วนพิกัดที่อยู่อาศัยและแผนที่ */}
              {activeMainSection === 'location' && (
                <LocationSection
                  registry={selectedRegistry}
                  canEdit={canEditRegistry(selectedRegistry)}
                  onSaveLocationDirectly={handleSaveLocationDirectly}
                  isSavingLocation={isSavingLocationDirectly}
                />
              )}

              {/* Section 3: ส่วนผู้ประสานงานและผู้รับรอง */}
              {activeMainSection === 'coordinator' && (
                <CoordinatorSection
                  registry={selectedRegistry}
                  isEditing={isEditing}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  canEdit={canEditRegistry(selectedRegistry)}
                  onStartEdit={() => handleStartEdit('coordinator')}
                />
              )}

              {/* Section 4: ส่วนเอกสารแนบ */}
              {activeMainSection === 'documents' && (
                <DocumentsSection
                  registry={selectedRegistry}
                  canEdit={canEditRegistry(selectedRegistry)}
                  onRefreshRegistry={async () => {
                    const res = await fetch(\`/api/registry/\${selectedRegistry.id}\`);
                    const json = await res.json();
                    if (json.success && json.data) {
                      setSelectedRegistry(json.data);
                    }
                  }}
                  onDocumentsUploaded={async (newDocs) => {
                    const res = await fetch(\`/api/registry/\${selectedRegistry.id}\`);
                    const json = await res.json();
                    if (json.success && json.data) {
                      setSelectedRegistry(json.data);
                    }
                  }}
                />
              )}

              {/* Section 5: ส่วนประวัติการช่วยเหลือ */}
              {activeMainSection === 'assistance_history' && (
                <AssistanceHistorySection
                  registry={selectedRegistry}
                  applications={applications}
                  onOpenReceiptModal={(app) => setSelectedAidForReceipt(app)}
                  onOpenNewAssistanceDialog={() => handleOpenAssistanceDialog(selectedRegistry)}
                  canEdit={canEditRegistry(selectedRegistry)}
                />
              )}

              {/* Section 6: ส่วนสถานะ */}
              {activeMainSection === 'status' && (
                <StatusSection
                  registry={selectedRegistry}
                  statusLabels={REGISTRATION_STATUS_LABELS}
                  canEdit={canEditRegistry(selectedRegistry)}
                  onOpenStatusDialog={() => handleOpenStatusDialog(selectedRegistry)}
                  onOpenHistoryModal={() => handleOpenHistoryModal(selectedRegistry.id)}
                  onSaveChecklist={handleSaveChecklist}
                  isSavingChecklist={isSavingChecklist}
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              {!isEditing ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">ส่วนข้อมูลปัจจุบัน:</span>
                    <span className="font-bold text-slate-800">
                      {MAIN_SECTIONS.find((s) => s.id === activeMainSection)?.label}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">สถานะ:</span>
                    <span className={\`px-2 py-0.5 rounded-full font-bold text-[11px] border \${
                      REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.bg || 'bg-slate-100'
                    } \${
                      REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.color || 'text-slate-700'
                    } \${
                      REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.border || 'border-slate-300'
                    }\`}>
                      {REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.label || selectedRegistry.registrationStatus}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* ปุ่มแก้ไขข้อมูลในส่วนปัจจุบัน */}
                    {canEditRegistry(selectedRegistry) && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(activeMainSection)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>แก้ไขข้อมูลส่วนนี้</span>
                      </button>
                    )}

                    {/* ปุ่มยื่นคำร้องขอความช่วยเหลือ */}
                    <button
                      type="button"
                      onClick={() => handleOpenAssistanceDialog(selectedRegistry)}
                      className="px-4 py-2 bg-[#0b2545] hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <FilePlus2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ยื่นคำร้องขอความช่วยเหลือ</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={editForm.editNotes || ''}
                      onChange={(e) => setEditForm({ ...editForm, editNotes: e.target.value })}
                      placeholder="ระบุเหตุผล/หมายเหตุการแก้ไข (เช่น: ปรับปรุงพิกัดบ้านจริงจากการลงพื้นที่, อัปเดตรายได้)..."
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs placeholder:text-slate-400"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold transition-colors"
                    >
                      ยกเลิกการแก้ไข
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors shadow-md disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isSaving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      `;

content = content.slice(0, startIndex) + replacementModal + content.slice(endIndex);

// Add ReceiptPreviewModal before the final closing </div>
const historyModalMarker = '</RegistryEditHistoryModal>';
const historyModalIndex = content.indexOf(historyModalMarker);

if (historyModalIndex === -1) {
  // Try self-closing tag
  const selfClosingMarker = '/>\n    </div>\n  );';
  const pos = content.lastIndexOf(selfClosingMarker);
  if (pos !== -1) {
    const receiptModalSnippet = `\n      {/* 8. Printable Receipt & Disbursement Voucher Modal */}
      <ReceiptPreviewModal
        isOpen={Boolean(selectedAidForReceipt)}
        onClose={() => setSelectedAidForReceipt(null)}
        application={selectedAidForReceipt}
        beneficiaryName={selectedRegistry?.fullName}
        registrationNo={selectedRegistry?.registrationNo}
      />\n`;
    content = content.slice(0, pos + 2) + receiptModalSnippet + content.slice(pos + 2);
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched BeneficiaryRegistryView.tsx!');
