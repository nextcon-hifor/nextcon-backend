// filepath: src/chat/message/chat-message.controller.ts
import { Controller, Post, Get, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ChatMessageService } from './message.service';
import { CreateMessageDto } from './dto/create_message.dto';

@Controller('chatmessages')
export class ChatMessageController {
  constructor(private readonly chatMessageService: ChatMessageService) {}

  //msg c
  @Post()
  async sendMessage(@Body() dto: CreateMessageDto) {
    console.log("Received payload:", dto);
    return await this.chatMessageService.saveMessage(dto);
  }

  //r
  @Get('room/:roomId')
  async getMessages(@Param('roomId', ParseIntPipe) roomId: number) {
    return await this.chatMessageService.getMessagesByRoom(roomId);
  }

  //u
  @Patch(':id')
  async updateMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body('content') content: string,
  ) {
    return await this.chatMessageService.updateMessage(id, content);
  }

  //d
  @Delete(':id')
  async deleteMessage(@Param('id', ParseIntPipe) id: number) {
    await this.chatMessageService.deleteMessage(id);
    return { message: 'Message deleted successfully' };
  }

}