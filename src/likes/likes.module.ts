// src/likes/likes.module.ts

import { Module } from '@nestjs/common';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';

@Module({
  controllers: [LikesController],
  providers: [LikesService],
  exports: [LikesService], // 다른 모듈에서 LikesService를 사용할 수 있게 함
})
export class LikesModule {}
