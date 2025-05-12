// filepath: src/chat/message/chat-message.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './message.entity';
import { CreateMessageDto } from './dto/create_message.dto';
import { UpdateRoomDto } from '../room/dto/update_room.dto';
import { ChatRoomService } from '../room/room.service';
import { User } from 'src/user/user.entity';

@Injectable()
export class ChatMessageService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
    private readonly chatRoomService: ChatRoomService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  //msg r
  async getMessagesByRoom(roomId: number): Promise<ChatMessage[]> {
    return await this.chatMessageRepository.find({
      where: { roomId },
      order: { timestamp: 'ASC' },
      relations: ['sender'],
    });
  }

  //msg create-> save in DB
  async saveMessage(dto: CreateMessageDto): Promise<ChatMessage> { 
    if (dto.roomId === undefined) {
      throw new NotFoundException('Room ID is undefined');
    }
    const room = await this.chatRoomService.findRoomById(dto.roomId); //room read하고
    const sender = await this.userRepository.findOne({ where: { id: dto.sender.id } });
  
    if (!sender) {
      throw new NotFoundException(`User with ID ${dto.sender.id} not found`);
    }
    const message = this.chatMessageRepository.create({ //msg 생성
      content: dto.content,
      roomId: dto.roomId,
      sender: sender,
      timestamp: new Date(),
    });

    // room의 msg시간 upd
    room.lastMessageAt = message.timestamp;
    const updateRoomDto: UpdateRoomDto={
      lastMessageAt: message.timestamp,
    };
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