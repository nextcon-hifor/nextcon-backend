// user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToMany, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

import { HiforEvent } from 'src/events/events.entity';
import { Participant } from 'src/participant/participant.entity';
import { Like } from 'src/likes/likes.entity';
import {Review} from 'src/review/review.entity'
import { BaseEntity } from 'src/common/entities/base.entity';
import { ChatMessage } from 'src/chat/message/message.entity';
import { ChatRoom } from 'src/chat/room/room.entity';

@Entity()
export class User extends BaseEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true})
  password: string;

  @Column()
  username: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  profileImage: string;  // 프사

  @Column({ nullable: true })
  phoneNumber: string;  // 휴대폰 번호

  @Column({ nullable: true })
  nationality: string;  // 국적

  @Column({ type: 'date', nullable: true })
  dob: Date;  // 생년월일

  @Column({ nullable: true })
  gender: string;  // 성별 (예: 남성, 여성, 기타)  
  
  @Column({ nullable: true })
  university: string;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP' })
  passwordLastChanged: Date;
  
  @Column({ default: false })
  passwordReset: boolean;

  @OneToMany(() => HiforEvent, (event) => event.createdBy)
  events: HiforEvent[]; // 사용자가 생성한 이벤트 목록
  
  @OneToMany(() => Participant, (participant) => participant.user)
  participations: Participant[]; // 사용자가 참가한 이벤트 목록

  @OneToMany(() => Like, (like) => like.user)
  likes: Like[]; // 사용자가 좋아요를 누른 목록

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];

  @OneToMany(() => ChatMessage, message => message.sender)
  messages: ChatMessage[];

  // ChatRoom과의 관계 추가
  @ManyToMany(() => ChatRoom, room => room.users, { nullable: true })
  room: ChatRoom;
}
