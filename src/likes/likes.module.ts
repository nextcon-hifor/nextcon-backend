// src/likes/likes.module.ts

import { Module } from '@nestjs/common';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/user.entity';
import { HiforEvent } from 'src/events/events.entity';
import { Participant } from 'src/participant/participant.entity';
import { Like } from './likes.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, HiforEvent, Participant, Like]),
  ],  
  controllers: [LikesController],
  providers: [LikesService],
  exports: [LikesService], // 다른 모듈에서 LikesService를 사용할 수 있게 함
})
export class LikesModule {}
