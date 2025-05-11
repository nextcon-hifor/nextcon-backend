import { HttpException, HttpStatus, Injectable, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { eventImage } from './image.entity';
import { HiforEvent } from '../events/events.entity'; // 이벤트와 연동된다면 필요
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import supabase from 'src/supabase';

@Injectable()
export class ImageService {
  constructor(
    @InjectRepository(eventImage)
    private readonly imageRepository: Repository<eventImage>,
  ) {}

    @Post('upload-image-postEvent')
    @UseInterceptors(
    FileInterceptor('file', {
        storage: undefined, // Supabase 사용 시 Multer의 storage 필요 없음
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
        fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|heic|webp)$/)) {
            return callback(new HttpException('Only image files are allowed!', HttpStatus.BAD_REQUEST), false);
        }
        callback(null, true);
        },
    }),
    )
    async uploadImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
        }

        // 파일명 생성 (이벤트용 이미지라 event- 접두사 추가)
        const fileExt = extname(file.originalname);
        const fileName = `event-${Date.now()}${fileExt}`;

        // Supabase Storage에 업로드
        const { data, error } = await supabase.storage
            .from('event-images')
            .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
            });
        if (error) {
            throw new HttpException('Failed to upload image', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // Supabase에서 제공하는 퍼블릭 URL 생성
        const imageUrl = `https://vpivwjxuuobsmetklofb.supabase.co/storage/v1/object/public/event-images/${fileName}`;

        return {
            success: true,
            fileName: file.originalname,
            imageUrl,
        };
    }

    async saveImagesForEvent(urls: string[], event: HiforEvent, manager: EntityManager): Promise<void> {
        const imageEntities = urls.map((url) =>
        this.imageRepository.create({
            url,
            event,
        }),
        );
    
        await manager.save(eventImage, imageEntities);
    }
    
}
