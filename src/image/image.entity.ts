import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn,OneToMany } from 'typeorm';

import { HiforEvent } from 'src/events/events.entity';
import { BaseEntity } from 'src/common/entities/base.entity';


@Entity('event-images')
export class eventImage extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  url: string; // 이미지 파일 URL

  @ManyToOne(() => HiforEvent, (event) => event.eventImages, { onDelete: 'CASCADE' })
  event: HiforEvent;
}