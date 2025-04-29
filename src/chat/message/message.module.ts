import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './message.entity';
import { ChatMessageService } from './message.service';
import { ChatMessageController } from './message.controller';
import { ChatMessageGateway } from './message.gateway';
import { ChatRoomModule } from '../room/room.module'; // ChatRoomModule import

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage]),
    ChatRoomModule, // ChatRoomService 제공 모듈을 import 합니다.
  ],
  controllers: [ChatMessageController],
  providers: [ChatMessageService, ChatMessageGateway],
  exports: [ChatMessageService],
})
export class ChatMessageModule {}