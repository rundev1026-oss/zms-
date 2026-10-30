-- TABLE: admin_expense_categories
CREATE TABLE admin_expense_categories (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      group_name TEXT DEFAULT 'ทั่วไป',
      budget_limit REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

-- TABLE: application_documents
CREATE TABLE application_documents (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      file_url TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      upload_date TEXT NOT NULL,
      verified_by_id TEXT,
      verified_by_name TEXT,
      verified_date TEXT,
      rejection_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, beneficiary_id TEXT, storage_provider TEXT DEFAULT 'local', storage_path TEXT, file_size INTEGER DEFAULT 0, mime_type TEXT, checksum TEXT, is_confidential INTEGER DEFAULT 1, uploaded_by_id TEXT, uploaded_by_name TEXT,
      FOREIGN KEY (application_id) REFERENCES assistance_applications (id) ON DELETE CASCADE
    );

-- TABLE: application_history
CREATE TABLE application_history (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      status TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      changed_by_id TEXT NOT NULL,
      changed_by_name TEXT NOT NULL,
      notes TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES assistance_applications (id) ON DELETE CASCADE
    );

-- TABLE: asnaf_allocation_history
CREATE TABLE asnaf_allocation_history (
      id TEXT PRIMARY KEY,
      fiscal_year TEXT NOT NULL,
      proportions_json TEXT NOT NULL,
      changed_by_id TEXT NOT NULL,
      changed_by_name TEXT NOT NULL,
      policy_ref TEXT NOT NULL,
      reason TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , old_proportions_json TEXT, effective_date TEXT, approved_by_id TEXT, approved_by_name TEXT, affected_items_json TEXT, action_type TEXT DEFAULT 'proportion_change');

-- TABLE: asnaf_allocations
CREATE TABLE asnaf_allocations (
      id TEXT PRIMARY KEY,
      fiscal_year TEXT NOT NULL,
      asnaf_code TEXT NOT NULL,
      asnaf_name TEXT NOT NULL,
      percentage REAL NOT NULL,
      target_amount REAL DEFAULT 0,
      allocated_amount REAL DEFAULT 0,
      disbursed_amount REAL DEFAULT 0,
      remaining_amount REAL DEFAULT 0,
      policy_ref TEXT,
      updated_by_id TEXT,
      updated_by_name TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , name_en TEXT, fund_account_id TEXT, description TEXT, committed_amount REAL DEFAULT 0, budget_adjustment REAL DEFAULT 0, effective_date TEXT DEFAULT '2026-10-01', is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0);

-- TABLE: assistance_applications
CREATE TABLE assistance_applications (
      id TEXT PRIMARY KEY,
      application_no TEXT UNIQUE NOT NULL,
      beneficiary_id TEXT NOT NULL,
      asnaf_category TEXT NOT NULL,
      requested_amount REAL NOT NULL,
      approved_amount REAL,
      disbursed_amount REAL,
      status TEXT DEFAULT 'draft',
      urgency_level TEXT DEFAULT 'normal',
      assigned_officer_id TEXT NOT NULL,
      assigned_officer_name TEXT NOT NULL,
      approved_by_id TEXT,
      approved_by_name TEXT,
      approved_date TEXT,
      approval_notes TEXT,
      disbursement_date TEXT,
      disbursed_by_id TEXT,
      disbursed_by_name TEXT,
      disbursement_ref TEXT,
      disbursement_proof_url TEXT,
      disbursement_notes TEXT,
      applied_date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, branch_id TEXT DEFAULT "br-hq", branch_name TEXT DEFAULT "สำนักงานใหญ่ กรุงเทพมหานคร", hardship_reasons TEXT, assistance_type TEXT DEFAULT "cash", assistance_type_details TEXT, necessity_details TEXT, evaluator_checklist TEXT, rejection_reason TEXT, member_id TEXT, registration_no TEXT, assistance_type_id TEXT, assistance_group TEXT DEFAULT "core", assistance_result_status TEXT DEFAULT 'not_started', assistance_outcome TEXT, actual_assistance_value REAL DEFAULT 0, execution_confirmed_at TEXT, execution_confirmed_by_id TEXT, execution_confirmed_by_name TEXT, installment_count INTEGER DEFAULT 1, current_installment INTEGER DEFAULT 1, refunded_amount REAL DEFAULT 0, is_refunded INTEGER DEFAULT 0, primary_group_code TEXT, specific_fund_id TEXT, specific_fund_code TEXT, specific_fund_name TEXT, approved_fund_id TEXT, approved_specific_fund_id TEXT, classification_snapshot TEXT, fiscal_year TEXT DEFAULT '2569',
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries (id) ON DELETE CASCADE
    );

-- TABLE: assistance_execution_records
CREATE TABLE assistance_execution_records (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      withdrawal_id TEXT,
      workflow_id TEXT,
      installment_no INTEGER DEFAULT 1,
      total_installments INTEGER DEFAULT 1,
      assistance_type TEXT NOT NULL,
      asnaf_category TEXT NOT NULL,
      execution_date TEXT NOT NULL,
      execution_time TEXT NOT NULL,
      execution_datetime TEXT NOT NULL,
      executor_id TEXT NOT NULL,
      executor_name TEXT NOT NULL,
      assistance_outcome TEXT NOT NULL,
      actual_disbursed_amount REAL NOT NULL DEFAULT 0,
      actual_assistance_value REAL NOT NULL DEFAULT 0,
      details TEXT,
      proof_url TEXT,
      proof_name TEXT,
      proof_size INTEGER,
      proof_type TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      is_confirmed INTEGER NOT NULL DEFAULT 0,
      confirmation_statement TEXT,
      confirmed_by_id TEXT,
      confirmed_by_name TEXT,
      confirmed_at TEXT,
      edit_reason TEXT,
      previous_values TEXT,
      cancellation_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, specific_fund_id TEXT, assistance_type_id TEXT,
      FOREIGN KEY (application_id) REFERENCES assistance_applications (id)
    );

-- TABLE: assistance_finance_discrepancies
CREATE TABLE assistance_finance_discrepancies (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      withdrawal_id TEXT,
      category TEXT NOT NULL,
      reported_by_id TEXT NOT NULL,
      reported_by_name TEXT NOT NULL,
      reported_at TEXT NOT NULL,
      expected_amount REAL,
      actual_amount REAL,
      notes TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_investigation',
      resolution_notes TEXT,
      resolved_by_id TEXT,
      resolved_by_name TEXT,
      resolved_at TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES assistance_applications(id)
    );

-- TABLE: assistance_followups
CREATE TABLE assistance_followups (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      followup_date TEXT NOT NULL,
      officer_id TEXT NOT NULL,
      officer_name TEXT NOT NULL,
      status_summary TEXT NOT NULL,
      is_living_improved INTEGER DEFAULT 0,
      notes TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES assistance_applications (id) ON DELETE CASCADE
    );

-- TABLE: assistance_refund_records
CREATE TABLE assistance_refund_records (
      id TEXT PRIMARY KEY,
      refund_no TEXT UNIQUE NOT NULL,
      application_id TEXT,
      withdrawal_id TEXT,
      workflow_id TEXT,
      refund_date TEXT NOT NULL,
      refund_time TEXT NOT NULL,
      refund_datetime TEXT NOT NULL,
      refund_amount REAL NOT NULL,
      refund_reason TEXT NOT NULL,
      returned_by_id TEXT NOT NULL,
      returned_by_name TEXT NOT NULL,
      received_by_id TEXT NOT NULL,
      received_by_name TEXT NOT NULL,
      target_bank_account_id TEXT,
      target_fund_id TEXT DEFAULT 'fund-1',
      proof_url TEXT,
      proof_name TEXT,
      proof_size INTEGER DEFAULT 0,
      proof_type TEXT DEFAULT 'application/pdf',
      status TEXT DEFAULT 'completed',
      cancellation_reason TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, specific_fund_id TEXT,
      FOREIGN KEY (application_id) REFERENCES assistance_applications (id)
    );

-- TABLE: assistance_types
CREATE TABLE assistance_types (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , type_group TEXT DEFAULT 'core', required_docs TEXT, order_index INTEGER DEFAULT 0, specific_fund_id TEXT, primary_group_code TEXT, conditions_text TEXT, default_max_amount REAL, updated_at DATETIME, deactivated_at TEXT, deactivated_by TEXT, deactivated_reason TEXT, assistance_format TEXT, default_min_amount REAL);

-- TABLE: audit_logs
CREATE TABLE audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      description TEXT NOT NULL,
      ip_address TEXT DEFAULT '127.0.0.1',
      old_values TEXT,
      new_values TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

-- TABLE: bank_accounts
CREATE TABLE bank_accounts (
      id TEXT PRIMARY KEY,
      account_name TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      branch_name TEXT,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      reconciled_balance REAL DEFAULT 0,
      last_reconciled_at TEXT,
      last_reconciled_by TEXT,
      status TEXT DEFAULT 'active',
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

-- TABLE: bank_reconciliations
CREATE TABLE bank_reconciliations (
      id TEXT PRIMARY KEY,
      bank_account_id TEXT NOT NULL,
      reconciliation_date TEXT NOT NULL,
      system_balance REAL NOT NULL,
      statement_balance REAL NOT NULL,
      difference REAL NOT NULL,
      status TEXT DEFAULT 'balanced',
      notes TEXT,
      proof_url TEXT,
      auditor_id TEXT NOT NULL,
      auditor_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bank_account_id) REFERENCES bank_accounts (id)
    );

-- TABLE: beneficiaries
CREATE TABLE beneficiaries (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      national_id TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      asnaf_category TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, title_prefix TEXT DEFAULT "นาย", birth_date TEXT, age INTEGER DEFAULT 0, occupation TEXT, marital_status TEXT DEFAULT "single", postcode TEXT, house_no TEXT, village_no TEXT, subdistrict TEXT, branch_id TEXT DEFAULT "br-hq", branch_name TEXT DEFAULT "สำนักงานใหญ่ กรุงเทพมหานคร", registration_no TEXT, registration_status TEXT DEFAULT "pending_verification", registered_date TEXT, surveyor_id TEXT, surveyor_name TEXT, qualification_date TEXT, qualification_notes TEXT, qualified_by_id TEXT, qualified_by_name TEXT, evaluator_checklist TEXT, disability_notes TEXT, illness_notes TEXT, living_limitations TEXT, hardship_reasons TEXT, member_id TEXT, latitude REAL, longitude REAL, residence_address TEXT, place_name TEXT, location_updated_at TEXT, location_updated_by TEXT, location_verification_status TEXT DEFAULT 'not_specified',
      FOREIGN KEY (household_id) REFERENCES households (id) ON DELETE CASCADE
    );

-- TABLE: beneficiary_assessments
CREATE TABLE beneficiary_assessments (
      id TEXT PRIMARY KEY,
      application_id TEXT UNIQUE NOT NULL,
      assessed_by_id TEXT NOT NULL,
      assessed_by_name TEXT NOT NULL,
      assessed_date TEXT NOT NULL,
      living_score INTEGER DEFAULT 0,
      housing_condition TEXT NOT NULL,
      housing_notes TEXT NOT NULL,
      debt_burden_summary TEXT NOT NULL,
      primary_hardship TEXT NOT NULL,
      officer_recommendation TEXT NOT NULL,
      recommended_amount REAL NOT NULL,
      recommended_fund_id TEXT NOT NULL,
      general_notes TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, recommended_specific_fund_id TEXT,
      FOREIGN KEY (application_id) REFERENCES assistance_applications (id) ON DELETE CASCADE
    );

-- TABLE: beneficiary_edit_history
CREATE TABLE beneficiary_edit_history (
      id TEXT PRIMARY KEY,
      beneficiary_id TEXT NOT NULL,
      edited_by_id TEXT NOT NULL,
      edited_by_name TEXT NOT NULL,
      edited_by_role TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      changes_summary TEXT,
      changes_detail TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries (id) ON DELETE CASCADE
    );

-- TABLE: beneficiary_registration_history
CREATE TABLE beneficiary_registration_history (
      id TEXT PRIMARY KEY,
      beneficiary_id TEXT NOT NULL,
      status TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      changed_by_id TEXT NOT NULL,
      changed_by_name TEXT NOT NULL,
      notes TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries (id) ON DELETE CASCADE
    );

-- TABLE: branches
CREATE TABLE branches (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      province TEXT NOT NULL,
      is_headquarters INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , name_en TEXT, branch_type TEXT DEFAULT 'regional_branch', parent_branch_id TEXT, address TEXT, subdistrict TEXT, district TEXT, postcode TEXT, phone TEXT, email TEXT, manager_user_id TEXT, manager_name TEXT, status TEXT DEFAULT 'active', deactivated_reason TEXT, created_by_id TEXT, created_by_name TEXT, updated_by_id TEXT, updated_by_name TEXT, updated_at DATETIME);

-- TABLE: campaigns
CREATE TABLE campaigns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      fund_id TEXT NOT NULL,
      target_amount REAL NOT NULL,
      raised_amount REAL DEFAULT 0,
      donor_count INTEGER DEFAULT 0,
      image_url TEXT,
      status TEXT DEFAULT 'active',
      start_date TEXT,
      end_date TEXT,
      is_featured INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fund_id) REFERENCES fund_accounts (id)
    );

-- TABLE: cash_flow_clearance_items
CREATE TABLE cash_flow_clearance_items (
      id TEXT PRIMARY KEY,
      withdrawal_id TEXT NOT NULL,
      workflow_id TEXT NOT NULL,
      expense_date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      receipt_url TEXT,
      receipt_name TEXT,
      receipt_size INTEGER,
      receipt_type TEXT,
      category_code TEXT,
      category_name TEXT,
      notes TEXT,
      status TEXT DEFAULT 'accepted',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (withdrawal_id) REFERENCES cash_flow_withdrawals (id),
      FOREIGN KEY (workflow_id) REFERENCES cash_flow_workflows (id)
    );

-- TABLE: cash_flow_disbursement_items
CREATE TABLE cash_flow_disbursement_items (
      id TEXT PRIMARY KEY,
      withdrawal_id TEXT NOT NULL,
      workflow_id TEXT NOT NULL,
      application_id TEXT NOT NULL,
      beneficiary_id TEXT NOT NULL,
      beneficiary_name TEXT NOT NULL,
      national_id TEXT NOT NULL,
      asnaf_category TEXT NOT NULL,
      assistance_type TEXT NOT NULL,
      area_info TEXT,
      approved_amount REAL NOT NULL,
      disbursed_amount_before REAL DEFAULT 0,
      this_disbursement_amount REAL NOT NULL,
      remaining_balance REAL NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, specific_fund_id TEXT,
      FOREIGN KEY (withdrawal_id) REFERENCES cash_flow_withdrawals (id),
      FOREIGN KEY (workflow_id) REFERENCES cash_flow_workflows (id),
      FOREIGN KEY (application_id) REFERENCES assistance_applications (id)
    );

-- TABLE: cash_flow_withdrawals
CREATE TABLE cash_flow_withdrawals (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      withdrawal_no TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL,
      withdrawal_datetime TEXT NOT NULL,
      withdrawer_id TEXT DEFAULT 'custodian-mukhlis',
      withdrawer_name TEXT DEFAULT 'นายมุกลิส มีระยะ',
      source_description TEXT,
      target_asnaf TEXT NOT NULL,
      target_fund_id TEXT,
      purpose TEXT NOT NULL,
      approver_id TEXT,
      approver_name TEXT,
      proof_url TEXT,
      proof_name TEXT,
      proof_size INTEGER,
      proof_type TEXT,
      notes TEXT,
      status TEXT DEFAULT 'disbursed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, voucher_type TEXT DEFAULT 'aid_disbursement', expense_category TEXT, expense_details TEXT, allowed_fund_id TEXT, deadline_date TEXT, clearance_status TEXT DEFAULT 'not_required', clearance_spent_amount REAL DEFAULT 0, clearance_returned_amount REAL DEFAULT 0, clearance_excess_amount REAL DEFAULT 0, clearance_date TEXT, clearance_proof_url TEXT, clearance_proof_name TEXT, clearance_proof_size INTEGER, clearance_proof_type TEXT, clearance_notes TEXT, cleared_by_id TEXT, cleared_by_name TEXT, requested_amount REAL, approved_amount REAL, source_fund_type TEXT, actual_received_amount REAL, clearance_return_date TEXT, clearance_overspent_reason TEXT, clearance_overspent_approved_by_id TEXT, clearance_overspent_approved_by_name TEXT, clearance_overspent_approved_at TEXT, handover_status TEXT DEFAULT 'pending', total_handed_over_amount REAL DEFAULT 0, remaining_handover_amount REAL, recipient_case_worker_name TEXT, recipient_case_worker_id TEXT, handover_notes TEXT, aid_refunded_amount REAL DEFAULT 0, target_specific_fund_id TEXT,
      FOREIGN KEY (workflow_id) REFERENCES cash_flow_workflows (id)
    );

-- TABLE: cash_flow_workflows
CREATE TABLE cash_flow_workflows (
      id TEXT PRIMARY KEY,
      workflow_no TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      step1_bank_account_id TEXT NOT NULL,
      step1_withdraw_amount REAL NOT NULL,
      step1_date TEXT NOT NULL,
      step1_operator_id TEXT NOT NULL,
      step1_operator_name TEXT NOT NULL,
      step1_approver_id TEXT,
      step1_approver_name TEXT,
      step1_proof_url TEXT,
      step1_notes TEXT,
      step1_status TEXT DEFAULT 'completed',
      step2_treasurer_id TEXT DEFAULT 'custodian-ruslan',
      step2_treasurer_name TEXT DEFAULT 'นายรุสลัน หะสาเมาะ',
      step2_deposit_amount REAL,
      step2_date TEXT,
      step2_ref_no TEXT,
      step2_proof_url TEXT,
      step2_status TEXT DEFAULT 'pending',
      step3_withdrawer_id TEXT DEFAULT 'custodian-mukhlis',
      step3_withdrawer_name TEXT DEFAULT 'นายมุกลิส มีระยะ',
      step3_withdraw_amount REAL,
      step3_date TEXT,
      step3_purpose TEXT,
      step3_target_asnaf TEXT,
      step3_target_fund_id TEXT,
      step3_approver_id TEXT,
      step3_approver_name TEXT,
      step3_status TEXT DEFAULT 'pending',
      step4_allocated_amount REAL DEFAULT 0,
      step4_distribution_summary TEXT,
      step4_status TEXT DEFAULT 'pending',
      step5_reconciled_amount REAL,
      step5_remaining_cash REAL DEFAULT 0,
      step5_auditor_id TEXT,
      step5_auditor_name TEXT,
      step5_closed_at TEXT,
      step5_notes TEXT,
      overall_status TEXT DEFAULT 'in_progress',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , step1_event_datetime TEXT, step1_proof_name TEXT, step1_proof_size INTEGER, step1_proof_type TEXT, step2_event_datetime TEXT, step2_proof_name TEXT, step2_proof_size INTEGER, step2_proof_type TEXT, step4_date TEXT, step4_event_datetime TEXT, step4_proof_url TEXT, step4_proof_name TEXT, step4_proof_size INTEGER, step4_proof_type TEXT, step5_event_datetime TEXT, step5_proof_url TEXT, step5_proof_name TEXT, step5_proof_size INTEGER, step5_proof_type TEXT, step1_ref_no TEXT, step2_handover_person_name TEXT, step2_mismatch_reason TEXT, step1_fund_type TEXT DEFAULT "zakat", step1_transfer_ref TEXT, step1_event_date TEXT, step1_event_time TEXT, step2_handover_person_id TEXT, step2_handover_datetime TEXT, step2_handover_amount REAL, step2_received_datetime TEXT, step2_mismatch_approved_by_id TEXT, step2_mismatch_approved_by_name TEXT, step2_mismatch_approved_at TEXT, step2_auditor_id TEXT, step2_auditor_name TEXT, step2_notes TEXT, step5_status TEXT DEFAULT "pending", step5_unallocated_amount REAL DEFAULT 0, step5_confirmed_aid_amount REAL DEFAULT 0, step5_confirmed_other_expense_amount REAL DEFAULT 0, step5_voucher_count INTEGER DEFAULT 0, step5_assistance_case_count INTEGER DEFAULT 0, step5_pending_items_count INTEGER DEFAULT 0, step5_missing_proof_count INTEGER DEFAULT 0, step5_discrepancy_amount REAL DEFAULT 0, step5_discrepancy_reason TEXT);

-- TABLE: departments
CREATE TABLE departments (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , name_en TEXT, branch_id TEXT DEFAULT 'br-hq', head_user_id TEXT, head_name TEXT, allowed_roles TEXT DEFAULT '["officer"]', status TEXT DEFAULT 'active', deactivated_reason TEXT, created_by_id TEXT, created_by_name TEXT, updated_by_id TEXT, updated_by_name TEXT, updated_at DATETIME);

-- TABLE: document_sequences
CREATE TABLE document_sequences (
      id TEXT PRIMARY KEY,
      document_type TEXT NOT NULL,
      fiscal_year TEXT NOT NULL,
      last_sequence INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(document_type, fiscal_year)
    );

-- TABLE: faqir_miskin_history
CREATE TABLE faqir_miskin_history (
      id TEXT PRIMARY KEY,
      fiscal_year TEXT NOT NULL,
      proportions_json TEXT NOT NULL,
      changed_by_id TEXT NOT NULL,
      changed_by_name TEXT NOT NULL,
      policy_ref TEXT NOT NULL,
      reason TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , primary_group_code TEXT DEFAULT 'faqir_miskin', old_proportions_json TEXT, effective_date TEXT, approved_by_id TEXT, approved_by_name TEXT, affected_items_json TEXT, action_type TEXT DEFAULT 'proportion_change');

-- TABLE: faqir_miskin_sub_funds
CREATE TABLE faqir_miskin_sub_funds (
      id TEXT PRIMARY KEY,
      fiscal_year TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      percentage REAL NOT NULL,
      target_amount REAL DEFAULT 0,
      allocated_amount REAL DEFAULT 0,
      disbursed_amount REAL DEFAULT 0,
      remaining_amount REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      updated_by_id TEXT,
      updated_by_name TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , fund_code TEXT, name_en TEXT, primary_group_code TEXT DEFAULT 'faqir_miskin', fund_account_id TEXT DEFAULT 'fund-1', parent_fund_id TEXT, fund_type TEXT DEFAULT 'specific', description TEXT, committed_amount REAL DEFAULT 0, budget_adjustment REAL DEFAULT 0, effective_date TEXT DEFAULT '2026-10-01', sort_order INTEGER DEFAULT 0, created_by_id TEXT DEFAULT 'u-1', created_by_name TEXT DEFAULT 'ผู้ดูแลระบบสูงสุด', created_at DATETIME, deactivated_at TEXT, deactivated_by_id TEXT, deactivated_by_name TEXT, deactivated_reason TEXT);

-- TABLE: finance_handover_records
CREATE TABLE finance_handover_records (
      id TEXT PRIMARY KEY,
      withdrawal_id TEXT NOT NULL,
      workflow_id TEXT NOT NULL,
      handover_no TEXT UNIQUE NOT NULL,
      handover_date TEXT NOT NULL,
      handover_time TEXT NOT NULL,
      handed_over_by_id TEXT NOT NULL,
      handed_over_by_name TEXT NOT NULL,
      received_by_id TEXT,
      received_by_name TEXT NOT NULL,
      received_by_position TEXT,
      amount REAL NOT NULL,
      handover_method TEXT NOT NULL DEFAULT 'cash',
      reference_no TEXT,
      notes TEXT,
      proof_url TEXT NOT NULL,
      proof_name TEXT NOT NULL,
      proof_size INTEGER DEFAULT 0,
      proof_type TEXT DEFAULT 'application/pdf',
      status TEXT NOT NULL DEFAULT 'fully_handed_over',
      cancellation_reason TEXT,
      recorded_by_id TEXT NOT NULL,
      recorded_by_name TEXT NOT NULL,
      confirmed_by_id TEXT NOT NULL,
      confirmed_by_name TEXT NOT NULL,
      confirmed_at TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (withdrawal_id) REFERENCES cash_flow_withdrawals(id)
    );

-- TABLE: financial_transactions
CREATE TABLE financial_transactions (
      id TEXT PRIMARY KEY,
      transaction_no TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      fund_id TEXT NOT NULL,
      fund_name TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payer_or_payee TEXT NOT NULL,
      reference_no TEXT NOT NULL,
      receipt_url TEXT,
      slip_url TEXT,
      status TEXT DEFAULT 'completed',
      recorded_by_id TEXT NOT NULL,
      recorded_by_name TEXT NOT NULL,
      verified_by_id TEXT,
      verified_by_name TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , reversal_ref_id TEXT, reversal_reason TEXT, reversed_at TEXT, reversed_by_id TEXT, reversed_by_name TEXT, bank_account_id TEXT, money_type TEXT DEFAULT "zakat", zakat_year TEXT DEFAULT "2569", asnaf_category TEXT, sub_fund_category TEXT, beneficiary_id TEXT, application_id TEXT, donor_name TEXT, is_anonymous INTEGER DEFAULT 0, usage_restriction TEXT, workflow_id TEXT, specific_fund_id TEXT, assistance_type_id TEXT);

-- TABLE: follow_up_attachments
CREATE TABLE follow_up_attachments (
        id TEXT PRIMARY KEY,
        record_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        caption TEXT,
        uploaded_by_id TEXT,
        uploaded_by_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (record_id) REFERENCES follow_up_records (id) ON DELETE CASCADE
      );

-- TABLE: follow_up_audit_logs
CREATE TABLE follow_up_audit_logs (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        action TEXT NOT NULL,
        old_values TEXT,
        new_values TEXT,
        actor_id TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES follow_up_plans (id) ON DELETE CASCADE
      );

-- TABLE: follow_up_plans
CREATE TABLE follow_up_plans (
        id TEXT PRIMARY KEY,
        assistance_record_id TEXT NOT NULL,
        beneficiary_id TEXT NOT NULL,
        assistance_type TEXT NOT NULL,
        requires_followup INTEGER DEFAULT 1,
        opt_out_reason TEXT,
        min_visits INTEGER NOT NULL DEFAULT 1,
        completed_visits INTEGER DEFAULT 0,
        remaining_visits INTEGER DEFAULT 0,
        status TEXT DEFAULT 'not_started',
        next_followup_date TEXT,
        assigned_officer_id TEXT,
        assigned_officer_name TEXT,
        branch_id TEXT,
        branch_name TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assistance_record_id) REFERENCES assistance_applications (id) ON DELETE CASCADE,
        FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries (id) ON DELETE CASCADE
      );

-- TABLE: follow_up_records
CREATE TABLE follow_up_records (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        application_id TEXT NOT NULL,
        beneficiary_id TEXT NOT NULL,
        visit_number INTEGER NOT NULL,
        followup_date TEXT NOT NULL,
        visit_format TEXT NOT NULL DEFAULT 'field_visit',
        location TEXT,
        inspector_id TEXT NOT NULL,
        inspector_name TEXT NOT NULL,
        inspection_details TEXT NOT NULL,
        visit_result TEXT NOT NULL,
        progress_assessment TEXT NOT NULL,
        problems_and_obstacles TEXT,
        additional_support_needed TEXT,
        officer_recommendation TEXT,
        next_appointment_date TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES follow_up_plans (id) ON DELETE CASCADE,
        FOREIGN KEY (application_id) REFERENCES assistance_applications (id) ON DELETE CASCADE,
        FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries (id) ON DELETE CASCADE
      );

-- TABLE: fund_accounts
CREATE TABLE fund_accounts (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      total_received REAL DEFAULT 0,
      committed_amount REAL DEFAULT 0,
      disbursed_amount REAL DEFAULT 0,
      available_amount REAL DEFAULT 0,
      target_goal REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , name_en TEXT, primary_asnaf_code TEXT, is_active INTEGER DEFAULT 1, effective_date TEXT DEFAULT '2026-10-01', deactivated_at TEXT, deactivated_by TEXT, deactivated_reason TEXT);

-- TABLE: fund_budget_adjustments
CREATE TABLE fund_budget_adjustments (
      id TEXT PRIMARY KEY,
      fiscal_year TEXT NOT NULL,
      target_level TEXT NOT NULL DEFAULT 'specific',
      primary_group_code TEXT NOT NULL,
      specific_fund_id TEXT,
      fund_account_id TEXT,
      adjustment_type TEXT NOT NULL,
      amount REAL NOT NULL,
      effective_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      policy_ref TEXT,
      status TEXT NOT NULL DEFAULT 'approved',
      requested_by_id TEXT NOT NULL,
      requested_by_name TEXT NOT NULL,
      approved_by_id TEXT,
      approved_by_name TEXT,
      approved_at TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

-- TABLE: household_members
CREATE TABLE household_members (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      relation TEXT NOT NULL,
      age INTEGER NOT NULL,
      occupation TEXT NOT NULL,
      monthly_income REAL DEFAULT 0,
      health_status TEXT DEFAULT 'healthy',
      health_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, education_status TEXT, notes TEXT,
      FOREIGN KEY (household_id) REFERENCES households (id) ON DELETE CASCADE
    );

-- TABLE: households
CREATE TABLE households (
      id TEXT PRIMARY KEY,
      household_no TEXT UNIQUE NOT NULL,
      address TEXT NOT NULL,
      province TEXT NOT NULL,
      district TEXT NOT NULL,
      subdistrict TEXT,
      community TEXT NOT NULL,
      housing_condition TEXT,
      housing_notes TEXT,
      living_score INTEGER DEFAULT 0,
      monthly_income REAL DEFAULT 0,
      monthly_expense REAL DEFAULT 0,
      debt_amount REAL DEFAULT 0,
      debt_purpose TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , housing_type TEXT DEFAULT "own", land_title_type TEXT DEFAULT "title_deed", land_title_notes TEXT, income_breakdown TEXT, expense_breakdown TEXT, past_assistance TEXT, family_situation_summary TEXT, urgent_needs TEXT, dependent_burdens TEXT, coordinator_info TEXT, certifier_info TEXT, latitude REAL, longitude REAL, residence_address TEXT, place_name TEXT, location_updated_at TEXT, location_updated_by TEXT, location_verification_status TEXT DEFAULT 'not_specified');

-- TABLE: password_reset_tokens
CREATE TABLE password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      used_at TEXT,
      created_ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

-- TABLE: users
CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      role_title_th TEXT NOT NULL,
      phone TEXT NOT NULL,
      branch TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      last_login TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , password_hash TEXT, salt TEXT, session_token TEXT, session_expires_at TEXT, first_name TEXT, last_name TEXT, branch_id TEXT, department_id TEXT, failed_login_attempts INTEGER DEFAULT 0, locked_until TEXT, email_verified INTEGER DEFAULT 0, phone_verified INTEGER DEFAULT 0, pdpa_consent_date TEXT, pdpa_consent_version TEXT DEFAULT 'v2569.1', notification_email INTEGER DEFAULT 1, notification_sms INTEGER DEFAULT 0, notification_app INTEGER DEFAULT 1, password_setup_status TEXT DEFAULT 'pending_setup', national_id TEXT, beneficiary_id TEXT);

-- TABLE: workflow_attachments
CREATE TABLE workflow_attachments (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      withdrawal_id TEXT,
      step_number INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      uploaded_by_id TEXT NOT NULL,
      uploaded_by_name TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (workflow_id) REFERENCES cash_flow_workflows (id)
    );

-- TABLE: zakat_formula_versions
CREATE TABLE zakat_formula_versions (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      category TEXT NOT NULL,
      category_name_th TEXT NOT NULL,
      effective_date TEXT NOT NULL,
      nisab_standard TEXT NOT NULL,
      nisab_value_thb REAL NOT NULL,
      rate_percentage REAL NOT NULL,
      approved_by TEXT NOT NULL,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

