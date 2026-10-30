import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/roles.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/auth-user';
import { ZakatCalculatorService } from './zakat-calculator.service';
import {
  CalculateFinancialZakatDto,
  CalculateIncomeZakatDto,
  CalculateBusinessZakatDto,
  CalculateAgriZakatDto,
  CalculateLivestockZakatDto,
  UpdateGoldPriceDto,
  UnifiedZakatCalculationDto,
} from './dto/zakat-calculator.dto';

@ApiTags('zakat')
@ApiBearerAuth()
@Controller('zakat')
export class ZakatCalculatorController {
  constructor(private readonly zakatService: ZakatCalculatorService) {}

  @Get('nisab-config')
  @ApiOperation({ summary: 'เกณฑ์นิศอบ (Nisab) และราคาทองคำ/เงินอ้างอิงปัจจุบัน' })
  getNisabConfig() {
    return this.zakatService.getNisabConfig();
  }

  @Get('formulas')
  @ApiOperation({ summary: 'สูตรและอัตราการคำนวณซะกาต 5 หมวดที่ผ่านการรับรองทางชะรีอะฮ์' })
  getFormulas() {
    return this.zakatService.getFormulas();
  }

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'คำนวณซะกาตตามหมวดหมู่ (Unified Calculation Endpoint)' })
  calculateUnified(@Body() dto: UnifiedZakatCalculationDto) {
    return this.zakatService.calculateUnified(dto);
  }

  @Post('calculate/financial')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'คำนวณซะกาตทรัพย์สินทางการเงินและเงินออม' })
  calculateFinancial(@Body() dto: CalculateFinancialZakatDto) {
    return this.zakatService.calculateFinancialZakat(dto);
  }

  @Post('calculate/income')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'คำนวณซะกาตรายได้และเงินเดือนสะสม' })
  calculateIncome(@Body() dto: CalculateIncomeZakatDto) {
    return this.zakatService.calculateIncomeZakat(dto);
  }

  @Post('calculate/business')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'คำนวณซะกาตธุรกิจการค้าและสินค้าคงเหลือ' })
  calculateBusiness(@Body() dto: CalculateBusinessZakatDto) {
    return this.zakatService.calculateBusinessZakat(dto);
  }

  @Post('calculate/agri')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'คำนวณซะกาตผลผลิตเกษตรกรรมและพืชพันธุ์' })
  calculateAgri(@Body() dto: CalculateAgriZakatDto) {
    return this.zakatService.calculateAgriZakat(dto);
  }

  @Post('calculate/livestock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'คำนวณซะกาตปศุสัตว์ (วัว ควาย แพะ แกะ)' })
  calculateLivestock(@Body() dto: CalculateLivestockZakatDto) {
    return this.zakatService.calculateLivestockZakat(dto);
  }

  @Patch('gold-price')
  @Roles('SUPER_ADMIN', 'FINANCE_OFFICER', 'TREASURER')
  @ApiOperation({ summary: 'อัปเดตราคาทองคำจริงและปรับเกณฑ์นิศอบอัตโนมัติ' })
  updateGoldPrice(
    @Body() dto: UpdateGoldPriceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.zakatService.updateGoldPrice(dto, user);
  }
}

