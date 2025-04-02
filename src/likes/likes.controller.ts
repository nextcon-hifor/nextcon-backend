import {
  Controller,
  Post,
  Body,
  Delete,
  Param,
  Get,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { LikesService } from './likes.service';
import { EventsService } from 'src/events/events.service';

@Controller('likes')
export class LikesController {
  constructor(
    private readonly likesService: LikesService,
  ) {}

    @Post(':eventId/like')
    async toggleLike(@Param('eventId', ParseIntPipe) eventId: number, @Body('userId') userId: string) {
    const updatedLikes = await this.likesService.toggleLike(eventId, userId);
    return { likesLen: updatedLikes };
    }

    // 좋아요 상태 확인
    @Get(':eventId/isLiked')
    async isLiked(
    @Param('eventId') eventId: number,
    @Query('userId') userId: string,
    ): Promise<{ isLiked: boolean }> {
    const isLiked = await this.likesService.checkLikeStatus(eventId, userId);
    return { isLiked };
    }
}
