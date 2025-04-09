// review-image.service.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { extname } from 'path';
import supabase from 'src/supabase';

@Injectable()
export class ReviewImageService {
  async uploadImage(file: Express.Multer.File): Promise<{ imageUrl: string }> {
    if (!file) {
      throw new HttpException('파일이 업로드되지 않았습니다.', HttpStatus.BAD_REQUEST);
    }

    const fileExt = extname(file.originalname);
    const fileName = `review-${Date.now()}${fileExt}`;

    const { data, error } = await supabase.storage
      .from('review-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new HttpException('이미지 업로드 실패', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const imageUrl = `https://vpivwjxuuobsmetklofb.supabase.co/storage/v1/object/public/review-images/${fileName}`;
    return { imageUrl };
  }
}
