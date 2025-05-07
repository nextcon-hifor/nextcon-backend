import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatRoomService } from './room.service';
import { CreateRoomDto } from './dto/create_room.dto';

@WebSocketGateway({ //socket gateway
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
export class ChatRoomGateway implements OnGatewayConnection {
  @WebSocketServer() //server 주입
  server: Server;

  //room 관련 logic
  constructor(private readonly chatRoomService: ChatRoomService) {}

  async handleConnection(client: Socket) {
    try { //연결시마다
      const rooms = await this.chatRoomService.findRoom();
      client.emit('rooms', rooms);
    } catch (error) {
      client.emit('error', { message: 'Failed to fetch rooms' });
    }
  }

  @SubscribeMessage('createRoom')
  async handleCreateRoom(
    @MessageBody() createRoomDto: CreateRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const room = await this.chatRoomService.createRoom(createRoomDto);
      // 실시간 새 방 알림
      this.server.emit('newRoom', room);
      return { success: true, room };
    } catch (error) {
      client.emit('error', { message: 'Failed to create room' });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody('roomId') roomId: number,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // 기존 room- 접두사가 붙은 방에서 퇴장
      const currentRooms = [...client.rooms];
      currentRooms.forEach(r => {
        if (r.startsWith('room-')) client.leave(r);
      });
      const roomKey = `room-${roomId}`;
      await client.join(roomKey);
      this.server.to(roomKey).emit('userJoined', {
        userId: client.id,
        timestamp: new Date(),
      });
      return { success: true };
    } catch (error) {
      client.emit('error', { message: 'Failed to join room' });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody('roomId') roomId: number,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const roomKey = `room-${roomId}`;
      await client.leave(roomKey);
      this.server.to(roomKey).emit('userLeft', {
        userId: client.id,
        timestamp: new Date(),
      });
      return { success: true };
    } catch (error) {
      client.emit('error', { message: 'Failed to leave room' });
      return { success: false, error: error.message };
    }
  }
}