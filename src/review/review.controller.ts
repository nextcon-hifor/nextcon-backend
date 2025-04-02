import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
  } from '@nestjs/common';
  import { ReviewService } from './review.service';
  import { CreateReviewDto, UpdateReviewDto } from './review.dto';
  import { User } from '../user/user.entity';

  
  @Controller('reviews')
  export class ReviewController {
    constructor(private readonly reviewService: ReviewService) {}
  
    @Post('submit')
    // @UseGuards(SessionAuthGuard)
    async createReview(@Body() createReviewDto: CreateReviewDto) {
      try {
        const review = await this.reviewService.create(createReviewDto);
        return { success: true, review };
      } catch (error) {
        console.error(error);
        return { success: false, message: error.message };
      }
    }

  }
  