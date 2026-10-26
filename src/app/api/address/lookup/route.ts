import { NextRequest, NextResponse } from 'next/server';
import {
  getProvinces,
  getDistricts,
  getSubdistricts,
  searchByZipCode,
  validateAddress,
  isBangkok,
  getDistrictLabel,
  getSubdistrictLabel,
} from '@/lib/thaiAddress';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const zipcode = searchParams.get('zipcode');
    const province = searchParams.get('province');
    const district = searchParams.get('district');
    const action = searchParams.get('action');

    // 1. Validation check
    if (action === 'validate') {
      const subdistrict = searchParams.get('subdistrict');
      const result = validateAddress(zipcode, province, district, subdistrict);
      return NextResponse.json({
        success: true,
        validation: result,
      });
    }

    // 2. Postal code lookup (5-digit)
    if (zipcode) {
      const cleanZip = zipcode.trim();
      if (!/^\d{5}$/.test(cleanZip)) {
        return NextResponse.json(
          {
            success: false,
            error: 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก',
            matches: [],
            count: 0,
          },
          { status: 400 }
        );
      }

      const matches = searchByZipCode(cleanZip);
      return NextResponse.json({
        success: true,
        zipcode: cleanZip,
        matches,
        count: matches.length,
      });
    }

    // 3. Subdistricts for province + district
    if (province && district) {
      const subdistricts = getSubdistricts(province, district);
      return NextResponse.json({
        success: true,
        province,
        district,
        isBangkok: isBangkok(province),
        districtLabel: getDistrictLabel(province),
        subdistrictLabel: getSubdistrictLabel(province),
        subdistricts,
        count: subdistricts.length,
      });
    }

    // 4. Districts for province
    if (province) {
      const districts = getDistricts(province);
      return NextResponse.json({
        success: true,
        province,
        isBangkok: isBangkok(province),
        districtLabel: getDistrictLabel(province),
        subdistrictLabel: getSubdistrictLabel(province),
        districts,
        count: districts.length,
      });
    }

    // 5. Default: List of all 77 provinces
    const provinces = getProvinces();
    return NextResponse.json({
      success: true,
      provinces,
      count: provinces.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการค้นหาข้อมูลที่อยู่',
      },
      { status: 500 }
    );
  }
}
