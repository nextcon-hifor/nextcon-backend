import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { CreateReviewDto, UpdateReviewDto } from './review.dto';
import { User } from '../user/user.entity';
import { HiforEvent } from '../events/events.entity';
import { ReviewImage } from '../review-image/review-image.entity';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(HiforEvent) private eventRepo: Repository<HiforEvent>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ReviewImage)
    private reviewImageRepo: Repository<ReviewImage>,
  ) {}

  async create(dto: CreateReviewDto) {
    const event = await this.eventRepo.findOne({ where: { id: dto.eventId } });
    if (!event) throw new NotFoundException('이벤트를 찾을 수 없습니다.');

    const user = await this.userRepo.findOne({ where: { userId: dto.userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const review = this.reviewRepo.create({
      rating: dto.rating,
      comment: dto.comment,
      user,
      event,
    });

    // Save the review first to get an ID
    const savedReview = await this.reviewRepo.save(review);

    // Process images if any
    if (dto.imageUrls && dto.imageUrls.length > 0) {
      const reviewImages = dto.imageUrls.map((url) =>
        this.reviewImageRepo.create({
          url,
          review: savedReview,
        }),
      );
      await this.reviewImageRepo.save(reviewImages);
    }

    // Return the review with all relations
    return this.reviewRepo.findOne({
      where: { id: savedReview.id },
      relations: ['user', 'event', 'images'],
    });
  }

  async findByEvent(eventId: number) {
    return this.reviewRepo.find({
      where: { event: { id: eventId } },
      relations: ['user', 'event', 'images'], // 이미지 포함
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    return this.reviewRepo.find({
      where: { user: { id: user.id } },
      relations: ['event', 'images'], // 이미지 포함
      order: { createdAt: 'DESC' },
    });
  }

  async getHostAverageRating(
    hostId: string,
  ): Promise<{ average: number; count: number }> {
    const events = await this.eventRepo.find({
      where: { createdBy: { userId: hostId } },
      relations: ['reviews'],
    });
    const allReviews = events.flatMap((event) => event.reviews || []);

    if (allReviews.length === 0) return { average: 0, count: 0 };

    const total = allReviews.reduce((sum, review) => sum + review.rating, 0);
    const avg = total / allReviews.length;
    return { average: Math.round(avg * 10) / 10, count: allReviews.length };
  }
}
