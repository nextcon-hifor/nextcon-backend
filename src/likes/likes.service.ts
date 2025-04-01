import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Like } from './likes.entity';
import { User } from 'src/user/user.entity';
import { HiforEvent } from 'src/events/events.entity';

@Injectable()
export class LikesService {
    constructor(
      @InjectRepository(Like)
      private likeRepository: Repository<Like>,     
      @InjectRepository(User)
      private userRepository: Repository<User>,     
      @InjectRepository(HiforEvent)
      private eventRepository: Repository<HiforEvent>,
      //private readonly dataSource: DataSource,
      //private emailService: EmailService, // EmailService 주입
    ) {}
    // 좋아요 상태 확인
    async checkLikeStatus(eventId: number, _userId: string): Promise<boolean> {
      const like = await this.likeRepository.findOne({
        where: { event: { id: eventId }, user: { userId: _userId } },
      });
      return !!like; // 좋아요 여부 반환
    }
    async toggleLike(eventId: number, _userId: string) {
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
        relations: ['likes', 'likes.user'], // 'likes.user'를 가져와야 함
      });
      if (!event) {
        throw new NotFoundException('Event not found');
      }
  
      const user = await this.userRepository.findOne({
        where: { userId: _userId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      // 좋아요 여부 확인
      const userIndex = event.likes.findIndex((like) => like.user.id === user.id);
      if (userIndex > -1) {
        // 좋아요 제거
        const likeToRemove = event.likes[userIndex];
        await this.likeRepository.remove(likeToRemove); // Like 엔터티 제거
        event.likes.splice(userIndex, 1);
      } else {
        // 좋아요 추가
        const newLike = this.likeRepository.create({ user, event });
        await this.likeRepository.save(newLike); // Like 엔터티 저장
        event.likes.push(newLike);
      }
  
      // 변경된 좋아요 데이터 저장
      await this.eventRepository.save(event);
  
      return event.likes.length;
    }
}
