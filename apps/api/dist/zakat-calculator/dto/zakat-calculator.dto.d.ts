export declare class CalculateFinancialZakatDto {
    cash?: number;
    bankSavings?: number;
    goldBahtWeight?: number;
    goldGrams?: number;
    silverGrams?: number;
    sharesInvestments?: number;
    shortTermDebts?: number;
    isHawlComplete?: boolean;
}
export declare class CalculateIncomeZakatDto {
    annualSalary: number;
    bonusOtherIncome?: number;
    personalDeductions?: number;
    annualDebtPayments?: number;
}
export declare class CalculateBusinessZakatDto {
    currentAssets: number;
    inventoryValue: number;
    businessCash?: number;
    businessDebts?: number;
}
export declare class CalculateAgriZakatDto {
    cropKilos: number;
    cropPricePerKg: number;
    irrigationType: 'rain' | 'irrigated';
}
export declare class CalculateLivestockZakatDto {
    cattleCount?: number;
    goatCount?: number;
    calfPriceEstimate?: number;
    heiferPriceEstimate?: number;
    goatPriceEstimate?: number;
}
export declare class UpdateGoldPriceDto {
    goldPricePerBaht: number;
    goldPricePerGram?: number;
    silverPricePerGram?: number;
    sourceNotes?: string;
}
export declare class UnifiedZakatCalculationDto {
    category: 'financial' | 'income' | 'business' | 'agri' | 'livestock';
    payload: Record<string, any>;
}
