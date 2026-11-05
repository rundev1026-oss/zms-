'use client';

import React from 'react';
import { AssistanceRequestWizardModal } from './AssistanceRequestWizardModal';
import { AsnafAllocation } from '@/types';

export interface AssistanceRequestFormModalProps {
  isOpen: boolean;
  initialBeneficiaryId?: string;
  eligiblePrimaryGroups?: AsnafAllocation[];
  onClose: () => void;
  onNavigate: (view: string) => void;
  onOpenRequestDetail?: (applicationId: string, rawApp?: any) => void;
  onOpenMemberDetail?: (
    beneficiaryId: string,
    startEdit?: boolean,
    targetSection?: 'member_info' | 'requests'
  ) => void;
}

/**
 * AssistanceRequestFormModal delegates cleanly to the new 3-Step AssistanceRequestWizardModal,
 * bypassing the National ID check step and opening directly on Step 1 (ประเภทความช่วยเหลือ)
 * with the selected beneficiary's data pre-populated.
 */
export function AssistanceRequestFormModal({
  isOpen,
  initialBeneficiaryId,
  onClose,
  onNavigate,
  onOpenRequestDetail,
}: AssistanceRequestFormModalProps) {
  if (!isOpen) return null;

  return (
    <AssistanceRequestWizardModal
      isOpen={isOpen}
      beneficiaryId={initialBeneficiaryId}
      onClose={onClose}
      onNavigate={onNavigate}
      onOpenRequestDetail={onOpenRequestDetail}
    />
  );
}

export { AssistanceRequestWizardModal };
