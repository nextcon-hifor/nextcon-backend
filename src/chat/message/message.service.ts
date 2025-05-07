// filepath: src/chat/message/chat-message.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './message.entity';
import { CreateMessageDto } from './dto/create_message.dto';
import { UpdateRoomDto } from '../room/dto/update_room.dto';
import { ChatRoomService } from '../room/room.service';

@Injectable()
export class ChatMessageService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
    private readonly chatRoomService: ChatRoomService,
  ) {}

  //msg r
  async getMessagesByRoom(roomId: number): Promise<ChatMessage[]> {
    return await this.chatMessageRepository.find({
      where: { roomId },
      order: { timestamp: 'ASC' },
    });
  }

  //msg create-> save in DB
  async saveMessage(dto: CreateMessageDto): Promise<ChatMessage> { 
    if (dto.roomId === undefined) {
      throw new NotFoundException('Room ID is undefined');
    }
    const room = await this.chatRoomService.findRoomById(dto.roomId); //room read하고
    const message = this.chatMessageRepository.create({ //msg 생성
      ...dto,
      timestamp: new Date(),
    });

    // room의 msg시간 upd
    room.lastMessageAt = message.timestamp;
    const updateRoomDto: UpdateRoomDto={
      lastMessageAt: message.timestamp,
    }
    await this.chatRoomService.updateRoom(room.id, updateRoomDto);

    return await this.chatMessageRepository.save(message);
  }

  //msg u
  async updateMessage(id: number, content: string): Promise<ChatMessage> {
      const message = await this.chatMessageRepository.findOne({ where: { id } });
      if (!message) {
          throw new NotFoundException(`Message with ID ${id} not found`);
      }
      message.content = content;
      message.timestamp = new Date();
      return await this.chatMessageRepository.save(message);
  }

  //msg d
  async deleteMessage(id: number): Promise<void> {
      const result = await this.chatMessageRepository.delete(id);
      if (result.affected === 0) {
          throw new NotFoundException(`Message with ID ${id} not found`);
      }
  }
  
}