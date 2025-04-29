import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ChatRoom } from '../room/room.entity';
import { User } from 'src/user/user.entity';

@Entity()
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  content: string;

  @Column({ nullable: true })
  roomId: number;

  @Column()
  timestamp: Date;

  @ManyToOne(() => ChatRoom, room => room.messages)
  room: ChatRoom;

  @ManyToOne(() => User, user => user.messages, { nullable: true })
  @JoinColumn({ name: 'senderId' })
  sender: User;
}