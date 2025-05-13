import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Participant } from 'src/participant/participant.entity';
import { Like } from 'src/likes/likes.entity';
import { eventImage } from 'src/image/image.entity';
import { BaseEntity } from 'src/common/entities/base.entity';
import { IsOptional, IsString } from 'class-validator';
import { Review } from '../review/review.entity';
import { ChatRoom } from 'src/chat/room/room.entity';

@Entity('hifor_event')
export class HiforEvent extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number; // 이벤트 고유 식별자

  @Column({ length: 80, nullable: true })
  name: string; // 이벤트 이름

  @Column({ type: 'text', nullable: true })
  description: string; // 이벤트 설명 (선택)

  @Column({ type: 'text', nullable: true })
  question: string;

  @Column({ length: 30, nullable: true })
  location: string; // 이벤트 장소 (구 단위)

  @Column({ length: 255, nullable: true })
  locationDetail: string; // 이벤트 장소 (세부)

  @Column({ type: 'date', nullable: true })
  date: string; // 이벤트 날짜 (선택)

  @Column({ type: 'time', nullable: true })
  time: string; // 이벤트 시간 (선택)

  @Column({ length: 20, nullable: true })
  type: string; // 이벤트 유형 (예: First come, Register)

  @Column({ length: 30, nullable: true })
  category: string; // 이벤트 카테고리

  @Column({ nullable: true })
  mainImage: string; // 이벤트 카테고리

  @Column({ type: 'int', nullable: true })
  price: number; // 이벤트 가격 (선택, 기본값 없음)

  @Column({ type: 'int', nullable: true })
  maxParticipants: number; // 최대 참가 인원 (선택)

  @Column({ type: 'int', nullable: true })
  minParticipants: number; // 최소 참가 인원 (선택)

  @ManyToOne(() => User, (user) => user.events, { eager: false })
  createdBy: User; // 이벤트 생성자 (User 엔터티와 관계)

  @OneToMany(() => eventImage, (eventImage) => eventImage.event, {
    cascade: true,
  })
  eventImages: eventImage[];

  @OneToMany(() => Participant, (participant) => participant.event, {
    cascade: true,
  })
  participants: Participant[]; // 이벤트에 연결된 참가자 목록

  @OneToMany(() => Like, (like) => like.event, { cascade: true })
  likes: Like[]; // 이벤트와 연결된 좋아요 목록

  @OneToMany(() => Review, (review) => review.event, { cascade: true })
  reviews: Review[];

  // ChatRoom과의 1:1 관계 설정
  @OneToOne(() => ChatRoom, (chatRoom) => chatRoom.event, { cascade: true })
  @JoinColumn({ name: 'roomId' })
  chatRoom: ChatRoom;
}

@Entity('adEmails')
export class AdEmail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;
}
