import { IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculateFinancialZakatDto {
  @ApiPropertyOptional({ description: 'เงินสดในมือ (Cash on hand)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cash?: number = 0;

  @ApiPropertyOptional({ description: 'เงินฝากธนาคารทุกบัญชี (Bank savings)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bankSavings?: number = 0;

  @ApiPropertyOptional({ description: 'น้ำหนักทองคำแท่ง/รูปพรรณ (หน่วย: บาททอง)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  goldBahtWeight?: number = 0;

  @ApiPropertyOptional({ description: 'น้ำหนักทองคำ (หน่วย: กรัม)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  goldGrams?: number = 0;

  @ApiPropertyOptional({ description: 'น้ำหนักเงินบริสุทธิ์ (หน่วย: กรัม)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  silverGrams?: number = 0;

  @ApiPropertyOptional({ description: 'มูลค่าหุ้น กองทุนรวม สินทรัพย์ลงทุน (Shares & Investments)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sharesInvestments?: number = 0;

  @ApiPropertyOptional({ description: 'หนี้สินระยะสั้นที่ถึงกำหนดชำระในปีนี้ (Short-term debts)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shortTermDebts?: number = 0;

  @ApiPropertyOptional({ description: 'ทรัพย์สินครอบครองครบรอบปีจันทรคติ (1 ปีฮาวล์)', default: true })
  @IsOptional()
  @IsBoolean()
  isHawlComplete?: boolean = true;
}

export class CalculateIncomeZakatDto {
  @ApiProperty({ description: 'เงินเดือนและค่าจ้างรวมทั้งปี (Annual salary)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  annualSalary!: number;

  @ApiPropertyOptional({ description: 'โบนัส ค่าคอมมิชชัน และรายได้พิเศษอื่นๆ (Bonus & other income)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bonusOtherIncome?: number = 0;

  @ApiPropertyOptional({ description: 'ค่าใช้จ่ายส่วนตัวและเลี้ยงดูครอบครัวตามเกณฑ์จำเป็น (Personal & family expenses)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  personalDeductions?: number = 0;

  @ApiPropertyOptional({ description: 'หนี้สินจำเป็นที่ผ่อนชำระทั้งปี (Annual debt repayments)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  annualDebtPayments?: number = 0;
}

export class CalculateBusinessZakatDto {
  @ApiProperty({ description: 'สินทรัพย์หมุนเวียนและลูกหนี้การค้า (Current assets & receivables)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentAssets!: number;

  @ApiProperty({ description: 'มูลค่าสต็อกสินค้าคงเหลือตามราคาตลาด (Inventory value)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  inventoryValue!: number;

  @ApiPropertyOptional({ description: 'เงินสดและเงินฝากของกิจการ (Business cash)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  businessCash?: number = 0;

  @ApiPropertyOptional({ description: 'เจ้าหนี้การค้าและหนี้สินระยะสั้นของธุรกิจ (Business liabilities)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  businessDebts?: number = 0;
}

export class CalculateAgriZakatDto {
  @ApiProperty({ description: 'ผลผลิตเกษตรกรรมที่เก็บเกี่ยวได้ (กิโลกรัม)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cropKilos!: number;

  @ApiProperty({ description: 'ราคาตลาดต่อกิโลกรัม ณ วันเก็บเกี่ยว (บาท)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cropPricePerKg!: number;

  @ApiProperty({ description: 'รูปแบบการชลประทาน (rain: น้ำฝนธรรมชาติ 10%, irrigated: ชลประทาน/มีต้นทุน 5%)' })
  @IsNotEmpty()
  @IsIn(['rain', 'irrigated'])
  irrigationType!: 'rain' | 'irrigated';
}

export class CalculateLivestockZakatDto {
  @ApiPropertyOptional({ description: 'จำนวนวัวหรือควาย (Cattle count)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cattleCount?: number = 0;

  @ApiPropertyOptional({ description: 'จำนวนแพะหรือแกะ (Goat / Sheep count)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  goatCount?: number = 0;

  @ApiPropertyOptional({ description: 'ราคาประเมินลูกวัวอายุ 1 ปีต่อตัว (บาท)', default: 15000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  calfPriceEstimate?: number = 15000;

  @ApiPropertyOptional({ description: 'ราคาประเมินวัวสาวอายุ 2 ปีต่อตัว (บาท)', default: 22000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  heiferPriceEstimate?: number = 22000;

  @ApiPropertyOptional({ description: 'ราคาประเมินแพะ/แกะต่อตัว (บาท)', default: 4500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  goatPriceEstimate?: number = 4500;
}

export class UpdateGoldPriceDto {
  @ApiProperty({ description: 'ราคาทองคำแท่งต่อบาท (15.244 กรัม) ในประเทศไทย' })
  @Type(() => Number)
  @IsNumber()
  @Min(1000)
  goldPricePerBaht!: number;

  @ApiPropertyOptional({ description: 'ราคาทองคำบริสุทธิ์ต่อกรัม (บาท/กรัม)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  goldPricePerGram?: number;

  @ApiPropertyOptional({ description: 'ราคาเงินบริสุทธิ์ต่อกรัม (บาท/กรัม)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  silverPricePerGram?: number;

  @ApiPropertyOptional({ description: 'หมายเหตุหรือแหล่งที่มาของราคา' })
  @IsOptional()
  @IsString()
  sourceNotes?: string;
}

export class UnifiedZakatCalculationDto {
  @ApiProperty({ description: 'หมวดหมู่ซะกาต', enum: ['financial', 'income', 'business', 'agri', 'livestock'] })
  @IsNotEmpty()
  @IsIn(['financial', 'income', 'business', 'agri', 'livestock'])
  category!: 'financial' | 'income' | 'business' | 'agri' | 'livestock';

  @ApiProperty({ description: 'ข้อมูลประกอบการคำนวณตามหมวดหมู่' })
  @IsNotEmpty()
  payload!: Record<string, any>;
}

