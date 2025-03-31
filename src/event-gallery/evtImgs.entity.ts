import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn,OneToMany } from 'typeorm';

import { HiforEvent } from 'src/hifor-event/events.entity';
import { BaseEntity } from 'src/common/entities/base.entity';


@Entity('images')
export class Image extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  url: string; // 이미지 파일 URL

  @ManyToOne(() => HiforEvent, (event) => event.images, { onDelete: 'CASCADE' })
  event: HiforEvent;
}