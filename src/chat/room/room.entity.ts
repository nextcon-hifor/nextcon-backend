import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { ChatMessage } from '../message/message.entity';
import { User } from 'src/user/user.entity';
import { HiforEvent } from 'src/events/events.entity';

@Entity()
export class ChatRoom {
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column()
  name: string;

  @Column({ type: 'varchar', length: 20 })
  type: string; // EVENT, GENERAL 등의 타입을 저장

  @OneToMany(() => ChatMessage, message => message.room)
  messages: ChatMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastMessageAt: Date;

  @OneToMany(() => User, user => user.room)
  users: User[]; // 방에 속한 사용자들

  @OneToOne(() => HiforEvent, event => event.chatRoom, { nullable: true })
  event: HiforEvent;
}