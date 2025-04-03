import {
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    NotFoundException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { DataSource, MoreThanOrEqual, Repository } from 'typeorm';
  import { AdEmail, HiforEvent } from './events.entity';
  import { User } from '../user/user.entity';
  import { CreateEventDto, SearchEventDto } from './events.dto';
  import { EmailService } from '../mail/mail.service';
import { ImageService } from 'src/image/image.service';
import { ParticipantService } from 'src/participant/participant.service';
import { Like } from 'src/likes/likes.entity';
import { Participant } from 'src/participant/participant.entity';
  
  @Injectable()
  export class EventsService {
    constructor(
      private readonly dataSource: DataSource,
      private emailService: EmailService,
      private imageService: ImageService,
      private participantService: ParticipantService,

      
      @InjectRepository(Participant)
      private participantRepository: Repository<Participant>,
      @InjectRepository(Like)
      private likeRepository: Repository<Like>, 
      @InjectRepository(AdEmail)
      private adEmailRepository: Repository<AdEmail>,
      @InjectRepository(HiforEvent)
      private eventRepository: Repository<HiforEvent>,
      @InjectRepository(User)
      private userRepository: Repository<User>,      
    ) {}
    private readonly logger = new Logger(EventsService.name);


  /**
   * 이벤트를 생성하는 함수
   * - 사용자 검증 → 이벤트 저장 → 이미지 저장 순으로 진행
   * - 전체 작업은 트랜잭션으로 묶여 있어 중간에 오류 발생 시 롤백됨
   */
  async createEvent(createEventDto: CreateEventDto): Promise<HiforEvent> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      // 트랜잭션 시작 로그 (디버깅용)
      this.logger.debug('createEvent 트랜잭션 시작');

      // 사용자 존재 여부 확인
      const user = await this.userRepository.findOneBy({
        userId: createEventDto.userId,
      });

      if (!user) {
        // 사용자 없을 경우 경고 로그 남기고 예외 처리
        this.logger.warn(`해당 userId=${createEventDto.userId}에 대한 사용자를 찾을 수 없음`);
        throw new Error('User not found');
      }

      // DTO에서 이미지 분리
      const { images, ...eventData } = createEventDto;

      // 이벤트 엔터티 생성
      const event = this.eventRepository.create({
        ...eventData,
        createdBy: user,
      });

      // 이벤트 저장
      const savedEvent = await queryRunner.manager.save(HiforEvent, event);
      this.logger.verbose(`이벤트 저장 완료: eventId=${savedEvent.id}`);

      // 이미지가 존재하는 경우 이미지 저장 서비스 호출
      if (images && images.length > 0) {
        this.logger.debug(`이미지 ${images.length}개 저장 중... eventId=${savedEvent.id}`);
        await this.imageService.saveImagesForEvent(images, savedEvent, queryRunner.manager);
        this.logger.verbose(`이미지 저장 완료: eventId=${savedEvent.id}`);
      }

      // 트랜잭션 커밋
      await queryRunner.commitTransaction();
      this.logger.log(`트랜잭션 커밋 완료: eventId=${savedEvent.id}`);

      return savedEvent;
    } catch (error) {
      // 트랜잭션 롤백 및 에러 로그 기록
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `트랜잭션 롤백 발생: userId=${createEventDto.userId}`,
        error.stack,
      );
      throw error;
    } finally {
      // 쿼리러너 해제
      await queryRunner.release();
      this.logger.debug('쿼리러너 해제 완료');
    }
  }
  
  /**
   * 현재 시간 이후의 모든 이벤트를 가져오는 함수
   * - 참가자, 좋아요 수 포함
   * - 승인된 참가자 수만 계산
   * - 과거 이벤트는 제외
   */
  async getAllEvents() {
    try {
      this.logger.debug('이벤트 전체 조회 시작');

      // 이벤트 전체 조회 (참가자, 좋아요 관계 포함)
      const events = await this.eventRepository.find({
        relations: ['participants', 'likes'],
        order: { createdAt: 'DESC' },
      });

      this.logger.verbose(`이벤트 ${events.length}건 조회됨`);

      const now = new Date();

      // 승인된 참가자 수를 포함한 새로운 이벤트 리스트 생성
      const eventsWithApprovedCount = await Promise.all(
        events.map(async (event) => {
          const eventDateTime = new Date(`${event.date}T${event.time}`);

          // 과거 이벤트는 제외
          if (eventDateTime < now) {
            this.logger.debug(`과거 이벤트 제외: eventId=${event.id}`);
            return null;
          }

          // 승인된 참가자 수 계산
          const approvedParticipantsCount =
            await this.participantService.countApprovedParticipantsByEvent(event.id);

          this.logger.verbose(
            `eventId=${event.id} | 승인된 참가자 수=${approvedParticipantsCount} | 좋아요 수=${event.likes.length}`,
          );

          return {
            id: event.id,
            name: event.name,
            description: event.description,
            mainImage: event.mainImage,
            location: event.location,
            date: event.date,
            type: event.type,
            category: event.category,
            price: event.price,
            maxParticipants: event.maxParticipants,
            participants: approvedParticipantsCount,
            likes: event.likes.length,
          };
        }),
      );

      const filteredEvents = eventsWithApprovedCount.filter((event) => event !== null);
      this.logger.log(`최종 반환 이벤트 수: ${filteredEvents.length}`);

      return filteredEvents;
    } catch (error) {
      this.logger.error('이벤트 전체 조회 중 오류 발생', error.stack);
      throw new Error(`Failed to fetch events: ${error.message}`);
    }
  }
  
    async getUpcomingEvents() {
      try {
        const events = await this.eventRepository.find({
          relations: ['participants', 'likes'], // 관계를 로드
        });
  
        // 현재 날짜 및 시간 가져오기
        const now = new Date();
  
        // 각 이벤트에 대해 승인된 참가자 수 계산
        const eventsWithApprovedCount = await Promise.all(
          events.map(async (event) => {
            const eventDateTime = new Date(`${event.date}T${event.time}`);
  
            // 이벤트가 과거일 경우 제외
            if (eventDateTime < now) {
              return null;
            }
  
            const approvedParticipantsCount =
            await this.participantService.countApprovedParticipantsByEvent(event.id);
          
  
            return {
              id: event.id,
              name: event.name,
              description: event.description,
              mainImage: event.mainImage,
              location: event.location,
              date: event.date,
              time: event.time,
              type: event.type,
              category: event.category,
              price: event.price,
              maxParticipants: event.maxParticipants,
              participants: approvedParticipantsCount, // 승인된 참가자 수
              likes: event.likes.length,
            };
          })
        );
  
        // null 값을 제거하고, date와 time을 기준으로 오름차순 정렬
        return eventsWithApprovedCount
          .filter((event) => event !== null)
          .sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA.getTime() - dateB.getTime();
          });
  
      } catch (error) {
        throw new Error(`Failed to fetch events: ${error.message}`);
      }
    }
  
  
    async getHotEvents() {
      try {
        const now = new Date();
        const nowString = now.toISOString().slice(0, 19).replace("T", " ");
  
        const events = await this.eventRepository
          .createQueryBuilder('hifor_event') // 테이블 이름을 hifor_event로 지정
          .leftJoin('hifor_event.participants', 'participants') // 관계도 수정
          .leftJoin('hifor_event.likes', 'likes') // 좋아요 테이블과 조인
          .addSelect('COUNT(DISTINCT likes.id)', 'likeCount') // DISTINCT 추가하여 좋아요 개수 계산
            .where("hifor_event.date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul' >= :now", { now: nowString })
            .groupBy('hifor_event.id') // 이벤트별 그룹화
          .orderBy('COUNT(DISTINCT likes.id)', 'DESC') // 좋아요 수 기준 내림차순 정렬
          .getRawMany();
        
        
  
  
        // Raw 데이터 가공 (참가자 수 포함)
        const processedEvents = await Promise.all(
          events.map(async (event) => {
            try {
              // 참가자 수 계산
              const approvedParticipantsCount =
              await this.participantService.countApprovedParticipantsByEvent(event.id);
            
              return {
                id: event.hifor_event_id,
                name: event.hifor_event_name,
                description: event.hifor_event_description,
                mainImage: event.hifor_event_mainImage,
                location: event.hifor_event_location,
                date: event.hifor_event_date,
                type: event.hifor_event_type,
                category: event.hifor_event_category,
                price: event.hifor_event_price,
                maxParticipants: event.hifor_event_maxParticipants,
                participants: approvedParticipantsCount, // 승인된 참가자 수
                likes: parseInt(event.likeCount, 10), // 좋아요 수 변환
              };
  
            } catch (innerError) {
              console.error('❌ Error processing event:', event, innerError.message);
              return null; // 오류 발생 시 null 반환
            }
          }),
        );
  
        return processedEvents.filter(e => e !== null); // 오류 발생한 이벤트(null)는 제외하고 반환
  
      } catch (error) {
        console.error('❌ Failed to fetch hot events:', error.message);
        throw new Error(`Failed to fetch hot events: ${error.message}`);
      }
    }
  
  
  
    async getEventById(eventId: number): Promise<HiforEvent> {
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
        relations: [
          'createdBy',
          'eventImages',
          'participants',
          'participants.user',
          'likes',
          'likes.user',
        ],
      });
  
      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }
  
      // participants가 로드되지 않았거나 undefined인 경우 안전하게 처리
      event.participants =
        event.participants?.filter(
          (participant) => participant.status === 'Approved',
        ) || [];
  
      return event;
    }
    async getEventByIdForPending(eventId: number): Promise<HiforEvent> {
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
        relations: [
          'createdBy',
          'eventImages',
          'participants',
          'participants.user',
          'likes',
          'likes.user',
        ],
        select: {
          id: true,
          name: true,
          description: true,
          question: true,
          maxParticipants: true,
          type: true,
          participants: {
            id: true,
            status: true,
            user: {
              userId: true,
              username: true,
              profileImage: true,
            },
            answer: true, 
          },
          createdBy: {
            id: true,
            username: true,
          },
        },
      });
  
      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }
  
      // participants가 로드되지 않았거나 undefined인 경우 안전하게 처리
      event.participants =
        event.participants?.filter(
          (participant) => participant.status !== 'Rejected',
        ) || [];
  
      return event;
    }
    async getSortedEvents(sortBy: string) {
      const events = await this.eventRepository.find({
        relations: ['participants', 'likes'], // 필요한 관계 모두 가져오기
        where: {
          date: MoreThanOrEqual(new Date().toISOString().slice(0, 10)), // 현재 날짜를 YYYY-MM-DD 형식의 문자열로 변환
        },
      });
  
      // 정렬 로직
      if (sortBy === 'hot') {
        // 좋아요 수 기준 내림차순 정렬
        events.sort((a, b) => b.likes.length - a.likes.length);
      } else if (sortBy === 'date') {
        // 날짜 기준 오름차순 정렬
        events.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
      }
  
      // 데이터 매핑
      return await Promise.all(
        events.map(async (event) => {
          // Approved 참가자 수 계산
          const approvedParticipantsCount =
          await this.participantService.countApprovedParticipantsByEvent(event.id);
        
          return {
            id: event.id,
            name: event.name,
            description: event.description,
            mainImage: event.mainImage,
            location: event.location,
            date: event.date,
            type: event.type,
            category: event.category,
            price: event.price,
            maxParticipants: event.maxParticipants,
            participants: approvedParticipantsCount, // 승인된 참가자 수
            likes: event.likes.length,
          };
        }),
      );
    }
    async getEventsByHostId(hostId: string) {
      try {
        const events = await this.eventRepository.find({
          where: {
            createdBy: { userId: hostId },
          },
          relations: ['createdBy','eventImages', 'participants', 'likes'],
        });
  
        return await Promise.all(  
          events.map(async (event) => {
            const approvedParticipantsCount =
            await this.participantService.countApprovedParticipantsByEvent(event.id);
          
            return {
              id: event.id,
              name: event.name,
              description: event.description,
              mainImage: event.mainImage,
              location: event.location,
              date: event.date,
              type: event.type,
              category: event.category,
              price: event.price,
              maxParticipants: event.maxParticipants,
              participants: approvedParticipantsCount, // 승인된 참가자 수
              likes: event.likes.length,
              createdBy: {
                username: event.createdBy?.username, // createdBy에서 username 가져옴
                userId: event.createdBy?.userId,     // createdBy에서 userId 가져옴
              },
            };
          }),
        );
      } catch (error) {
        throw new Error(`Failed to fetch events by hostId: ${error.message}`);
      }
    }
  
  // 좋아요한 이벤트 가져오기
    async getLikedEvents(likedId: string) {
      try {
        const likedEvents = await this.likeRepository.find({
          where: {
            user: { userId: likedId }, // 특정 userId가 좋아요를 누른 이벤트
          },
          relations: ['event', 'event.createdBy', 'event.likes', 'event.participants'], // 필요한 관계 로드
        });
  
        // 좋아요한 이벤트만 추출
        const events = likedEvents
          .map((like) => like.event)
          .filter((event) => event !== null);
  
        // 데이터 매핑
        const mappedEvents = await Promise.all(
          events.map(async (event) => {
            // Approved 참가자 수 계산
            const approvedParticipantsCount =
              await this.participantRepository.count({
                where: {
                  event: { id: event.id },
                  status: 'Approved',
                },
              });
  
            return {
              id: event.id,
              name: event.name,
              description: event.description,
              mainImage: event.mainImage,
              location: event.location,
              date: event.date,
              type: event.type,
              category: event.category,
              price: event.price,
              maxParticipants: event.maxParticipants,
              createdBy: {
                username: event.createdBy?.username,
                userId: event.createdBy?.userId,
                // profileImage: event.createdBy?.profileImage,
              },
              participants: approvedParticipantsCount, // 승인된 참가자 수
              likes: event.likes.length,
            };
          }),
        );
  
        // 매핑된 좋아요 이벤트 반환
        return mappedEvents;
      } catch (error) {
        throw new Error(`Failed to fetch liked events: ${error.message}`);
      }
    }
  
    async searchEventByCategory(_category: string) {
      try {
        if (_category === 'All') {
          return await this.getAllEvents();
        }
        return await this.eventRepository.find({
          where: { category: _category },
        });
      } catch (error) {
        throw new Error(
          `Failed to fetch events for category "${_category}": ${error.message}`,
        );
      }
    }
  
    async searchEvent(searchEventDto: SearchEventDto) {
      const { query, date, location, type } = searchEventDto;
  
      const queryBuilder = this.eventRepository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.createdBy', 'createdBy')
        .leftJoinAndSelect('event.participants', 'participants')
        .leftJoinAndSelect('event.likes', 'likes');
  
      // 제목 검색 조건 추가
      if (query) {
        queryBuilder.andWhere('event.name LIKE :query', { query: `%${query}%` });
      }
  
      // 날짜 조건 추가
      if (date) {
        queryBuilder.andWhere('event.date = :date', { date });
      }
  
      // 위치 조건 추가
      if (location) {
        queryBuilder.andWhere('event.location = :location', { location });
      }
  
      // 모집 유형 조건 추가
      if (type) {
        queryBuilder.andWhere('event.type = :type', { type });
      }
  
      // 쿼리 실행
      const events = await queryBuilder.getMany();
  
      // 데이터 매핑
      const mappedEvents = await Promise.all(
        events.map(async (event) => {
          // Approved 참가자 수 계산
          const approvedParticipantsCount =
          await this.participantService.countApprovedParticipantsByEvent(event.id);
        
  
          return {
            id: event.id,
            name: event.name,
            description: event.description,
            mainImage: event.mainImage,
            location: event.location,
            date: event.date,
            type: event.type,
            category: event.category,
            price: event.price,
            maxParticipants: event.maxParticipants,
            createdBy: {
              name: event.createdBy?.username,
              userId: event.createdBy?.userId,
              //profileImage: event.createdBy?.profileImage,
            },
            participants: approvedParticipantsCount, // 승인된 참가자 수
            likes: event.likes.length,
          };
        }),
      );
  
      return mappedEvents;
    }
  
    async cancelParticipation(_userId: string, eventId: number): Promise<void> {
      // 이벤트 찾기
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
        relations: ['participants','participants.user'],
      });
  
      if (!event) {
        throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
      }
  
      // 사용자 찾기
      const user = await this.userRepository.findOne({ where: { userId: _userId } });
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
  
      // 참여자 목록에서 사용자 제거
      event.participants = event.participants.filter(
        (participant) => participant.user.userId !== _userId
      );
  
      // 데이터베이스 업데이트
      await this.eventRepository.save(event);
    }

    async deleteEvent(eventId: number): Promise<boolean> {
      const queryRunner = this.dataSource.createQueryRunner();
  
      try {
        await queryRunner.connect();
        await queryRunner.startTransaction();
  
        // 참가자 데이터 삭제
        await queryRunner.manager.delete('participant', { event: { id: eventId } });
  
        // 좋아요 데이터 삭제
        await queryRunner.manager.delete('likes', { event: { id: eventId } });
  
        // 이벤트 삭제
        await queryRunner.manager.delete('hifor_event', { id: eventId });
  
        await queryRunner.commitTransaction();
        return true;
      } catch (error) {
        console.error('Error deleting event:', error);
        await queryRunner.rollbackTransaction();
        return false;
      } finally {
        await queryRunner.release();
      }
    }
  
  



    //메인 페이지 맨 아래 있는 구독 기능
    async subscribe(email: string) {
      // email 값만 받아서 엔티티 생성
      const adEmail = this.adEmailRepository.create({ email });
      return await this.adEmailRepository.save(adEmail);
    }
  
  
  }
  