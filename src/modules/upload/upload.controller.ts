// upload.controller.ts
import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException, Delete, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('image') // Đổi endpoint từ 'avatar' thành 'image'
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    // Kiểm tra file có tồn tại không
    if (!file) {
      throw new BadRequestException('File không được để trống');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận file ảnh (JPEG, PNG, JPG, WEBP)');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File không được vượt quá 5MB');
    }

    // Upload file và lấy URL
    const imageUrl = await this.uploadService.uploadLocalImage(file);
    return {
      success: true,
      message: 'Upload ảnh thành công',
      data: { url: imageUrl },
    };
  }

  @Delete('image')
  async deleteImage(@Body() body: { url: string }) {
    const { url } = body;
    
    if (!url) {
      throw new BadRequestException('URL ảnh không được để trống');
    }

    await this.uploadService.deleteLocalImage(url);
    
    return {
      success: true,
      message: 'Xóa ảnh thành công',
    };
  }
}
