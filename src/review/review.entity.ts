import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { HiforEvent } from '../events/events.entity';
import { BaseEntity } from 'src/common/entities/base.entity';

@Entity('reviews')
export class Review extends BaseEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'float', nullable: true })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @ManyToOne(() => User, (user) => user.reviews, { eager: true, onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => HiforEvent, (event) => event.reviews, { onDelete: 'CASCADE' })
  event: HiforEvent;
}