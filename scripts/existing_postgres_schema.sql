--
-- PostgreSQL database dump
--

\restrict aPHcjTqCbTUZ9cAiMAOEPOURdE3dego423DfHRGfF0QSkECbAaTkyzIhZg4nrN4

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: zms
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO zms;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: zms
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ApprovalStatus; Type: TYPE; Schema: public; Owner: zms
--

CREATE TYPE public."ApprovalStatus" AS ENUM (
    'NOT_SUBMITTED',
    'PENDING',
    'APPROVED',
    'REJECTED',
    'RETURNED'
);


ALTER TYPE public."ApprovalStatus" OWNER TO zms;

--
-- Name: AssistanceStatus; Type: TYPE; Schema: public; Owner: zms
--

CREATE TYPE public."AssistanceStatus" AS ENUM (
    'NONE',
    'IN_PROGRESS',
    'DELIVERED',
    'FOLLOW_UP',
    'COMPLETED'
);


ALTER TYPE public."AssistanceStatus" OWNER TO zms;

--
-- Name: BeneficiaryStatus; Type: TYPE; Schema: public; Owner: zms
--

CREATE TYPE public."BeneficiaryStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'DOC_REVIEW',
    'ELIGIBILITY',
    'PENDING_CERT',
    'REGISTERED',
    'RETURNED',
    'REJECTED',
    'SUSPENDED'
);


ALTER TYPE public."BeneficiaryStatus" OWNER TO zms;

--
-- Name: BudgetEntryType; Type: TYPE; Schema: public; Owner: zms
--

CREATE TYPE public."BudgetEntryType" AS ENUM (
    'ALLOCATE',
    'COMMIT',
    'RELEASE_COMMIT',
    'SPEND',
    'REVERSE_SPEND',
    'ADJUST_IN',
    'ADJUST_OUT'
);


ALTER TYPE public."BudgetEntryType" OWNER TO zms;

--
-- Name: CashAccountKind; Type: TYPE; Schema: public; Owner: zms
--

CREATE TYPE public."CashAccountKind" AS ENUM (
    'TREASURER',
    'OFFICER',
    'IN_TRANSIT',
    'SAFE'
);


ALTER TYPE public."CashAccountKind" OWNER TO zms;

--
-- Name: FundTypeCode; Type: TYPE; Schema: public; Owner: zms
--

CREATE TYPE public."FundTypeCode" AS ENUM (
    'ZAKAT',
    'SADAQAH',
    'GENERAL',
    'ADMIN',
    'RESTRICTED'
);


ALTER TYPE public."FundTypeCode" OWNER TO zms;

--
-- Name: LedgerAccountType; Type: TYPE; Schema: public; Owner: zms
--

CREATE TYPE public."LedgerAccountType" AS ENUM (
    'ASSET',
    'LIABILITY',
    'NET_ASSET',
    'INCOME',
    'EXPENSE'
);


ALTER TYPE public."LedgerAccountType" OWNER TO zms;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: zms
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'NONE',
    'CREATED',
    'PENDING',
    'PENDING_VERIFICATION',
    'CONFIRMED',
    'PARTIAL',
    'PAID',
    'FAILED',
    'EXPIRED',
    'CANCELLED',
    'REFUNDED'
);


ALTER TYPE public."PaymentStatus" OWNER TO zms;

--
-- Name: RequestStatus; Type: TYPE; Schema: public; Owner: zms
--

CREATE TYPE public."RequestStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'RECEIVED',
    'DOC_REVIEW',
    'ASSESSMENT',
    'CLASSIFIED',
    'IN_APPROVAL',
    'IN_ASSISTANCE',
    'FOLLOW_UP',
    'CLOSED',
    'REJECTED'
);


ALTER TYPE public."RequestStatus" OWNER TO zms;

--
-- Name: ScopeType; Type: TYPE; Schema: public; Owner: zms
--

CREATE TYPE public."ScopeType" AS ENUM (
    'OWN',
    'DEPARTMENT',
    'BRANCH',
    'ALL'
);


ALTER TYPE public."ScopeType" OWNER TO zms;

--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: zms
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'LOCKED'
);


ALTER TYPE public."UserStatus" OWNER TO zms;

--
-- Name: UserType; Type: TYPE; Schema: public; Owner: zms
--

CREATE TYPE public."UserType" AS ENUM (
    'PUBLIC',
    'STAFF'
);


ALTER TYPE public."UserType" OWNER TO zms;

--
-- Name: ZakatRuleStatus; Type: TYPE; Schema: public; Owner: zms
--

CREATE TYPE public."ZakatRuleStatus" AS ENUM (
    'DRAFT',
    'IN_REVIEW',
    'APPROVED',
    'ACTIVE',
    'RETIRED'
);


ALTER TYPE public."ZakatRuleStatus" OWNER TO zms;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_balances; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.account_balances (
    id uuid NOT NULL,
    balance_key character varying(150) NOT NULL,
    account_id uuid NOT NULL,
    fund_type_id uuid NOT NULL,
    bank_account_id uuid,
    cash_account_id uuid,
    balance numeric(18,2) DEFAULT 0 NOT NULL,
    last_line_id bigint,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.account_balances OWNER TO zms;

--
-- Name: approval_limits; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.approval_limits (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    doc_type character varying(50) NOT NULL,
    max_amount numeric(18,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.approval_limits OWNER TO zms;

--
-- Name: asnaf; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.asnaf (
    id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name_th character varying(100) NOT NULL,
    name_ar character varying(100),
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.asnaf OWNER TO zms;

--
-- Name: assistance_approvals; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.assistance_approvals (
    id uuid NOT NULL,
    request_id uuid NOT NULL,
    step_no integer DEFAULT 1 NOT NULL,
    approver_id uuid NOT NULL,
    decision character varying(30) NOT NULL,
    approved_amount numeric(18,2),
    reason text,
    decided_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.assistance_approvals OWNER TO zms;

--
-- Name: assistance_assessments; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.assistance_assessments (
    id uuid NOT NULL,
    request_id uuid NOT NULL,
    assessor_id uuid NOT NULL,
    visit_date date NOT NULL,
    criteria_scores jsonb NOT NULL,
    recommended_amount numeric(18,2) NOT NULL,
    findings text NOT NULL,
    result character varying(50) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.assistance_assessments OWNER TO zms;

--
-- Name: assistance_followups; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.assistance_followups (
    id uuid NOT NULL,
    assistance_record_id uuid NOT NULL,
    due_date date NOT NULL,
    done_date date,
    officer_id uuid,
    outcome text,
    notes text,
    status character varying(30) DEFAULT 'SCHEDULED'::character varying NOT NULL
);


ALTER TABLE public.assistance_followups OWNER TO zms;

--
-- Name: assistance_records; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.assistance_records (
    id uuid NOT NULL,
    request_id uuid NOT NULL,
    disbursement_payment_id uuid,
    delivery_type character varying(50) NOT NULL,
    value numeric(18,2) NOT NULL,
    delivered_at date NOT NULL,
    delivered_by uuid NOT NULL,
    notes text,
    status character varying(50) DEFAULT 'DELIVERED'::character varying NOT NULL
);


ALTER TABLE public.assistance_records OWNER TO zms;

--
-- Name: assistance_requests; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.assistance_requests (
    id uuid NOT NULL,
    request_no character varying(50) NOT NULL,
    beneficiary_id uuid NOT NULL,
    submitted_by uuid NOT NULL,
    branch_id uuid NOT NULL,
    asnaf_id uuid,
    assistance_type_id uuid NOT NULL,
    fund_type_id uuid,
    sub_fund_id uuid,
    need_description text NOT NULL,
    requested_amount numeric(18,2) NOT NULL,
    approved_amount numeric(18,2),
    assigned_officer_id uuid,
    request_status public."RequestStatus" DEFAULT 'SUBMITTED'::public."RequestStatus" NOT NULL,
    approval_status public."ApprovalStatus" DEFAULT 'NOT_SUBMITTED'::public."ApprovalStatus" NOT NULL,
    payment_status public."PaymentStatus" DEFAULT 'NONE'::public."PaymentStatus" NOT NULL,
    assistance_status public."AssistanceStatus" DEFAULT 'NONE'::public."AssistanceStatus" NOT NULL,
    submitted_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by uuid,
    updated_at timestamp(3) without time zone NOT NULL,
    updated_by uuid
);


ALTER TABLE public.assistance_requests OWNER TO zms;

--
-- Name: assistance_type_rules; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.assistance_type_rules (
    id uuid NOT NULL,
    assistance_type_id uuid NOT NULL,
    asnaf_id uuid NOT NULL,
    fund_type_id uuid NOT NULL,
    sub_fund_id uuid
);


ALTER TABLE public.assistance_type_rules OWNER TO zms;

--
-- Name: assistance_types; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.assistance_types (
    id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    is_recurring boolean DEFAULT false NOT NULL,
    max_amount numeric(18,2),
    status character varying(30) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.assistance_types OWNER TO zms;

--
-- Name: attachments; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.attachments (
    id uuid NOT NULL,
    object_key character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    mime_type character varying(100) NOT NULL,
    size_bytes bigint NOT NULL,
    sha256 character varying(64) NOT NULL,
    scan_status character varying(30) DEFAULT 'CLEAN'::character varying NOT NULL,
    uploaded_by uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.attachments OWNER TO zms;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    module character varying(100) NOT NULL,
    record_type character varying(100) NOT NULL,
    record_id character varying(100),
    result character varying(20) NOT NULL,
    ip character varying(50),
    user_agent text,
    request_id character varying(100),
    diff jsonb,
    prev_hash character varying(64),
    hash character varying(64),
    occurred_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO zms;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: zms
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO zms;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zms
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.bank_accounts (
    id uuid NOT NULL,
    branch_id uuid NOT NULL,
    bank_code character varying(20) NOT NULL,
    account_no_enc bytea NOT NULL,
    account_no_last4 character varying(10) NOT NULL,
    account_name character varying(150) NOT NULL,
    status character varying(30) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.bank_accounts OWNER TO zms;

--
-- Name: bank_statement_lines; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.bank_statement_lines (
    id uuid NOT NULL,
    bank_account_id uuid NOT NULL,
    txn_date date NOT NULL,
    amount numeric(18,2) NOT NULL,
    description text NOT NULL,
    match_status character varying(30) DEFAULT 'UNMATCHED'::character varying NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.bank_statement_lines OWNER TO zms;

--
-- Name: bank_withdrawals; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.bank_withdrawals (
    id uuid NOT NULL,
    withdrawal_no character varying(50) NOT NULL,
    bank_account_id uuid NOT NULL,
    fund_type_id uuid NOT NULL,
    amount numeric(18,2) NOT NULL,
    withdrawn_by uuid NOT NULL,
    approved_by uuid,
    status character varying(30) DEFAULT 'REQUESTED'::character varying NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.bank_withdrawals OWNER TO zms;

--
-- Name: beneficiaries; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.beneficiaries (
    id uuid NOT NULL,
    beneficiary_no character varying(50) NOT NULL,
    user_id uuid,
    branch_id uuid NOT NULL,
    title character varying(50) NOT NULL,
    first_name character varying(150) NOT NULL,
    last_name character varying(150) NOT NULL,
    national_id_enc bytea NOT NULL,
    national_id_hash character varying(64) NOT NULL,
    birth_date date NOT NULL,
    phone_enc bytea,
    marital_status character varying(50),
    address_line text NOT NULL,
    subdistrict_id integer NOT NULL,
    postal_code character varying(10) NOT NULL,
    housing_type character varying(100),
    housing_condition character varying(100),
    living_condition text,
    urgency_level character varying(50),
    other_agency_support text,
    status public."BeneficiaryStatus" DEFAULT 'DRAFT'::public."BeneficiaryStatus" NOT NULL,
    next_review_date date,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by uuid,
    updated_at timestamp(3) without time zone NOT NULL,
    updated_by uuid
);


ALTER TABLE public.beneficiaries OWNER TO zms;

--
-- Name: beneficiary_debts; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.beneficiary_debts (
    id uuid NOT NULL,
    beneficiary_id uuid NOT NULL,
    creditor_type character varying(100) NOT NULL,
    outstanding numeric(18,2) DEFAULT 0 NOT NULL,
    monthly_payment numeric(18,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.beneficiary_debts OWNER TO zms;

--
-- Name: beneficiary_documents; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.beneficiary_documents (
    id uuid NOT NULL,
    beneficiary_id uuid NOT NULL,
    document_type_id uuid NOT NULL,
    attachment_id uuid NOT NULL,
    review_status character varying(30) DEFAULT 'PENDING'::character varying NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp(3) without time zone,
    notes text
);


ALTER TABLE public.beneficiary_documents OWNER TO zms;

--
-- Name: beneficiary_financials; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.beneficiary_financials (
    id uuid NOT NULL,
    beneficiary_id uuid NOT NULL,
    regular_income numeric(18,2) DEFAULT 0 NOT NULL,
    irregular_income numeric(18,2) DEFAULT 0 NOT NULL,
    household_expense numeric(18,2) DEFAULT 0 NOT NULL,
    dependency_burden numeric(18,2) DEFAULT 0 NOT NULL,
    as_of_date date NOT NULL
);


ALTER TABLE public.beneficiary_financials OWNER TO zms;

--
-- Name: beneficiary_households; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.beneficiary_households (
    id uuid NOT NULL,
    beneficiary_id uuid NOT NULL,
    member_count integer DEFAULT 1 NOT NULL,
    earner_count integer DEFAULT 0 NOT NULL,
    dependent_count integer DEFAULT 0 NOT NULL,
    elderly_count integer DEFAULT 0 NOT NULL,
    child_count integer DEFAULT 0 NOT NULL,
    disabled_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.beneficiary_households OWNER TO zms;

--
-- Name: beneficiary_status_history; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.beneficiary_status_history (
    id bigint NOT NULL,
    beneficiary_id uuid NOT NULL,
    from_status character varying(50),
    to_status character varying(50) NOT NULL,
    actor_id uuid,
    reason text,
    occurred_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.beneficiary_status_history OWNER TO zms;

--
-- Name: beneficiary_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: zms
--

CREATE SEQUENCE public.beneficiary_status_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.beneficiary_status_history_id_seq OWNER TO zms;

--
-- Name: beneficiary_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zms
--

ALTER SEQUENCE public.beneficiary_status_history_id_seq OWNED BY public.beneficiary_status_history.id;


--
-- Name: branches; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.branches (
    id uuid NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    address text,
    phone character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);


ALTER TABLE public.branches OWNER TO zms;

--
-- Name: budget_entries; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.budget_entries (
    id bigint NOT NULL,
    fund_type_id uuid NOT NULL,
    asnaf_id uuid,
    sub_fund_id uuid,
    allocation_version_id uuid,
    entry_type public."BudgetEntryType" NOT NULL,
    amount numeric(18,2) NOT NULL,
    source_type character varying(50) NOT NULL,
    source_id uuid NOT NULL,
    entry_date date NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.budget_entries OWNER TO zms;

--
-- Name: budget_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: zms
--

CREATE SEQUENCE public.budget_entries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.budget_entries_id_seq OWNER TO zms;

--
-- Name: budget_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zms
--

ALTER SEQUENCE public.budget_entries_id_seq OWNED BY public.budget_entries.id;


--
-- Name: cash_accounts; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.cash_accounts (
    id uuid NOT NULL,
    kind public."CashAccountKind" NOT NULL,
    custodian_user_id uuid,
    branch_id uuid NOT NULL,
    location character varying(150),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.cash_accounts OWNER TO zms;

--
-- Name: cash_advances; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.cash_advances (
    id uuid NOT NULL,
    advance_no character varying(50) NOT NULL,
    officer_id uuid NOT NULL,
    fund_type_id uuid NOT NULL,
    amount numeric(18,2) NOT NULL,
    spent_amount numeric(18,2) DEFAULT 0 NOT NULL,
    returned_amount numeric(18,2) DEFAULT 0 NOT NULL,
    due_date date NOT NULL,
    status character varying(30) DEFAULT 'REQUESTED'::character varying NOT NULL,
    issued_by uuid,
    approved_by uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.cash_advances OWNER TO zms;

--
-- Name: cash_handovers; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.cash_handovers (
    id uuid NOT NULL,
    handover_no character varying(50) NOT NULL,
    from_cash_account_id uuid NOT NULL,
    to_cash_account_id uuid NOT NULL,
    fund_type_id uuid NOT NULL,
    sent_amount numeric(18,2) NOT NULL,
    received_amount numeric(18,2),
    status character varying(30) DEFAULT 'SENT'::character varying NOT NULL,
    sent_by uuid NOT NULL,
    received_by uuid,
    sent_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    confirmed_at timestamp(3) without time zone
);


ALTER TABLE public.cash_handovers OWNER TO zms;

--
-- Name: cash_returns; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.cash_returns (
    id uuid NOT NULL,
    return_no character varying(50) NOT NULL,
    cash_advance_id uuid NOT NULL,
    amount numeric(18,2) NOT NULL,
    status character varying(30) DEFAULT 'SUBMITTED'::character varying NOT NULL,
    submitted_by uuid NOT NULL,
    confirmed_by uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.cash_returns OWNER TO zms;

--
-- Name: consents; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    purpose character varying(100) NOT NULL,
    policy_version character varying(20) NOT NULL,
    given_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    withdrawn_at timestamp(3) without time zone
);


ALTER TABLE public.consents OWNER TO zms;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.departments (
    id uuid NOT NULL,
    branch_id uuid NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);


ALTER TABLE public.departments OWNER TO zms;

--
-- Name: disbursement_orders; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.disbursement_orders (
    id uuid NOT NULL,
    order_no character varying(50) NOT NULL,
    request_id uuid NOT NULL,
    fund_type_id uuid NOT NULL,
    asnaf_id uuid,
    approved_amount numeric(18,2) NOT NULL,
    paid_total numeric(18,2) DEFAULT 0 NOT NULL,
    status character varying(30) DEFAULT 'PENDING'::character varying NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.disbursement_orders OWNER TO zms;

--
-- Name: disbursement_payments; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.disbursement_payments (
    id uuid NOT NULL,
    payment_no character varying(50) NOT NULL,
    order_id uuid NOT NULL,
    cash_advance_id uuid,
    bank_account_id uuid,
    method character varying(50) NOT NULL,
    amount numeric(18,2) NOT NULL,
    idempotency_key character varying(100) NOT NULL,
    paid_date date NOT NULL,
    status character varying(30) DEFAULT 'RECORDED'::character varying NOT NULL,
    recorded_by uuid NOT NULL,
    verified_by uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.disbursement_payments OWNER TO zms;

--
-- Name: districts; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.districts (
    id integer NOT NULL,
    province_id integer NOT NULL,
    name_th character varying(150) NOT NULL,
    name_en character varying(150)
);


ALTER TABLE public.districts OWNER TO zms;

--
-- Name: document_sequences; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.document_sequences (
    doc_type character varying(50) NOT NULL,
    branch_id uuid NOT NULL,
    fiscal_year integer NOT NULL,
    last_no bigint DEFAULT 0 NOT NULL
);


ALTER TABLE public.document_sequences OWNER TO zms;

--
-- Name: document_types; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.document_types (
    id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text
);


ALTER TABLE public.document_types OWNER TO zms;

--
-- Name: expense_transactions; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.expense_transactions (
    id uuid NOT NULL,
    expense_no character varying(50) NOT NULL,
    category character varying(50) NOT NULL,
    fund_type_id uuid NOT NULL,
    amount numeric(18,2) NOT NULL,
    status character varying(30) DEFAULT 'DRAFT'::character varying NOT NULL,
    approved_by uuid,
    paid_date date,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.expense_transactions OWNER TO zms;

--
-- Name: export_jobs; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.export_jobs (
    id uuid NOT NULL,
    requested_by uuid NOT NULL,
    report_code character varying(50) NOT NULL,
    filters jsonb NOT NULL,
    status character varying(30) DEFAULT 'PENDING'::character varying NOT NULL,
    file_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp(3) without time zone
);


ALTER TABLE public.export_jobs OWNER TO zms;

--
-- Name: finance_evidences; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.finance_evidences (
    id uuid NOT NULL,
    source_type character varying(50) NOT NULL,
    source_id uuid NOT NULL,
    attachment_id uuid NOT NULL,
    evidence_type character varying(50) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.finance_evidences OWNER TO zms;

--
-- Name: fund_allocation_lines; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.fund_allocation_lines (
    id uuid NOT NULL,
    version_id uuid NOT NULL,
    asnaf_id uuid,
    sub_fund_id uuid,
    percent numeric(7,4) NOT NULL
);


ALTER TABLE public.fund_allocation_lines OWNER TO zms;

--
-- Name: fund_allocation_versions; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.fund_allocation_versions (
    id uuid NOT NULL,
    allocation_id uuid NOT NULL,
    version_no integer NOT NULL,
    effective_from date NOT NULL,
    status character varying(30) DEFAULT 'DRAFT'::character varying NOT NULL,
    approved_by uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.fund_allocation_versions OWNER TO zms;

--
-- Name: fund_allocations; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.fund_allocations (
    id uuid NOT NULL,
    fund_type_id uuid NOT NULL,
    basis character varying(50) NOT NULL,
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.fund_allocations OWNER TO zms;

--
-- Name: fund_types; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.fund_types (
    id uuid NOT NULL,
    code public."FundTypeCode" NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    allow_admin_expense boolean DEFAULT false NOT NULL,
    requires_asnaf boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.fund_types OWNER TO zms;

--
-- Name: household_members; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.household_members (
    id uuid NOT NULL,
    household_id uuid NOT NULL,
    relation character varying(50) NOT NULL,
    birth_date date,
    has_income boolean DEFAULT false NOT NULL,
    is_disabled boolean DEFAULT false NOT NULL,
    disability_note character varying(255)
);


ALTER TABLE public.household_members OWNER TO zms;

--
-- Name: idempotency_keys; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.idempotency_keys (
    key character varying(100) NOT NULL,
    user_id uuid,
    request_hash character varying(64) NOT NULL,
    response jsonb NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.idempotency_keys OWNER TO zms;

--
-- Name: income_transactions; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.income_transactions (
    id uuid NOT NULL,
    income_no character varying(50) NOT NULL,
    payment_id uuid,
    fund_type_id uuid NOT NULL,
    sub_fund_id uuid,
    channel character varying(50) NOT NULL,
    amount numeric(18,2) NOT NULL,
    received_date date NOT NULL,
    status character varying(30) DEFAULT 'POSTED'::character varying NOT NULL,
    verified_by uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.income_transactions OWNER TO zms;

--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.journal_entries (
    id uuid NOT NULL,
    entry_no character varying(50) NOT NULL,
    entry_date date NOT NULL,
    source_type character varying(50) NOT NULL,
    source_id uuid NOT NULL,
    status character varying(30) DEFAULT 'POSTED'::character varying NOT NULL,
    reversal_of_id uuid,
    posted_by uuid NOT NULL,
    branch_id uuid NOT NULL,
    memo text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.journal_entries OWNER TO zms;

--
-- Name: journal_lines; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.journal_lines (
    id bigint NOT NULL,
    entry_id uuid NOT NULL,
    account_id uuid NOT NULL,
    fund_type_id uuid NOT NULL,
    sub_fund_id uuid,
    asnaf_id uuid,
    assistance_type_id uuid,
    bank_account_id uuid,
    cash_account_id uuid,
    branch_id uuid NOT NULL,
    debit numeric(18,2) DEFAULT 0 NOT NULL,
    credit numeric(18,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.journal_lines OWNER TO zms;

--
-- Name: journal_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: zms
--

CREATE SEQUENCE public.journal_lines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.journal_lines_id_seq OWNER TO zms;

--
-- Name: journal_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zms
--

ALTER SEQUENCE public.journal_lines_id_seq OWNED BY public.journal_lines.id;


--
-- Name: ledger_accounts; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.ledger_accounts (
    id uuid NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(150) NOT NULL,
    type public."LedgerAccountType" NOT NULL,
    description text,
    required_dimensions jsonb,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.ledger_accounts OWNER TO zms;

--
-- Name: login_histories; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.login_histories (
    id bigint NOT NULL,
    user_id uuid,
    identifier character varying(255) NOT NULL,
    status character varying(50) NOT NULL,
    ip character varying(50),
    user_agent text,
    failure_reason character varying(255),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.login_histories OWNER TO zms;

--
-- Name: login_histories_id_seq; Type: SEQUENCE; Schema: public; Owner: zms
--

CREATE SEQUENCE public.login_histories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.login_histories_id_seq OWNER TO zms;

--
-- Name: login_histories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zms
--

ALTER SEQUENCE public.login_histories_id_seq OWNED BY public.login_histories.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(50) NOT NULL,
    link character varying(255),
    read_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notifications OWNER TO zms;

--
-- Name: otp_verifications; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.otp_verifications (
    id uuid NOT NULL,
    identifier character varying(255) NOT NULL,
    code character varying(10) NOT NULL,
    purpose character varying(50) NOT NULL,
    reset_token character varying(255),
    expires_at timestamp(3) without time zone NOT NULL,
    verified_at timestamp(3) without time zone,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.otp_verifications OWNER TO zms;

--
-- Name: outbox_events; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.outbox_events (
    id bigint NOT NULL,
    event_type character varying(100) NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.outbox_events OWNER TO zms;

--
-- Name: outbox_events_id_seq; Type: SEQUENCE; Schema: public; Owner: zms
--

CREATE SEQUENCE public.outbox_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.outbox_events_id_seq OWNER TO zms;

--
-- Name: outbox_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zms
--

ALTER SEQUENCE public.outbox_events_id_seq OWNED BY public.outbox_events.id;


--
-- Name: payment_events; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.payment_events (
    id uuid NOT NULL,
    payment_id uuid NOT NULL,
    provider character varying(50) NOT NULL,
    provider_event_id character varying(100) NOT NULL,
    signature_valid boolean NOT NULL,
    raw_payload jsonb NOT NULL,
    processing_status character varying(30) DEFAULT 'PENDING'::character varying NOT NULL,
    received_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.payment_events OWNER TO zms;

--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.payment_transactions (
    id uuid NOT NULL,
    payment_no character varying(50) NOT NULL,
    idempotency_key character varying(100) NOT NULL,
    payer_user_id uuid,
    fund_type_id uuid NOT NULL,
    sub_fund_id uuid,
    zakat_calculation_id uuid,
    amount numeric(18,2) NOT NULL,
    channel character varying(50) NOT NULL,
    provider character varying(50),
    provider_ref character varying(100),
    status public."PaymentStatus" DEFAULT 'CREATED'::public."PaymentStatus" NOT NULL,
    verified_by uuid,
    verified_at timestamp(3) without time zone,
    confirmed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.payment_transactions OWNER TO zms;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.permissions (
    id uuid NOT NULL,
    key character varying(100) NOT NULL,
    module character varying(50) NOT NULL,
    description character varying(255)
);


ALTER TABLE public.permissions OWNER TO zms;

--
-- Name: provinces; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.provinces (
    id integer NOT NULL,
    name_th character varying(150) NOT NULL,
    name_en character varying(150)
);


ALTER TABLE public.provinces OWNER TO zms;

--
-- Name: receipts; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.receipts (
    id uuid NOT NULL,
    receipt_no character varying(50) NOT NULL,
    payment_id uuid NOT NULL,
    income_id uuid,
    verify_code character varying(64) NOT NULL,
    file_id uuid,
    status character varying(30) DEFAULT 'ISSUED'::character varying NOT NULL,
    issued_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.receipts OWNER TO zms;

--
-- Name: reference_prices; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.reference_prices (
    id uuid NOT NULL,
    item character varying(50) NOT NULL,
    unit character varying(20) NOT NULL,
    price numeric(18,6) NOT NULL,
    price_date date NOT NULL,
    source character varying(255),
    recorded_by uuid,
    recorded_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.reference_prices OWNER TO zms;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.refresh_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    family_id uuid NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    revoked_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO zms;

--
-- Name: request_documents; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.request_documents (
    id uuid NOT NULL,
    request_id uuid NOT NULL,
    document_type_id uuid NOT NULL,
    attachment_id uuid NOT NULL,
    notes text
);


ALTER TABLE public.request_documents OWNER TO zms;

--
-- Name: request_status_history; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.request_status_history (
    id bigint NOT NULL,
    request_id uuid NOT NULL,
    axis character varying(50) NOT NULL,
    from_status character varying(50),
    to_status character varying(50) NOT NULL,
    actor_id uuid,
    reason text,
    occurred_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.request_status_history OWNER TO zms;

--
-- Name: request_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: zms
--

CREATE SEQUENCE public.request_status_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.request_status_history_id_seq OWNER TO zms;

--
-- Name: request_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zms
--

ALTER SEQUENCE public.request_status_history_id_seq OWNED BY public.request_status_history.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO zms;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.roles (
    id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description character varying(255),
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.roles OWNER TO zms;

--
-- Name: sub_funds; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.sub_funds (
    id uuid NOT NULL,
    fund_type_id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    purpose text,
    is_active boolean DEFAULT true NOT NULL,
    deleted_at timestamp(3) without time zone
);


ALTER TABLE public.sub_funds OWNER TO zms;

--
-- Name: subdistricts; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.subdistricts (
    id integer NOT NULL,
    district_id integer NOT NULL,
    name_th character varying(150) NOT NULL,
    name_en character varying(150),
    postal_code character varying(10) NOT NULL
);


ALTER TABLE public.subdistricts OWNER TO zms;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.system_settings (
    key character varying(100) NOT NULL,
    value jsonb NOT NULL,
    description text,
    version integer DEFAULT 1 NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.system_settings OWNER TO zms;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.user_roles (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    scope_type public."ScopeType" DEFAULT 'BRANCH'::public."ScopeType" NOT NULL,
    branch_id uuid,
    department_id uuid,
    valid_from date,
    valid_to date,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.user_roles OWNER TO zms;

--
-- Name: users; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    user_type public."UserType" DEFAULT 'PUBLIC'::public."UserType" NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    primary_branch_id uuid,
    mfa_enabled boolean DEFAULT false NOT NULL,
    mfa_secret character varying(255),
    last_login_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO zms;

--
-- Name: zakat_calculations; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.zakat_calculations (
    id uuid NOT NULL,
    user_id uuid,
    rule_version_id uuid NOT NULL,
    inputs jsonb NOT NULL,
    params_snapshot jsonb NOT NULL,
    trace jsonb NOT NULL,
    zakat_amount numeric(18,2) NOT NULL,
    calculated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.zakat_calculations OWNER TO zms;

--
-- Name: zakat_categories; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.zakat_categories (
    id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    enabled boolean DEFAULT true NOT NULL
);


ALTER TABLE public.zakat_categories OWNER TO zms;

--
-- Name: zakat_rule_approvals; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.zakat_rule_approvals (
    id uuid NOT NULL,
    rule_version_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    decision character varying(30) NOT NULL,
    comment text,
    decided_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.zakat_rule_approvals OWNER TO zms;

--
-- Name: zakat_rule_versions; Type: TABLE; Schema: public; Owner: zms
--

CREATE TABLE public.zakat_rule_versions (
    id uuid NOT NULL,
    category_id uuid NOT NULL,
    version_no integer NOT NULL,
    input_schema jsonb NOT NULL,
    expression_tree jsonb NOT NULL,
    parameters jsonb NOT NULL,
    rounding_mode character varying(30) DEFAULT 'ROUND_HALF_UP'::character varying NOT NULL,
    rounding_scale integer DEFAULT 2 NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    "references" text,
    test_vectors jsonb NOT NULL,
    status public."ZakatRuleStatus" DEFAULT 'DRAFT'::public."ZakatRuleStatus" NOT NULL,
    content_hash character varying(64),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by uuid NOT NULL
);


ALTER TABLE public.zakat_rule_versions OWNER TO zms;

--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: beneficiary_status_history id; Type: DEFAULT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.beneficiary_status_history ALTER COLUMN id SET DEFAULT nextval('public.beneficiary_status_history_id_seq'::regclass);


--
-- Name: budget_entries id; Type: DEFAULT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.budget_entries ALTER COLUMN id SET DEFAULT nextval('public.budget_entries_id_seq'::regclass);


--
-- Name: journal_lines id; Type: DEFAULT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.journal_lines ALTER COLUMN id SET DEFAULT nextval('public.journal_lines_id_seq'::regclass);


--
-- Name: login_histories id; Type: DEFAULT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.login_histories ALTER COLUMN id SET DEFAULT nextval('public.login_histories_id_seq'::regclass);


--
-- Name: outbox_events id; Type: DEFAULT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.outbox_events ALTER COLUMN id SET DEFAULT nextval('public.outbox_events_id_seq'::regclass);


--
-- Name: request_status_history id; Type: DEFAULT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.request_status_history ALTER COLUMN id SET DEFAULT nextval('public.request_status_history_id_seq'::regclass);


--
-- Name: account_balances account_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.account_balances
    ADD CONSTRAINT account_balances_pkey PRIMARY KEY (id);


--
-- Name: approval_limits approval_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.approval_limits
    ADD CONSTRAINT approval_limits_pkey PRIMARY KEY (id);


--
-- Name: asnaf asnaf_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.asnaf
    ADD CONSTRAINT asnaf_pkey PRIMARY KEY (id);


--
-- Name: assistance_approvals assistance_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_approvals
    ADD CONSTRAINT assistance_approvals_pkey PRIMARY KEY (id);


--
-- Name: assistance_assessments assistance_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_assessments
    ADD CONSTRAINT assistance_assessments_pkey PRIMARY KEY (id);


--
-- Name: assistance_followups assistance_followups_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_followups
    ADD CONSTRAINT assistance_followups_pkey PRIMARY KEY (id);


--
-- Name: assistance_records assistance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_records
    ADD CONSTRAINT assistance_records_pkey PRIMARY KEY (id);


--
-- Name: assistance_requests assistance_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_requests
    ADD CONSTRAINT assistance_requests_pkey PRIMARY KEY (id);


--
-- Name: assistance_type_rules assistance_type_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_type_rules
    ADD CONSTRAINT assistance_type_rules_pkey PRIMARY KEY (id);


--
-- Name: assistance_types assistance_types_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_types
    ADD CONSTRAINT assistance_types_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: bank_statement_lines bank_statement_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.bank_statement_lines
    ADD CONSTRAINT bank_statement_lines_pkey PRIMARY KEY (id);


--
-- Name: bank_withdrawals bank_withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.bank_withdrawals
    ADD CONSTRAINT bank_withdrawals_pkey PRIMARY KEY (id);


--
-- Name: beneficiaries beneficiaries_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.beneficiaries
    ADD CONSTRAINT beneficiaries_pkey PRIMARY KEY (id);


--
-- Name: beneficiary_debts beneficiary_debts_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.beneficiary_debts
    ADD CONSTRAINT beneficiary_debts_pkey PRIMARY KEY (id);


--
-- Name: beneficiary_documents beneficiary_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.beneficiary_documents
    ADD CONSTRAINT beneficiary_documents_pkey PRIMARY KEY (id);


--
-- Name: beneficiary_financials beneficiary_financials_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.beneficiary_financials
    ADD CONSTRAINT beneficiary_financials_pkey PRIMARY KEY (id);


--
-- Name: beneficiary_households beneficiary_households_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.beneficiary_households
    ADD CONSTRAINT beneficiary_households_pkey PRIMARY KEY (id);


--
-- Name: beneficiary_status_history beneficiary_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.beneficiary_status_history
    ADD CONSTRAINT beneficiary_status_history_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: budget_entries budget_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.budget_entries
    ADD CONSTRAINT budget_entries_pkey PRIMARY KEY (id);


--
-- Name: cash_accounts cash_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.cash_accounts
    ADD CONSTRAINT cash_accounts_pkey PRIMARY KEY (id);


--
-- Name: cash_advances cash_advances_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.cash_advances
    ADD CONSTRAINT cash_advances_pkey PRIMARY KEY (id);


--
-- Name: cash_handovers cash_handovers_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.cash_handovers
    ADD CONSTRAINT cash_handovers_pkey PRIMARY KEY (id);


--
-- Name: cash_returns cash_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.cash_returns
    ADD CONSTRAINT cash_returns_pkey PRIMARY KEY (id);


--
-- Name: consents consents_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.consents
    ADD CONSTRAINT consents_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: disbursement_orders disbursement_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.disbursement_orders
    ADD CONSTRAINT disbursement_orders_pkey PRIMARY KEY (id);


--
-- Name: disbursement_payments disbursement_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.disbursement_payments
    ADD CONSTRAINT disbursement_payments_pkey PRIMARY KEY (id);


--
-- Name: districts districts_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_pkey PRIMARY KEY (id);


--
-- Name: document_sequences document_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.document_sequences
    ADD CONSTRAINT document_sequences_pkey PRIMARY KEY (doc_type, branch_id, fiscal_year);


--
-- Name: document_types document_types_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_pkey PRIMARY KEY (id);


--
-- Name: expense_transactions expense_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.expense_transactions
    ADD CONSTRAINT expense_transactions_pkey PRIMARY KEY (id);


--
-- Name: export_jobs export_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.export_jobs
    ADD CONSTRAINT export_jobs_pkey PRIMARY KEY (id);


--
-- Name: finance_evidences finance_evidences_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.finance_evidences
    ADD CONSTRAINT finance_evidences_pkey PRIMARY KEY (id);


--
-- Name: fund_allocation_lines fund_allocation_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.fund_allocation_lines
    ADD CONSTRAINT fund_allocation_lines_pkey PRIMARY KEY (id);


--
-- Name: fund_allocation_versions fund_allocation_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.fund_allocation_versions
    ADD CONSTRAINT fund_allocation_versions_pkey PRIMARY KEY (id);


--
-- Name: fund_allocations fund_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.fund_allocations
    ADD CONSTRAINT fund_allocations_pkey PRIMARY KEY (id);


--
-- Name: fund_types fund_types_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.fund_types
    ADD CONSTRAINT fund_types_pkey PRIMARY KEY (id);


--
-- Name: household_members household_members_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT household_members_pkey PRIMARY KEY (id);


--
-- Name: idempotency_keys idempotency_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (key);


--
-- Name: income_transactions income_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.income_transactions
    ADD CONSTRAINT income_transactions_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: journal_lines journal_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_pkey PRIMARY KEY (id);


--
-- Name: ledger_accounts ledger_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.ledger_accounts
    ADD CONSTRAINT ledger_accounts_pkey PRIMARY KEY (id);


--
-- Name: login_histories login_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.login_histories
    ADD CONSTRAINT login_histories_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: otp_verifications otp_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.otp_verifications
    ADD CONSTRAINT otp_verifications_pkey PRIMARY KEY (id);


--
-- Name: outbox_events outbox_events_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);


--
-- Name: payment_events payment_events_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.payment_events
    ADD CONSTRAINT payment_events_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: provinces provinces_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.provinces
    ADD CONSTRAINT provinces_pkey PRIMARY KEY (id);


--
-- Name: receipts receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (id);


--
-- Name: reference_prices reference_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.reference_prices
    ADD CONSTRAINT reference_prices_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: request_documents request_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.request_documents
    ADD CONSTRAINT request_documents_pkey PRIMARY KEY (id);


--
-- Name: request_status_history request_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.request_status_history
    ADD CONSTRAINT request_status_history_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sub_funds sub_funds_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.sub_funds
    ADD CONSTRAINT sub_funds_pkey PRIMARY KEY (id);


--
-- Name: subdistricts subdistricts_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.subdistricts
    ADD CONSTRAINT subdistricts_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: zakat_calculations zakat_calculations_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.zakat_calculations
    ADD CONSTRAINT zakat_calculations_pkey PRIMARY KEY (id);


--
-- Name: zakat_categories zakat_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.zakat_categories
    ADD CONSTRAINT zakat_categories_pkey PRIMARY KEY (id);


--
-- Name: zakat_rule_approvals zakat_rule_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.zakat_rule_approvals
    ADD CONSTRAINT zakat_rule_approvals_pkey PRIMARY KEY (id);


--
-- Name: zakat_rule_versions zakat_rule_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.zakat_rule_versions
    ADD CONSTRAINT zakat_rule_versions_pkey PRIMARY KEY (id);


--
-- Name: account_balances_balance_key_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX account_balances_balance_key_key ON public.account_balances USING btree (balance_key);


--
-- Name: approval_limits_user_id_doc_type_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX approval_limits_user_id_doc_type_key ON public.approval_limits USING btree (user_id, doc_type);


--
-- Name: asnaf_code_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX asnaf_code_key ON public.asnaf USING btree (code);


--
-- Name: assistance_approvals_request_id_step_no_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX assistance_approvals_request_id_step_no_idx ON public.assistance_approvals USING btree (request_id, step_no);


--
-- Name: assistance_requests_approval_status_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX assistance_requests_approval_status_idx ON public.assistance_requests USING btree (approval_status);


--
-- Name: assistance_requests_assistance_status_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX assistance_requests_assistance_status_idx ON public.assistance_requests USING btree (assistance_status);


--
-- Name: assistance_requests_branch_id_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX assistance_requests_branch_id_idx ON public.assistance_requests USING btree (branch_id);


--
-- Name: assistance_requests_payment_status_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX assistance_requests_payment_status_idx ON public.assistance_requests USING btree (payment_status);


--
-- Name: assistance_requests_request_no_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX assistance_requests_request_no_key ON public.assistance_requests USING btree (request_no);


--
-- Name: assistance_requests_request_status_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX assistance_requests_request_status_idx ON public.assistance_requests USING btree (request_status);


--
-- Name: assistance_type_rules_assistance_type_id_asnaf_id_fund_type_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX assistance_type_rules_assistance_type_id_asnaf_id_fund_type_key ON public.assistance_type_rules USING btree (assistance_type_id, asnaf_id, fund_type_id, sub_fund_id);


--
-- Name: assistance_types_code_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX assistance_types_code_key ON public.assistance_types USING btree (code);


--
-- Name: attachments_object_key_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX attachments_object_key_key ON public.attachments USING btree (object_key);


--
-- Name: audit_logs_module_action_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX audit_logs_module_action_idx ON public.audit_logs USING btree (module, action);


--
-- Name: audit_logs_occurred_at_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX audit_logs_occurred_at_idx ON public.audit_logs USING btree (occurred_at);


--
-- Name: audit_logs_record_type_record_id_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX audit_logs_record_type_record_id_idx ON public.audit_logs USING btree (record_type, record_id);


--
-- Name: bank_withdrawals_withdrawal_no_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX bank_withdrawals_withdrawal_no_key ON public.bank_withdrawals USING btree (withdrawal_no);


--
-- Name: beneficiaries_beneficiary_no_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX beneficiaries_beneficiary_no_key ON public.beneficiaries USING btree (beneficiary_no);


--
-- Name: beneficiaries_branch_id_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX beneficiaries_branch_id_idx ON public.beneficiaries USING btree (branch_id);


--
-- Name: beneficiaries_national_id_hash_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX beneficiaries_national_id_hash_key ON public.beneficiaries USING btree (national_id_hash);


--
-- Name: beneficiaries_status_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX beneficiaries_status_idx ON public.beneficiaries USING btree (status);


--
-- Name: beneficiary_households_beneficiary_id_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX beneficiary_households_beneficiary_id_key ON public.beneficiary_households USING btree (beneficiary_id);


--
-- Name: branches_code_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX branches_code_key ON public.branches USING btree (code);


--
-- Name: budget_entries_fund_type_id_asnaf_id_entry_date_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX budget_entries_fund_type_id_asnaf_id_entry_date_idx ON public.budget_entries USING btree (fund_type_id, asnaf_id, entry_date);


--
-- Name: budget_entries_fund_type_id_sub_fund_id_entry_date_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX budget_entries_fund_type_id_sub_fund_id_entry_date_idx ON public.budget_entries USING btree (fund_type_id, sub_fund_id, entry_date);


--
-- Name: cash_advances_advance_no_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX cash_advances_advance_no_key ON public.cash_advances USING btree (advance_no);


--
-- Name: cash_handovers_handover_no_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX cash_handovers_handover_no_key ON public.cash_handovers USING btree (handover_no);


--
-- Name: cash_returns_return_no_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX cash_returns_return_no_key ON public.cash_returns USING btree (return_no);


--
-- Name: departments_branch_id_code_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX departments_branch_id_code_key ON public.departments USING btree (branch_id, code);


--
-- Name: disbursement_orders_order_no_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX disbursement_orders_order_no_key ON public.disbursement_orders USING btree (order_no);


--
-- Name: disbursement_payments_idempotency_key_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX disbursement_payments_idempotency_key_key ON public.disbursement_payments USING btree (idempotency_key);


--
-- Name: disbursement_payments_payment_no_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX disbursement_payments_payment_no_key ON public.disbursement_payments USING btree (payment_no);


--
-- Name: document_types_code_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX document_types_code_key ON public.document_types USING btree (code);


--
-- Name: expense_transactions_expense_no_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX expense_transactions_expense_no_key ON public.expense_transactions USING btree (expense_no);


--
-- Name: fund_allocation_versions_allocation_id_version_no_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX fund_allocation_versions_allocation_id_version_no_key ON public.fund_allocation_versions USING btree (allocation_id, version_no);


--
-- Name: fund_types_code_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX fund_types_code_key ON public.fund_types USING btree (code);


--
-- Name: income_transactions_income_no_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX income_transactions_income_no_key ON public.income_transactions USING btree (income_no);


--
-- Name: income_transactions_payment_id_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX income_transactions_payment_id_key ON public.income_transactions USING btree (payment_id);


--
-- Name: journal_entries_entry_date_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX journal_entries_entry_date_idx ON public.journal_entries USING btree (entry_date);


--
-- Name: journal_entries_entry_no_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX journal_entries_entry_no_key ON public.journal_entries USING btree (entry_no);


--
-- Name: journal_entries_reversal_of_id_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX journal_entries_reversal_of_id_key ON public.journal_entries USING btree (reversal_of_id);


--
-- Name: journal_entries_source_type_source_id_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX journal_entries_source_type_source_id_idx ON public.journal_entries USING btree (source_type, source_id);


--
-- Name: journal_lines_account_id_fund_type_id_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX journal_lines_account_id_fund_type_id_idx ON public.journal_lines USING btree (account_id, fund_type_id);


--
-- Name: journal_lines_bank_account_id_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX journal_lines_bank_account_id_idx ON public.journal_lines USING btree (bank_account_id);


--
-- Name: journal_lines_cash_account_id_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX journal_lines_cash_account_id_idx ON public.journal_lines USING btree (cash_account_id);


--
-- Name: ledger_accounts_code_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX ledger_accounts_code_key ON public.ledger_accounts USING btree (code);


--
-- Name: login_histories_created_at_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX login_histories_created_at_idx ON public.login_histories USING btree (created_at);


--
-- Name: login_histories_identifier_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX login_histories_identifier_idx ON public.login_histories USING btree (identifier);


--
-- Name: login_histories_user_id_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX login_histories_user_id_idx ON public.login_histories USING btree (user_id);


--
-- Name: notifications_user_id_read_at_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX notifications_user_id_read_at_idx ON public.notifications USING btree (user_id, read_at);


--
-- Name: otp_verifications_identifier_purpose_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX otp_verifications_identifier_purpose_idx ON public.otp_verifications USING btree (identifier, purpose);


--
-- Name: otp_verifications_reset_token_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX otp_verifications_reset_token_key ON public.otp_verifications USING btree (reset_token);


--
-- Name: outbox_events_processed_at_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX outbox_events_processed_at_idx ON public.outbox_events USING btree (processed_at);


--
-- Name: payment_events_provider_provider_event_id_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX payment_events_provider_provider_event_id_key ON public.payment_events USING btree (provider, provider_event_id);


--
-- Name: payment_transactions_idempotency_key_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX payment_transactions_idempotency_key_key ON public.payment_transactions USING btree (idempotency_key);


--
-- Name: payment_transactions_payment_no_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX payment_transactions_payment_no_key ON public.payment_transactions USING btree (payment_no);


--
-- Name: payment_transactions_provider_ref_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX payment_transactions_provider_ref_key ON public.payment_transactions USING btree (provider_ref);


--
-- Name: payment_transactions_status_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX payment_transactions_status_idx ON public.payment_transactions USING btree (status);


--
-- Name: permissions_key_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX permissions_key_key ON public.permissions USING btree (key);


--
-- Name: receipts_income_id_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX receipts_income_id_key ON public.receipts USING btree (income_id);


--
-- Name: receipts_payment_id_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX receipts_payment_id_key ON public.receipts USING btree (payment_id);


--
-- Name: receipts_receipt_no_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX receipts_receipt_no_key ON public.receipts USING btree (receipt_no);


--
-- Name: receipts_verify_code_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX receipts_verify_code_key ON public.receipts USING btree (verify_code);


--
-- Name: reference_prices_item_price_date_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX reference_prices_item_price_date_key ON public.reference_prices USING btree (item, price_date);


--
-- Name: refresh_tokens_token_hash_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX refresh_tokens_token_hash_key ON public.refresh_tokens USING btree (token_hash);


--
-- Name: refresh_tokens_user_id_family_id_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX refresh_tokens_user_id_family_id_idx ON public.refresh_tokens USING btree (user_id, family_id);


--
-- Name: request_status_history_request_id_axis_idx; Type: INDEX; Schema: public; Owner: zms
--

CREATE INDEX request_status_history_request_id_axis_idx ON public.request_status_history USING btree (request_id, axis);


--
-- Name: roles_code_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX roles_code_key ON public.roles USING btree (code);


--
-- Name: sub_funds_code_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX sub_funds_code_key ON public.sub_funds USING btree (code);


--
-- Name: user_roles_user_id_role_id_branch_id_department_id_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX user_roles_user_id_role_id_branch_id_department_id_key ON public.user_roles USING btree (user_id, role_id, branch_id, department_id);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_phone_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX users_phone_key ON public.users USING btree (phone);


--
-- Name: zakat_categories_code_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX zakat_categories_code_key ON public.zakat_categories USING btree (code);


--
-- Name: zakat_rule_versions_category_id_version_no_key; Type: INDEX; Schema: public; Owner: zms
--

CREATE UNIQUE INDEX zakat_rule_versions_category_id_version_no_key ON public.zakat_rule_versions USING btree (category_id, version_no);


--
-- Name: account_balances account_balances_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.account_balances
    ADD CONSTRAINT account_balances_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.ledger_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: approval_limits approval_limits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.approval_limits
    ADD CONSTRAINT approval_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assistance_approvals assistance_approvals_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_approvals
    ADD CONSTRAINT assistance_approvals_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.assistance_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assistance_assessments assistance_assessments_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_assessments
    ADD CONSTRAINT assistance_assessments_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.assistance_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assistance_followups assistance_followups_assistance_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_followups
    ADD CONSTRAINT assistance_followups_assistance_record_id_fkey FOREIGN KEY (assistance_record_id) REFERENCES public.assistance_records(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assistance_records assistance_records_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_records
    ADD CONSTRAINT assistance_records_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.assistance_requests(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: assistance_requests assistance_requests_asnaf_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_requests
    ADD CONSTRAINT assistance_requests_asnaf_id_fkey FOREIGN KEY (asnaf_id) REFERENCES public.asnaf(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: assistance_requests assistance_requests_assistance_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_requests
    ADD CONSTRAINT assistance_requests_assistance_type_id_fkey FOREIGN KEY (assistance_type_id) REFERENCES public.assistance_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: assistance_requests assistance_requests_beneficiary_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_requests
    ADD CONSTRAINT assistance_requests_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) REFERENCES public.beneficiaries(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: assistance_requests assistance_requests_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_requests
    ADD CONSTRAINT assistance_requests_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: assistance_requests assistance_requests_fund_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_requests
    ADD CONSTRAINT assistance_requests_fund_type_id_fkey FOREIGN KEY (fund_type_id) REFERENCES public.fund_types(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: assistance_requests assistance_requests_sub_fund_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_requests
    ADD CONSTRAINT assistance_requests_sub_fund_id_fkey FOREIGN KEY (sub_fund_id) REFERENCES public.sub_funds(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: assistance_type_rules assistance_type_rules_asnaf_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_type_rules
    ADD CONSTRAINT assistance_type_rules_asnaf_id_fkey FOREIGN KEY (asnaf_id) REFERENCES public.asnaf(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: assistance_type_rules assistance_type_rules_assistance_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_type_rules
    ADD CONSTRAINT assistance_type_rules_assistance_type_id_fkey FOREIGN KEY (assistance_type_id) REFERENCES public.assistance_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assistance_type_rules assistance_type_rules_fund_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_type_rules
    ADD CONSTRAINT assistance_type_rules_fund_type_id_fkey FOREIGN KEY (fund_type_id) REFERENCES public.fund_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: assistance_type_rules assistance_type_rules_sub_fund_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.assistance_type_rules
    ADD CONSTRAINT assistance_type_rules_sub_fund_id_fkey FOREIGN KEY (sub_fund_id) REFERENCES public.sub_funds(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bank_accounts bank_accounts_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bank_statement_lines bank_statement_lines_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.bank_statement_lines
    ADD CONSTRAINT bank_statement_lines_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bank_withdrawals bank_withdrawals_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.bank_withdrawals
    ADD CONSTRAINT bank_withdrawals_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bank_withdrawals bank_withdrawals_fund_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.bank_withdrawals
    ADD CONSTRAINT bank_withdrawals_fund_type_id_fkey FOREIGN KEY (fund_type_id) REFERENCES public.fund_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: beneficiaries beneficiaries_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.beneficiaries
    ADD CONSTRAINT beneficiaries_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: beneficiaries beneficiaries_subdistrict_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.beneficiaries
    ADD CONSTRAINT beneficiaries_subdistrict_id_fkey FOREIGN KEY (subdistrict_id) REFERENCES public.subdistricts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: beneficiaries beneficiaries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.beneficiaries
    ADD CONSTRAINT beneficiaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: beneficiary_debts beneficiary_debts_beneficiary_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.beneficiary_debts
    ADD CONSTRAINT beneficiary_debts_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) REFERENCES public.beneficiaries(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: beneficiary_documents beneficiary_documents_attachment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.beneficiary_documents
    ADD CONSTRAINT beneficiary_documents_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.attachments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: beneficiary_documents beneficiary_documents_beneficiary_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.beneficiary_documents
    ADD CONSTRAINT beneficiary_documents_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) REFERENCES public.beneficiaries(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: beneficiary_documents beneficiary_documents_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.beneficiary_documents
    ADD CONSTRAINT beneficiary_documents_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: beneficiary_financials beneficiary_financials_beneficiary_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.beneficiary_financials
    ADD CONSTRAINT beneficiary_financials_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) REFERENCES public.beneficiaries(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: beneficiary_households beneficiary_households_beneficiary_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.beneficiary_households
    ADD CONSTRAINT beneficiary_households_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) REFERENCES public.beneficiaries(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: beneficiary_status_history beneficiary_status_history_beneficiary_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.beneficiary_status_history
    ADD CONSTRAINT beneficiary_status_history_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) REFERENCES public.beneficiaries(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: budget_entries budget_entries_allocation_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.budget_entries
    ADD CONSTRAINT budget_entries_allocation_version_id_fkey FOREIGN KEY (allocation_version_id) REFERENCES public.fund_allocation_versions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: budget_entries budget_entries_asnaf_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.budget_entries
    ADD CONSTRAINT budget_entries_asnaf_id_fkey FOREIGN KEY (asnaf_id) REFERENCES public.asnaf(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: budget_entries budget_entries_fund_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.budget_entries
    ADD CONSTRAINT budget_entries_fund_type_id_fkey FOREIGN KEY (fund_type_id) REFERENCES public.fund_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: budget_entries budget_entries_sub_fund_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.budget_entries
    ADD CONSTRAINT budget_entries_sub_fund_id_fkey FOREIGN KEY (sub_fund_id) REFERENCES public.sub_funds(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cash_accounts cash_accounts_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.cash_accounts
    ADD CONSTRAINT cash_accounts_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cash_accounts cash_accounts_custodian_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.cash_accounts
    ADD CONSTRAINT cash_accounts_custodian_user_id_fkey FOREIGN KEY (custodian_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cash_advances cash_advances_fund_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.cash_advances
    ADD CONSTRAINT cash_advances_fund_type_id_fkey FOREIGN KEY (fund_type_id) REFERENCES public.fund_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cash_handovers cash_handovers_from_cash_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.cash_handovers
    ADD CONSTRAINT cash_handovers_from_cash_account_id_fkey FOREIGN KEY (from_cash_account_id) REFERENCES public.cash_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cash_handovers cash_handovers_fund_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.cash_handovers
    ADD CONSTRAINT cash_handovers_fund_type_id_fkey FOREIGN KEY (fund_type_id) REFERENCES public.fund_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cash_handovers cash_handovers_to_cash_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.cash_handovers
    ADD CONSTRAINT cash_handovers_to_cash_account_id_fkey FOREIGN KEY (to_cash_account_id) REFERENCES public.cash_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cash_returns cash_returns_cash_advance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.cash_returns
    ADD CONSTRAINT cash_returns_cash_advance_id_fkey FOREIGN KEY (cash_advance_id) REFERENCES public.cash_advances(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: consents consents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.consents
    ADD CONSTRAINT consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: departments departments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: disbursement_orders disbursement_orders_asnaf_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.disbursement_orders
    ADD CONSTRAINT disbursement_orders_asnaf_id_fkey FOREIGN KEY (asnaf_id) REFERENCES public.asnaf(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: disbursement_orders disbursement_orders_fund_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.disbursement_orders
    ADD CONSTRAINT disbursement_orders_fund_type_id_fkey FOREIGN KEY (fund_type_id) REFERENCES public.fund_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: disbursement_orders disbursement_orders_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.disbursement_orders
    ADD CONSTRAINT disbursement_orders_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.assistance_requests(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: disbursement_payments disbursement_payments_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.disbursement_payments
    ADD CONSTRAINT disbursement_payments_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: disbursement_payments disbursement_payments_cash_advance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.disbursement_payments
    ADD CONSTRAINT disbursement_payments_cash_advance_id_fkey FOREIGN KEY (cash_advance_id) REFERENCES public.cash_advances(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: disbursement_payments disbursement_payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.disbursement_payments
    ADD CONSTRAINT disbursement_payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.disbursement_orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: disbursement_payments disbursement_payments_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.disbursement_payments
    ADD CONSTRAINT disbursement_payments_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: districts districts_province_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_province_id_fkey FOREIGN KEY (province_id) REFERENCES public.provinces(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: expense_transactions expense_transactions_fund_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.expense_transactions
    ADD CONSTRAINT expense_transactions_fund_type_id_fkey FOREIGN KEY (fund_type_id) REFERENCES public.fund_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: finance_evidences finance_evidences_attachment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.finance_evidences
    ADD CONSTRAINT finance_evidences_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.attachments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: fund_allocation_lines fund_allocation_lines_asnaf_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.fund_allocation_lines
    ADD CONSTRAINT fund_allocation_lines_asnaf_id_fkey FOREIGN KEY (asnaf_id) REFERENCES public.asnaf(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fund_allocation_lines fund_allocation_lines_sub_fund_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.fund_allocation_lines
    ADD CONSTRAINT fund_allocation_lines_sub_fund_id_fkey FOREIGN KEY (sub_fund_id) REFERENCES public.sub_funds(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fund_allocation_lines fund_allocation_lines_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.fund_allocation_lines
    ADD CONSTRAINT fund_allocation_lines_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.fund_allocation_versions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: fund_allocation_versions fund_allocation_versions_allocation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.fund_allocation_versions
    ADD CONSTRAINT fund_allocation_versions_allocation_id_fkey FOREIGN KEY (allocation_id) REFERENCES public.fund_allocations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: fund_allocations fund_allocations_fund_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.fund_allocations
    ADD CONSTRAINT fund_allocations_fund_type_id_fkey FOREIGN KEY (fund_type_id) REFERENCES public.fund_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: household_members household_members_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT household_members_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.beneficiary_households(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: income_transactions income_transactions_fund_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.income_transactions
    ADD CONSTRAINT income_transactions_fund_type_id_fkey FOREIGN KEY (fund_type_id) REFERENCES public.fund_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: income_transactions income_transactions_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.income_transactions
    ADD CONSTRAINT income_transactions_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payment_transactions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: income_transactions income_transactions_sub_fund_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.income_transactions
    ADD CONSTRAINT income_transactions_sub_fund_id_fkey FOREIGN KEY (sub_fund_id) REFERENCES public.sub_funds(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: journal_entries journal_entries_reversal_of_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_reversal_of_id_fkey FOREIGN KEY (reversal_of_id) REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: journal_lines journal_lines_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.ledger_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: journal_lines journal_lines_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: journal_lines journal_lines_cash_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_cash_account_id_fkey FOREIGN KEY (cash_account_id) REFERENCES public.cash_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: journal_lines journal_lines_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: journal_lines journal_lines_fund_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_fund_type_id_fkey FOREIGN KEY (fund_type_id) REFERENCES public.fund_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: journal_lines journal_lines_sub_fund_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_sub_fund_id_fkey FOREIGN KEY (sub_fund_id) REFERENCES public.sub_funds(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: login_histories login_histories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.login_histories
    ADD CONSTRAINT login_histories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_events payment_events_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.payment_events
    ADD CONSTRAINT payment_events_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payment_transactions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_fund_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_fund_type_id_fkey FOREIGN KEY (fund_type_id) REFERENCES public.fund_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payment_transactions payment_transactions_payer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_payer_user_id_fkey FOREIGN KEY (payer_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_transactions payment_transactions_sub_fund_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_sub_fund_id_fkey FOREIGN KEY (sub_fund_id) REFERENCES public.sub_funds(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_transactions payment_transactions_zakat_calculation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_zakat_calculation_id_fkey FOREIGN KEY (zakat_calculation_id) REFERENCES public.zakat_calculations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: receipts receipts_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.attachments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: receipts receipts_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payment_transactions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: request_documents request_documents_attachment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.request_documents
    ADD CONSTRAINT request_documents_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.attachments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: request_documents request_documents_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.request_documents
    ADD CONSTRAINT request_documents_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: request_documents request_documents_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.request_documents
    ADD CONSTRAINT request_documents_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.assistance_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: request_status_history request_status_history_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.request_status_history
    ADD CONSTRAINT request_status_history_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.assistance_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sub_funds sub_funds_fund_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.sub_funds
    ADD CONSTRAINT sub_funds_fund_type_id_fkey FOREIGN KEY (fund_type_id) REFERENCES public.fund_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: subdistricts subdistricts_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.subdistricts
    ADD CONSTRAINT subdistricts_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_roles user_roles_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_roles user_roles_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_primary_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_primary_branch_id_fkey FOREIGN KEY (primary_branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: zakat_calculations zakat_calculations_rule_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.zakat_calculations
    ADD CONSTRAINT zakat_calculations_rule_version_id_fkey FOREIGN KEY (rule_version_id) REFERENCES public.zakat_rule_versions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: zakat_calculations zakat_calculations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.zakat_calculations
    ADD CONSTRAINT zakat_calculations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: zakat_rule_approvals zakat_rule_approvals_rule_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.zakat_rule_approvals
    ADD CONSTRAINT zakat_rule_approvals_rule_version_id_fkey FOREIGN KEY (rule_version_id) REFERENCES public.zakat_rule_versions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: zakat_rule_versions zakat_rule_versions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zms
--

ALTER TABLE ONLY public.zakat_rule_versions
    ADD CONSTRAINT zakat_rule_versions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.zakat_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: zms
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict aPHcjTqCbTUZ9cAiMAOEPOURdE3dego423DfHRGfF0QSkECbAaTkyzIhZg4nrN4

