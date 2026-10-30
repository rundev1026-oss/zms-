import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { CalculateFinancialZakatDto, CalculateIncomeZakatDto, CalculateBusinessZakatDto, CalculateAgriZakatDto, CalculateLivestockZakatDto, UpdateGoldPriceDto, UnifiedZakatCalculationDto } from './dto/zakat-calculator.dto';
export interface NisabConfig {
    goldPricePerBaht: number;
    goldPricePerGram: number;
    goldNisabGrams: number;
    goldNisabValueThb: number;
    silverPricePerGram: number;
    silverNisabGrams: number;
    silverNisabValueThb: number;
    agriNisabKg: number;
    lastUpdated: string;
    certifiedBy: string;
}
export declare class ZakatCalculatorService {
    private readonly prisma;
    private readonly audit;
    private nisabConfig;
    constructor(prisma: PrismaService, audit: AuditService);
    getNisabConfig(): Promise<NisabConfig>;
    getFormulas(): Promise<{
        nisabValueThb: number;
        ratePercentage: number;
        id: string;
        legacyId: string | null;
        createdAt: Date;
        isActive: boolean;
        category: string;
        notes: string | null;
        effectiveDate: string;
        version: string;
        categoryNameTh: string;
        nisabStandard: string;
        approvedBy: string;
    }[]>;
    calculateFinancialZakat(dto: CalculateFinancialZakatDto): Promise<{
        category: string;
        categoryNameTh: string;
        breakdown: {
            cash: number;
            bankSavings: number;
            goldValue: number;
            silverValue: number;
            sharesInvestments: number;
            shortTermDebts: number;
            isHawlComplete: boolean;
        };
        grossAssets: number;
        deductions: number;
        netWealth: number;
        nisabThreshold: number;
        isHawlComplete: boolean;
        isEligible: boolean;
        ratePercentage: number;
        zakatDue: number;
        notes: string;
    }>;
    calculateIncomeZakat(dto: CalculateIncomeZakatDto): Promise<{
        category: string;
        categoryNameTh: string;
        breakdown: {
            annualSalary: number;
            bonusOtherIncome: number;
            personalDeductions: number;
            annualDebtPayments: number;
        };
        grossAssets: number;
        deductions: number;
        netWealth: number;
        nisabThreshold: number;
        isHawlComplete: boolean;
        isEligible: boolean;
        ratePercentage: number;
        zakatDue: number;
        notes: string;
    }>;
    calculateBusinessZakat(dto: CalculateBusinessZakatDto): Promise<{
        category: string;
        categoryNameTh: string;
        breakdown: {
            currentAssets: number;
            inventoryValue: number;
            businessCash: number;
            businessDebts: number;
        };
        grossAssets: number;
        deductions: number;
        netWealth: number;
        nisabThreshold: number;
        isHawlComplete: boolean;
        isEligible: boolean;
        ratePercentage: number;
        zakatDue: number;
        notes: string;
    }>;
    calculateAgriZakat(dto: CalculateAgriZakatDto): Promise<{
        category: string;
        categoryNameTh: string;
        breakdown: {
            cropKilos: number;
            cropPricePerKg: number;
            irrigationType: "rain" | "irrigated";
            zakatInKilos: number;
        };
        grossAssets: number;
        deductions: number;
        netWealth: number;
        nisabThreshold: number;
        nisabKg: number;
        isHawlComplete: boolean;
        isEligible: boolean;
        ratePercentage: number;
        zakatDue: number;
        zakatInKilos: number;
        notes: string;
    }>;
    calculateLivestockZakat(dto: CalculateLivestockZakatDto): Promise<{
        category: string;
        categoryNameTh: string;
        breakdown: {
            cattleCount: number;
            goatCount: number;
            cattleTabiCount: number;
            cattleMusinnahCount: number;
            goatDueCount: number;
            cattleCashValue: number;
            goatCashValue: number;
        };
        grossAssets: number;
        deductions: number;
        netWealth: number;
        nisabThreshold: number;
        isHawlComplete: boolean;
        isEligible: boolean;
        ratePercentage: number;
        zakatDue: number;
        obligationDescription: {
            cattle: string;
            goat: string;
        };
        notes: string;
    }>;
    calculateUnified(dto: UnifiedZakatCalculationDto): Promise<{
        category: string;
        categoryNameTh: string;
        breakdown: {
            cash: number;
            bankSavings: number;
            goldValue: number;
            silverValue: number;
            sharesInvestments: number;
            shortTermDebts: number;
            isHawlComplete: boolean;
        };
        grossAssets: number;
        deductions: number;
        netWealth: number;
        nisabThreshold: number;
        isHawlComplete: boolean;
        isEligible: boolean;
        ratePercentage: number;
        zakatDue: number;
        notes: string;
    } | {
        category: string;
        categoryNameTh: string;
        breakdown: {
            annualSalary: number;
            bonusOtherIncome: number;
            personalDeductions: number;
            annualDebtPayments: number;
        };
        grossAssets: number;
        deductions: number;
        netWealth: number;
        nisabThreshold: number;
        isHawlComplete: boolean;
        isEligible: boolean;
        ratePercentage: number;
        zakatDue: number;
        notes: string;
    } | {
        category: string;
        categoryNameTh: string;
        breakdown: {
            currentAssets: number;
            inventoryValue: number;
            businessCash: number;
            businessDebts: number;
        };
        grossAssets: number;
        deductions: number;
        netWealth: number;
        nisabThreshold: number;
        isHawlComplete: boolean;
        isEligible: boolean;
        ratePercentage: number;
        zakatDue: number;
        notes: string;
    } | {
        category: string;
        categoryNameTh: string;
        breakdown: {
            cropKilos: number;
            cropPricePerKg: number;
            irrigationType: "rain" | "irrigated";
            zakatInKilos: number;
        };
        grossAssets: number;
        deductions: number;
        netWealth: number;
        nisabThreshold: number;
        nisabKg: number;
        isHawlComplete: boolean;
        isEligible: boolean;
        ratePercentage: number;
        zakatDue: number;
        zakatInKilos: number;
        notes: string;
    } | {
        category: string;
        categoryNameTh: string;
        breakdown: {
            cattleCount: number;
            goatCount: number;
            cattleTabiCount: number;
            cattleMusinnahCount: number;
            goatDueCount: number;
            cattleCashValue: number;
            goatCashValue: number;
        };
        grossAssets: number;
        deductions: number;
        netWealth: number;
        nisabThreshold: number;
        isHawlComplete: boolean;
        isEligible: boolean;
        ratePercentage: number;
        zakatDue: number;
        obligationDescription: {
            cattle: string;
            goat: string;
        };
        notes: string;
    }>;
    updateGoldPrice(dto: UpdateGoldPriceDto, user: AuthUser): Promise<{
        success: boolean;
        updatedConfig: {
            goldPricePerBaht: number;
            goldPricePerGram: number;
            goldNisabGrams: number;
            goldNisabValueThb: number;
            silverPricePerGram: number;
            silverNisabGrams: number;
            silverNisabValueThb: number;
            agriNisabKg: number;
            lastUpdated: string;
            certifiedBy: string;
        };
        message: string;
    }>;
}
