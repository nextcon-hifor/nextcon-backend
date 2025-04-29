import { WebSocketGateway, WebSocketServer, SubscribeMessage, 
    MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatMessageService } from './message.service';
import { CreateMessageDto } from './dto/create_message.dto';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatMessageGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatMessageService: ChatMessageService) {}

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() messageDto: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const savedMessage = await this.chatMessageService.saveMessage(messageDto);
      
      // 실시간 메시지 브로드캐스트: 'room-{roomId}' 형식의 방에 메시지를 전달
      this.server.to(`room-${messageDto.roomId}`).emit('newMessage', {
        ...savedMessage,
        sender: client.id,
        timestamp: new Date(),
      });
      
      return { success: true, message: savedMessage };
    } catch (error) {
      client.emit('error', { message: 'Failed to send message' });
      return { success: false, error: error.message };
    }
  }
}