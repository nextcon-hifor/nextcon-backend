import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReviewService } from './review.service';
import { ReviewImageService } from 'src/review-image/review-image.service';
import { CreateReviewDto, UpdateReviewDto } from './review.dto';

@Controller('reviews')
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly reviewImageService: ReviewImageService,
  ) {}

  @Post('submit')
  async createReview(@Body() createReviewDto: CreateReviewDto) {
    try {
      const review = await this.reviewService.create(createReviewDto);
      return { success: true, review };
    } catch (error) {
      console.error(error);
      return { success: false, message: error.message };
    }
  }

  @Get('/event/:eventId')
  async getReviewsByEvent(@Param('eventId') eventId: number) {
    return this.reviewService.findByEvent(eventId);
  }

  @Get('/user/:userId')
  async getReviewsByUser(@Param('userId') userId: string) {
    return this.reviewService.findByUser(userId);
  }

  @Get('/host/:hostId/average')
  async getHostAverage(@Param('hostId') hostId: string) {
    return this.reviewService.getHostAverageRating(hostId);
  }

  // ✅ 리뷰 이미지 업로드 엔드포인트
  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(
            new HttpException('이미지 파일만 업로드 가능합니다.', HttpStatus.BAD_REQUEST),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadReviewImage(@UploadedFile() file: Express.Multer.File) {
    try {
      const result = await this.reviewImageService.uploadImage(file);
      return { success: true, imageUrl: result.imageUrl };
    } catch (error) {
      console.error(error);
      return { success: false, message: error.message };
    }
  }
}