import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Blog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  language: string;

  @Column('simple-array', { nullable: true })
  subtitles: string[]; // 여러 개의 소제목

  @Column('jsonb', { nullable: true })
  faqs: { question: string; answer: string }[];

  @Column('jsonb', { nullable: true })
  relatedLinks: { url: string; description: string }[];
}
