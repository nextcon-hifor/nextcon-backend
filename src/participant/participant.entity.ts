import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../user/user.entity'; 
import { HiforEvent } from 'src/events/events.entity';
import { BaseEntity } from 'src/common/entities/base.entity';

@Entity('participant')
export class Participant extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number; // 참가자 고유 식별자

  @ManyToOne(() => HiforEvent, (event) => event.participants, { onDelete: 'CASCADE' })
  event: HiforEvent; // 참가자가 등록한 이벤트

  @ManyToOne(() => User, (user) => user.participations, { onDelete: 'CASCADE' })
  user: User; // 참가자 (사용자)

  @Column({ type: 'varchar', length: 20, default: 'Pending' })
  status: string; // 참가 상태 (예: Pending, Approved, Rejected)

  @Column({ type: 'text', nullable: true })
  answer: string; // 선택 질문에 대한 참가자의 답변
}
