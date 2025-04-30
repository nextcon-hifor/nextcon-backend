import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './room.entity';
import { CreateRoomDto } from './dto/create_room.dto';
import { UpdateRoomDto } from './dto/update_room.dto';

//findRoom, findRoomById, cudRoom
@Injectable()
export class ChatRoomService {
  constructor(
    @InjectRepository(ChatRoom)
    private chatRoomRepository: Repository<ChatRoom>,
  ) {}

  async findRoom(type: string): Promise<ChatRoom[]> {
    return await this.chatRoomRepository.find({
      where: { type },
      relations: ['messages'],
      order: {
        lastMessageAt: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async findRoomById(id: number): Promise<ChatRoom> {
    const room = await this.chatRoomRepository.findOne({
      where: { id },
      relations: ['messages'],
    });
    if (!room) {
      throw new NotFoundException(`Chat room with ID "${id}" not found`);
    }
    return room;
  }

  async createRoom(dto: CreateRoomDto): Promise<ChatRoom> {
    const room = this.chatRoomRepository.create({
      ...dto,
      lastMessageAt: new Date(),
    });
    return await this.chatRoomRepository.save(room);
  }

  async updateRoom(id: number, dto: UpdateRoomDto): Promise<ChatRoom> {
    const room = await this.findRoomById(id);
    // 업데이트 필드 있으면 덮어쓰기
    if (dto.name !== undefined) {
      room.name = dto.name;
    }
    if (dto.type !== undefined) {
      room.type = dto.type;
    }
    return await this.chatRoomRepository.save(room);
  }

  async deleteRoom(id: number): Promise<void> {
    const result = await this.chatRoomRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Chat room with ID "${id}" not found`);
    }
  }

  async findRoomByIdAndUser(roomId: number, userId: number) {
    const room = await this.chatRoomRepository.findOne({
      where: { id: roomId },
      relations: ['users','messages'], // 채팅방의 유저 목록 로드
    });
  
    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }
  
    // 사용자가 채팅방의 유저인지 확인
    const isUserInRoom = room.users.some(user => user.id === userId);
    if (!isUserInRoom) {
      throw new ForbiddenException(`User ${userId} does not have access to this room`);
    }
  
    return room;
  }
}