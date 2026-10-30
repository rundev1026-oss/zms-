import type { AuthUser } from '../common/auth-user';
import { ZakatCalculatorService } from './zakat-calculator.service';
import { CalculateFinancialZakatDto, CalculateIncomeZakatDto, CalculateBusinessZakatDto, CalculateAgriZakatDto, CalculateLivestockZakatDto, UpdateGoldPriceDto, UnifiedZakatCalculationDto } from './dto/zakat-calculator.dto';
export declare class ZakatCalculatorController {
    private readonly zakatService;
    constructor(zakatService: ZakatCalculatorService);
    getNisabConfig(): Promise<import("./zakat-calculator.service").NisabConfig>;
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
    calculateFinancial(dto: CalculateFinancialZakatDto): Promise<{
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
    calculateIncome(dto: CalculateIncomeZakatDto): Promise<{
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
    calculateBusiness(dto: CalculateBusinessZakatDto): Promise<{
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
    calculateAgri(dto: CalculateAgriZakatDto): Promise<{
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
    calculateLivestock(dto: CalculateLivestockZakatDto): Promise<{
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
