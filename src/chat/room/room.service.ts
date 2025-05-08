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

  async findRoom(): Promise<ChatRoom[]> {
    return await this.chatRoomRepository.find({
      relations: ['messages', 'users', 'event', 'event.createdBy'], //load data x(null)
      //module: repo주입 x
      order: {
        lastMessageAt: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async findRoomById(id: number): Promise<ChatRoom> {
    const room = await this.chatRoomRepository.findOne({
      where: { id },
      relations: ['messages', 'users', 'event', 'event.createdBy'],
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
      users: [],  // 빈 배열로 초기화
    });
    
    // 채팅방 저장
    const savedRoom = await this.chatRoomRepository.save(room);
    
    // 저장된 채팅방을 다시 조회하여 관계가 제대로 설정되었는지 확인
    const roomWithRelations = await this.chatRoomRepository.findOne({
      where: { id: savedRoom.id },
      relations: ['users', 'event'],
    });
    
    if (!roomWithRelations) {
      throw new Error('Failed to create chat room');
    }
    
    return roomWithRelations;
  }

  async updateRoom(id: number, dto: UpdateRoomDto): Promise<ChatRoom> {
    const room = await this.findRoomById(id);
    // 업데이트 필드 있으면 덮어쓰기
    if (dto.name !== undefined) {
      room.name = dto.name;
    }
    return await this.chatRoomRepository.save(room);
  }

  async deleteRoom(id: number): Promise<void> {
    const result = await this.chatRoomRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Chat room with ID "${id}" not found`);
    }
  }

  async findRoomByIdAndUser(roomId: number, userId: string) {
    const room = await this.chatRoomRepository.findOne({
      where: { id: roomId },
      relations: ['users','messages','event'], // 채팅방의 유저 목록 로드
    });
  
    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }
  
  
    // const isUserInRoom = room.users.some((user) => user.userId === userId);
    // if (!isUserInRoom) {
    //   throw new ForbiddenException(`User ${userId} does not have access to this room`);
    // }
    
  return room;
  }
}