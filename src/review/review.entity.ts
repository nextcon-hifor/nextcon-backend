import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../user/user.entity';
import { HiforEvent } from '../events/events.entity';
import { BaseEntity } from 'src/common/entities/base.entity';
import { ReviewImage } from '../review-image/review-image.entity';

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

  @OneToMany(() => ReviewImage, (image) => image.review, { cascade: true })
  images: ReviewImage[];
}