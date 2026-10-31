import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { RequirePermissions } from '../common/permissions.decorator';
import { ReviewDocumentDto, UploadDocumentDto } from '../common/request.dto';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@Controller()
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('beneficiaries/:beneficiaryId/documents')
  @RequirePermissions('documents.read')
  @ApiOperation({ summary: 'รายการเอกสาร ไม่มี URL สาธารณะ' })
  list(@Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string) {
    return this.documents.list(beneficiaryId);
  }

  @Post('beneficiaries/:beneficiaryId/documents')
  @RequirePermissions('documents.write')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'อัปโหลดเอกสารไปที่เก็บส่วนตัว' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(
    @Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documents.upload(
      beneficiaryId,
      file === undefined
        ? undefined
        : { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype },
      dto.documentType,
      user,
      dto.replacesDocumentId,
    );
  }

  @Patch('documents/:documentId/review')
  @RequirePermissions('documents.review')
  @ApiOperation({ summary: 'ให้ผลตรวจเอกสาร' })
  review(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: ReviewDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documents.review(documentId, dto, user);
  }

  @Delete('documents/:documentId')
  @RequirePermissions('documents.delete')
  @ApiOperation({ summary: 'ปิดใช้งานเอกสารโดยไม่ลบแถว' })
  remove(@Param('documentId', ParseUUIDPipe) documentId: string, @CurrentUser() user: AuthUser) {
    return this.documents.remove(documentId, user);
  }

  @Get('documents/:documentId/content')
  @RequirePermissions('documents.read')
  @ApiOperation({ summary: 'ดาวน์โหลดเอกสารหลังตรวจสิทธิ์' })
  async content(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Query('inline') inline: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    const file = await this.documents.readContent(documentId, user);
    const kind = inline === '1' ? 'inline' : 'attachment';
    return new StreamableFile(file.bytes, {
      type: file.mimeType,
      disposition: `${kind}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    });
  }
}
