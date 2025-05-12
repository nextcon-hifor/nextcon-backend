import { WebSocketGateway, WebSocketServer, SubscribeMessage, 
    MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatMessageService } from './message.service';
import { CreateMessageDto } from './dto/create_message.dto';

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://www.hifor.kr',
        'http://localhost:3000',
        'http://localhost:8081',
        'https://nextcon-frontend-kappa.vercel.app',
      ];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
  path: '/socket.io',
})
export class ChatMessageGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatMessageService: ChatMessageService) {}

  @SubscribeMessage('join')
  handleJoinRoom(
    @MessageBody() data: { roomId: number },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`room-${data.roomId}`);
    // 필요하다면 입장 알림 등 emit 가능
    console.log(`소켓 ${client.id}가 room-${data.roomId}에 join`);
  }
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() messageDto: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const savedMessage =
        await this.chatMessageService.saveMessage(messageDto);

      // 실시간 메시지 브로드캐스트: 'room-{roomId}' 형식의 방에 메시지를 전달
      this.server.to(`room-${messageDto.roomId}`).emit('newMessage', {
        ...savedMessage,
        sender: messageDto.sender,
        timestamp: new Date(),
      });

      return { success: true, message: savedMessage };
    } catch (error) {
      client.emit('error', { message: 'Failed to send message' });
      return { success: false, error: error.message };
    }
  }
}