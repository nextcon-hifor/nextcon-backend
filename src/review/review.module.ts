import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './review.entity';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { HiforEvent } from '../events/events.entity';
import { User } from '../user/user.entity';
import { ReviewImageService } from '../review-image/review-image.service';
import { ReviewImage } from '../review-image/review-image.entity'; // 🔥 꼭 import 해야 함

@Module({
  imports: [TypeOrmModule.forFeature([Review, ReviewImage, HiforEvent, User])],
  controllers: [ReviewController],
  providers: [ReviewService, ReviewImageService],
  exports: [ReviewService],
})
export class ReviewModule {}