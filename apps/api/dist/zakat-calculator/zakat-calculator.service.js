"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZakatCalculatorService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const app_exception_1 = require("../common/app.exception");
let ZakatCalculatorService = class ZakatCalculatorService {
    prisma;
    audit;
    nisabConfig = {
        goldPricePerBaht: 42500,
        goldPricePerGram: 2795,
        goldNisabGrams: 85,
        goldNisabValueThb: 237575,
        silverPricePerGram: 35,
        silverNisabGrams: 595,
        silverNisabValueThb: 20825,
        agriNisabKg: 653,
        lastUpdated: new Date().toISOString(),
        certifiedBy: 'คณะกรรมการชะรีอะฮ์และนักวิชาการศาสนามูลนิธิฯ',
    };
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async getNisabConfig() {
        const activeGoldFormula = await this.prisma.zakatFormulaVersion.findFirst({
            where: { category: 'financial', isActive: true },
            orderBy: { createdAt: 'desc' },
        });
        if (activeGoldFormula) {
            this.nisabConfig.goldNisabValueThb = Number(activeGoldFormula.nisabValueThb);
            this.nisabConfig.goldPricePerGram = Math.round(this.nisabConfig.goldNisabValueThb / 85);
            this.nisabConfig.goldPricePerBaht = Math.round(this.nisabConfig.goldPricePerGram * 15.244);
        }
        return { ...this.nisabConfig };
    }
    async getFormulas() {
        const formulas = await this.prisma.zakatFormulaVersion.findMany({
            where: { isActive: true },
            orderBy: { category: 'asc' },
        });
        return formulas.map((f) => ({
            ...f,
            nisabValueThb: Number(f.nisabValueThb),
            ratePercentage: Number(f.ratePercentage),
        }));
    }
    async calculateFinancialZakat(dto) {
        const config = await this.getNisabConfig();
        let goldValue = 0;
        if (dto.goldGrams && dto.goldGrams > 0) {
            goldValue = dto.goldGrams * config.goldPricePerGram;
        }
        else if (dto.goldBahtWeight && dto.goldBahtWeight > 0) {
            goldValue = dto.goldBahtWeight * config.goldPricePerBaht;
        }
        const silverValue = (dto.silverGrams || 0) * config.silverPricePerGram;
        const cash = dto.cash || 0;
        const bankSavings = dto.bankSavings || 0;
        const sharesInvestments = dto.sharesInvestments || 0;
        const shortTermDebts = dto.shortTermDebts || 0;
        const isHawlComplete = dto.isHawlComplete ?? true;
        const grossAssets = cash + bankSavings + goldValue + silverValue + sharesInvestments;
        const netWealth = Math.max(0, grossAssets - shortTermDebts);
        const nisabThreshold = config.goldNisabValueThb;
        const isEligible = netWealth >= nisabThreshold && isHawlComplete;
        const ratePercentage = 2.5;
        const zakatDue = isEligible ? Math.round(netWealth * 0.025) : 0;
        return {
            category: 'financial',
            categoryNameTh: 'ซะกาตทรัพย์สินทางการเงินและเงินออม',
            breakdown: {
                cash,
                bankSavings,
                goldValue: Math.round(goldValue),
                silverValue: Math.round(silverValue),
                sharesInvestments,
                shortTermDebts,
                isHawlComplete,
            },
            grossAssets: Math.round(grossAssets),
            deductions: shortTermDebts,
            netWealth: Math.round(netWealth),
            nisabThreshold,
            isHawlComplete,
            isEligible,
            ratePercentage,
            zakatDue,
            notes: isEligible
                ? `ทรัพย์สินสุทธิ ฿${netWealth.toLocaleString()} เกินเกณฑ์นิศอบ (฿${nisabThreshold.toLocaleString()}) และครบรอบ 1 ปีฮาวล์ ต้องจ่ายซะกาต 2.5%`
                : !isHawlComplete
                    ? 'ทรัพย์สินยังไม่ครบรอบ 1 ปีจันทรคติ (ยังไม่ครบเงื่อนไขฮาวล์)'
                    : `ทรัพย์สินสุทธิ ฿${netWealth.toLocaleString()} ยังไม่ถึงเกณฑ์นิศอบ (฿${nisabThreshold.toLocaleString()}) จึงยังไม่จำเป็นต้องจ่ายซะกาต`,
        };
    }
    async calculateIncomeZakat(dto) {
        const config = await this.getNisabConfig();
        const annualSalary = dto.annualSalary || 0;
        const bonusOtherIncome = dto.bonusOtherIncome || 0;
        const personalDeductions = dto.personalDeductions || 0;
        const annualDebtPayments = dto.annualDebtPayments || 0;
        const grossIncome = annualSalary + bonusOtherIncome;
        const totalDeductions = personalDeductions + annualDebtPayments;
        const netIncome = Math.max(0, grossIncome - totalDeductions);
        const nisabThreshold = config.goldNisabValueThb;
        const isEligible = netIncome >= nisabThreshold;
        const ratePercentage = 2.5;
        const zakatDue = isEligible ? Math.round(netIncome * 0.025) : 0;
        return {
            category: 'income',
            categoryNameTh: 'ซะกาตรายได้และเงินเดือนสะสม',
            breakdown: {
                annualSalary,
                bonusOtherIncome,
                personalDeductions,
                annualDebtPayments,
            },
            grossAssets: grossIncome,
            deductions: totalDeductions,
            netWealth: netIncome,
            nisabThreshold,
            isHawlComplete: true,
            isEligible,
            ratePercentage,
            zakatDue,
            notes: isEligible
                ? `รายได้สุทธิหลังหักค่าใช้จ่าย ฿${netIncome.toLocaleString()} ถึงเกณฑ์นิศอบ ต้องจ่ายซะกาต 2.5% เป็นเงิน ฿${zakatDue.toLocaleString()} บาท`
                : `รายได้สุทธิหลังหักค่าใช้จ่าย ฿${netIncome.toLocaleString()} ยังไม่ถึงเกณฑ์นิศอบ (฿${nisabThreshold.toLocaleString()})`,
        };
    }
    async calculateBusinessZakat(dto) {
        const config = await this.getNisabConfig();
        const currentAssets = dto.currentAssets || 0;
        const inventoryValue = dto.inventoryValue || 0;
        const businessCash = dto.businessCash || 0;
        const businessDebts = dto.businessDebts || 0;
        const grossAssets = currentAssets + inventoryValue + businessCash;
        const netWealth = Math.max(0, grossAssets - businessDebts);
        const nisabThreshold = config.goldNisabValueThb;
        const isEligible = netWealth >= nisabThreshold;
        const ratePercentage = 2.5;
        const zakatDue = isEligible ? Math.round(netWealth * 0.025) : 0;
        return {
            category: 'business',
            categoryNameTh: 'ซะกาตธุรกิจการค้าและสินค้าคงเหลือ',
            breakdown: {
                currentAssets,
                inventoryValue,
                businessCash,
                businessDebts,
            },
            grossAssets,
            deductions: businessDebts,
            netWealth,
            nisabThreshold,
            isHawlComplete: true,
            isEligible,
            ratePercentage,
            zakatDue,
            notes: isEligible
                ? `ทรัพย์สินสุทธิของธุรกิจ ฿${netWealth.toLocaleString()} เกินเกณฑ์นิศอบ ต้องจ่ายซะกาต 2.5% เป็นเงิน ฿${zakatDue.toLocaleString()} บาท`
                : `ทรัพย์สินสุทธิของธุรกิจ ฿${netWealth.toLocaleString()} ยังไม่ถึงเกณฑ์นิศอบ (฿${nisabThreshold.toLocaleString()})`,
        };
    }
    async calculateAgriZakat(dto) {
        const config = await this.getNisabConfig();
        const cropKilos = dto.cropKilos || 0;
        const cropPricePerKg = dto.cropPricePerKg || 0;
        const irrigationType = dto.irrigationType || 'irrigated';
        const grossCropValue = Math.round(cropKilos * cropPricePerKg);
        const nisabKg = config.agriNisabKg;
        const isEligible = cropKilos >= nisabKg;
        const ratePercentage = irrigationType === 'rain' ? 10.0 : 5.0;
        const zakatDue = isEligible ? Math.round(grossCropValue * (ratePercentage / 100)) : 0;
        const zakatInKilos = isEligible ? Math.round(cropKilos * (ratePercentage / 100)) : 0;
        return {
            category: 'agri',
            categoryNameTh: 'ซะกาตผลผลิตการเกษตรและพืชพันธุ์',
            breakdown: {
                cropKilos,
                cropPricePerKg,
                irrigationType,
                zakatInKilos,
            },
            grossAssets: grossCropValue,
            deductions: 0,
            netWealth: grossCropValue,
            nisabThreshold: Math.round(nisabKg * cropPricePerKg),
            nisabKg,
            isHawlComplete: true,
            isEligible,
            ratePercentage,
            zakatDue,
            zakatInKilos,
            notes: isEligible
                ? `ผลผลิตเก็บเกี่ยว ${cropKilos.toLocaleString()} กก. ถึงเกณฑ์นิศอบ (>= ${nisabKg} กก.) อัตรา ${ratePercentage}% (${irrigationType === 'rain' ? 'น้ำฝนธรรมชาติ 10%' : 'ชลประทาน/มีต้นทุน 5%'}) จ่ายเป็นผลผลิต ${zakatInKilos.toLocaleString()} กก. หรือคิดเป็นเงิน ฿${zakatDue.toLocaleString()} บาท`
                : `ผลผลิตเก็บเกี่ยว ${cropKilos.toLocaleString()} กก. ยังไม่ถึงเกณฑ์นิศอบ 5 วะสัก (${nisabKg} กก.)`,
        };
    }
    async calculateLivestockZakat(dto) {
        const cattleCount = dto.cattleCount || 0;
        const goatCount = dto.goatCount || 0;
        const calfPrice = dto.calfPriceEstimate || 15000;
        const heiferPrice = dto.heiferPriceEstimate || 22000;
        const goatPrice = dto.goatPriceEstimate || 4500;
        let cattleTabiCount = 0;
        let cattleMusinnahCount = 0;
        let cattleZakatDescription = 'ยังไม่ถึงเกณฑ์นิศอบ (ขั้นต่ำ 30 ตัว)';
        if (cattleCount >= 30) {
            if (cattleCount < 40) {
                cattleTabiCount = 1;
                cattleZakatDescription = 'ลูกวัวอายุ 1 ปี (ตะบีอ์) 1 ตัว';
            }
            else if (cattleCount < 60) {
                cattleMusinnahCount = 1;
                cattleZakatDescription = 'วัวสาวอายุ 2 ปี (มูซินนะฮ์) 1 ตัว';
            }
            else if (cattleCount < 70) {
                cattleTabiCount = 2;
                cattleZakatDescription = 'ลูกวัวอายุ 1 ปี 2 ตัว';
            }
            else if (cattleCount < 80) {
                cattleTabiCount = 1;
                cattleMusinnahCount = 1;
                cattleZakatDescription = 'ลูกวัวอายุ 1 ปี 1 ตัว และวัวสาวอายุ 2 ปี 1 ตัว';
            }
            else if (cattleCount < 90) {
                cattleMusinnahCount = 2;
                cattleZakatDescription = 'วัวสาวอายุ 2 ปี 2 ตัว';
            }
            else if (cattleCount < 100) {
                cattleTabiCount = 3;
                cattleZakatDescription = 'ลูกวัวอายุ 1 ปี 3 ตัว';
            }
            else {
                let bestTabi = 0;
                let bestMusinnah = 0;
                let minRemainder = 9999;
                for (let m = 0; m * 40 <= cattleCount; m++) {
                    const rem = cattleCount - m * 40;
                    const t = Math.floor(rem / 30);
                    const finalRem = rem % 30;
                    if (finalRem < minRemainder) {
                        minRemainder = finalRem;
                        bestTabi = t;
                        bestMusinnah = m;
                    }
                }
                cattleTabiCount = bestTabi;
                cattleMusinnahCount = bestMusinnah;
                cattleZakatDescription = `ลูกวัวอายุ 1 ปี ${cattleTabiCount} ตัว และวัวสาวอายุ 2 ปี ${cattleMusinnahCount} ตัว`;
            }
        }
        let goatDueCount = 0;
        let goatZakatDescription = 'ยังไม่ถึงเกณฑ์นิศอบ (ขั้นต่ำ 40 ตัว)';
        if (goatCount >= 40) {
            if (goatCount <= 120) {
                goatDueCount = 1;
                goatZakatDescription = 'แพะหรือแกะ 1 ตัว';
            }
            else if (goatCount <= 200) {
                goatDueCount = 2;
                goatZakatDescription = 'แพะหรือแกะ 2 ตัว';
            }
            else if (goatCount <= 399) {
                goatDueCount = 3;
                goatZakatDescription = 'แพะหรือแกะ 3 ตัว';
            }
            else {
                goatDueCount = Math.floor(goatCount / 100);
                goatZakatDescription = `แพะหรือแกะ ${goatDueCount} ตัว (1 ตัวต่อทุกๆ 100 ตัว)`;
            }
        }
        const cattleCashValue = cattleTabiCount * calfPrice + cattleMusinnahCount * heiferPrice;
        const goatCashValue = goatDueCount * goatPrice;
        const totalCashEstimate = cattleCashValue + goatCashValue;
        const isEligible = cattleCount >= 30 || goatCount >= 40;
        return {
            category: 'livestock',
            categoryNameTh: 'ซะกาตปศุสัตว์ (วัว ควาย แพะ แกะ)',
            breakdown: {
                cattleCount,
                goatCount,
                cattleTabiCount,
                cattleMusinnahCount,
                goatDueCount,
                cattleCashValue,
                goatCashValue,
            },
            grossAssets: totalCashEstimate,
            deductions: 0,
            netWealth: totalCashEstimate,
            nisabThreshold: 0,
            isHawlComplete: true,
            isEligible,
            ratePercentage: 0,
            zakatDue: totalCashEstimate,
            obligationDescription: {
                cattle: cattleZakatDescription,
                goat: goatZakatDescription,
            },
            notes: isEligible
                ? `เกณฑ์ซะกาตปศุสัตว์: วัว (${cattleZakatDescription}) มูลค่าประมาณ ฿${cattleCashValue.toLocaleString()} | แพะ/แกะ (${goatZakatDescription}) มูลค่าประมาณ ฿${goatCashValue.toLocaleString()}`
                : 'จำนวนสัตว์เลี้ยงยังไม่ถึงเกณฑ์นิศอบ (วัวขั้นต่ำ 30 ตัว / แพะแกะขั้นต่ำ 40 ตัว)',
        };
    }
    async calculateUnified(dto) {
        switch (dto.category) {
            case 'financial':
                return this.calculateFinancialZakat(dto.payload);
            case 'income':
                return this.calculateIncomeZakat(dto.payload);
            case 'business':
                return this.calculateBusinessZakat(dto.payload);
            case 'agri':
                return this.calculateAgriZakat(dto.payload);
            case 'livestock':
                return this.calculateLivestockZakat(dto.payload);
            default:
                throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'INVALID_CATEGORY', 'หมวดหมู่ซะกาตไม่ถูกต้อง');
        }
    }
    async updateGoldPrice(dto, user) {
        const goldPricePerBaht = dto.goldPricePerBaht;
        const goldPricePerGram = dto.goldPricePerGram || Math.round(goldPricePerBaht / 15.244);
        const newGoldNisab = Math.round(goldPricePerGram * 85);
        const silverPricePerGram = dto.silverPricePerGram || this.nisabConfig.silverPricePerGram;
        const newSilverNisab = Math.round(silverPricePerGram * 595);
        this.nisabConfig.goldPricePerBaht = goldPricePerBaht;
        this.nisabConfig.goldPricePerGram = goldPricePerGram;
        this.nisabConfig.goldNisabValueThb = newGoldNisab;
        this.nisabConfig.silverPricePerGram = silverPricePerGram;
        this.nisabConfig.silverNisabValueThb = newSilverNisab;
        this.nisabConfig.lastUpdated = new Date().toISOString();
        const newNisabDecimal = new client_1.Prisma.Decimal(newGoldNisab);
        await this.prisma.zakatFormulaVersion.updateMany({
            where: {
                category: { in: ['financial', 'income', 'business'] },
                isActive: true,
            },
            data: {
                nisabValueThb: newNisabDecimal,
                notes: `อัปเดตอิงราคาทองคำจริง ฿${goldPricePerBaht.toLocaleString()} บาท/บาททอง (${dto.sourceNotes || 'สมาคมค้าทองคำแห่งประเทศไทย'})`,
            },
        });
        await this.audit.write({
            actorId: user.id,
            action: 'UPDATE_ZAKAT_NISAB_GOLD_PRICE',
            resourceType: 'zakat_formula_version',
            resourceId: null,
            metadata: {
                goldPricePerBaht,
                goldPricePerGram,
                newNisabValueThb: newGoldNisab,
                updatedBy: user.displayName,
            },
        });
        return {
            success: true,
            updatedConfig: { ...this.nisabConfig },
            message: `อัปเดตราคาทองคำเป็น ฿${goldPricePerBaht.toLocaleString()} บาท/บาททอง สำเร็จ เกณฑ์นิศอบใหม่คือ ฿${newGoldNisab.toLocaleString()} บาท`,
        };
    }
};
exports.ZakatCalculatorService = ZakatCalculatorService;
exports.ZakatCalculatorService = ZakatCalculatorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], ZakatCalculatorService);
//# sourceMappingURL=zakat-calculator.service.js.map