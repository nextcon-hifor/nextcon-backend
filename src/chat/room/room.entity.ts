import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { ChatMessage } from '../message/message.entity';
import { User } from 'src/user/user.entity';
import { HiforEvent } from 'src/events/events.entity';

@Entity()
export class ChatRoom {
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column()
  name: string;

  @OneToMany(() => ChatMessage, message => message.room)
  messages: ChatMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastMessageAt: Date;

  @OneToMany(() => User, (user) => user.room, {cascade: true})
  users: User[]; // participant보다 user로 구현하는게 직관적

  @OneToOne(() => HiforEvent, (event) => event.chatRoom) //참조할거, 참조할 col
  @JoinColumn({ name: 'eventId' })
  event: HiforEvent;
}