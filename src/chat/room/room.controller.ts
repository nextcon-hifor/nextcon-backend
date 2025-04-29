import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, NotFoundException, Query } from '@nestjs/common';
import { ChatRoomService } from './room.service';
import { CreateRoomDto } from './dto/create_room.dto';
import { UpdateRoomDto } from './dto/update_room.dto';

@Controller('api/chat/rooms')
export class ChatRoomController {
  constructor(private readonly chatRoomService: ChatRoomService) {}

  @Get()
  async listRooms(@Query('type') type: string = 'EVENT') {
    return await this.chatRoomService.findRoom(type);
  }

  @Get(':id')
  async getRoom(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.chatRoomService.findRoomById(id);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Post()
  async createRoom(@Body() dto: CreateRoomDto) {
    return await this.chatRoomService.createRoom(dto);
  }

  @Put(':id')
  async updateRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoomDto,
  ) {
    return await this.chatRoomService.updateRoom(id, dto);
  }


  @Delete(':id')
  async deleteRoom(@Param('id', ParseIntPipe) id: number){
    await this.chatRoomService.deleteRoom(id);
    return {message: 'Room deleted'};
  }
}