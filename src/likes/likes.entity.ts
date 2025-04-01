import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn,OneToMany } from 'typeorm';
import { User } from '../user/user.entity'; 
import { HiforEvent } from 'src/events/events.entity';
import { BaseEntity } from 'src/common/entities/base.entity';

@Entity('likes')
export class Like extends BaseEntity{
  @PrimaryGeneratedColumn()
  id: number; // 좋아요 고유 ID

  @ManyToOne(() => HiforEvent, (event) => event.likes, { onDelete: 'CASCADE' })
  event: HiforEvent; // 좋아요가 눌린 이벤트 (Many-to-One 관계)

  @ManyToOne(() => User, (user) => user.likes, { onDelete: 'CASCADE' })
  user: User; // 좋아요를 누른 사용자 (Many-to-One 관계)
}