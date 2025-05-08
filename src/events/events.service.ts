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
import { ChatRoomService } from 'src/chat/room/room.service';
  
  @Injectable()
  export class EventsService {
    constructor(
      private readonly dataSource: DataSource,
      private emailService: EmailService,
      private imageService: ImageService,
      private participantService: ParticipantService,
      private readonly chatRoomService: ChatRoomService,

      
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
    const queryRunner = this.dataSource.createQueryRunner(); //db연결 객체(repo대신)
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

      const chatRoom= await this.chatRoomService.createRoom({
        name: `${savedEvent.name} 채팅방`,
        eventId: savedEvent.id,
      });
      this.logger.verbose(`채팅방 생성 완료: roomId=${chatRoom.id}`);

      // 호스트를 채팅방에 추가
      chatRoom.users = [user];
      const savedChatRoom = await queryRunner.manager.save(chatRoom);

      // 이벤트와 채팅방 연결
      savedEvent.chatRoom = savedChatRoom;
      const finalEvent = await queryRunner.manager.save(savedEvent);

      // 이미지가 존재하는 경우 이미지 저장 서비스 호출
      if (images && images.length > 0) {
        this.logger.debug(`이미지 ${images.length}개 저장 중... eventId=${savedEvent.id}`);
        await this.imageService.saveImagesForEvent(images, savedEvent, queryRunner.manager);
        this.logger.verbose(`이미지 저장 완료: eventId=${savedEvent.id}`);
      }

      // 트랜잭션 커밋
      await queryRunner.commitTransaction();
      this.logger.log(`트랜잭션 커밋 완료: eventId=${savedEvent.id}`);

      // 최종 이벤트 조회 시 모든 관계 포함
      const finalEventWithRelations = await this.eventRepository.findOne({
        where: { id: finalEvent.id },
        relations: ['chatRoom', 'chatRoom.users', 'createdBy', 'eventImages', 'reviews'],
      });

      if (!finalEventWithRelations) {
        throw new Error('Failed to find created event');
      }

      return finalEventWithRelations;
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

      // 이벤트 전체 조회 (참가자, 좋아요, 리뷰, 채팅방 관계 포함)
      const events = await this.eventRepository.find({
        relations: ['participants', 'likes', 'reviews', 'chatRoom', 'chatRoom.users', 'reviews.user'],
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
            reviews: event.reviews || [],
            chatRoom: event.chatRoom || null,
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

  
    /**
     * 앞으로 열릴 이벤트(미래 일정)만 가져오는 함수
     * - 승인된 참가자 수 계산 포함
     * - 과거 이벤트 제외
     * - 날짜+시간 기준 오름차순 정렬
     */
    async getUpcomingEvents() {
      try {
        this.logger.debug('다가오는 이벤트 조회 시작');
  
        // 이벤트 전체 조회 (참가자/좋아요 포함)
        const events = await this.eventRepository.find({
          relations: ['participants', 'likes'],
        });
  
        this.logger.verbose(`총 ${events.length}개의 이벤트 조회됨`);
  
        const now = new Date();
  
        // 승인된 참가자 수를 포함한 유효한 이벤트 목록 생성
        const eventsWithApprovedCount = await Promise.all(
          events.map(async (event) => {
            const eventDateTime = new Date(`${event.date}T${event.time}`);
  
            // 과거 이벤트는 제외
            if (eventDateTime < now) {
              this.logger.debug(`과거 이벤트 제외됨: eventId=${event.id}`);
              return null;
            }
  
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
              time: event.time,
              type: event.type,
              category: event.category,
              price: event.price,
              maxParticipants: event.maxParticipants,
              participants: approvedParticipantsCount,
              likes: event.likes.length,
            };
          }),
        );
  
        // null 제외 후 오름차순 정렬
        const upcomingEvents = eventsWithApprovedCount
          .filter((event) => event !== null)
          .sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA.getTime() - dateB.getTime();
          });
  
        this.logger.log(`다가오는 이벤트 수: ${upcomingEvents.length}`);
        return upcomingEvents;
      } catch (error) {
        this.logger.error('다가오는 이벤트 조회 실패', error.stack);
        throw new Error(`Failed to fetch events: ${error.message}`);
      }
    }
  
  
  
  
  /**
   * 좋아요 수 기준으로 인기 있는 이벤트를 조회하는 함수
   * - 현재 시각 이후의 이벤트만 대상으로 함
   * - 참가자 수 계산 포함
   * - raw 쿼리 결과를 가공하여 반환
   */
  async getHotEvents() {
    try {
      this.logger.debug('인기 이벤트 조회 시작');

      const now = new Date();
      const nowString = now.toISOString().slice(0, 19).replace('T', ' '); // YYYY-MM-DD HH:MM:SS 형태

      // 좋아요 수 기준으로 정렬된 이벤트 조회
      const events = await this.eventRepository
        .createQueryBuilder('hifor_event')
        .leftJoin('hifor_event.participants', 'participants')
        .leftJoin('hifor_event.likes', 'likes')
        .addSelect('COUNT(DISTINCT likes.id)', 'likeCount')
        .where("hifor_event.date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul' >= :now", { now: nowString })
        .groupBy('hifor_event.id')
        .orderBy('COUNT(DISTINCT likes.id)', 'DESC')
        .getRawMany();

      this.logger.verbose(`조회된 raw 이벤트 수: ${events.length}`);

      // 조회된 raw 데이터를 가공 (참가자 수 포함)
      const processedEvents = await Promise.all(
        events.map(async (event) => {
          try {
            // 승인된 참가자 수 계산
            const approvedParticipantsCount =
              await this.participantService.countApprovedParticipantsByEvent(event.hifor_event_id);

            this.logger.debug(`eventId=${event.hifor_event_id} | 참가자=${approvedParticipantsCount} | 좋아요=${event.likeCount}`);

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
              participants: approvedParticipantsCount,
              likes: parseInt(event.likeCount, 10),
            };
          } catch (innerError) {
            this.logger.warn(`이벤트 처리 중 오류 발생: eventId=${event.hifor_event_id}`, innerError.stack);
            return null; // 오류 발생 시 null 처리
          }
        }),
      );

      const finalEvents = processedEvents.filter((e) => e !== null);
      this.logger.log(`최종 반환 이벤트 수: ${finalEvents.length}`);
      return finalEvents;
    } catch (error) {
      this.logger.error('인기 이벤트 조회 실패', error.stack);
      throw new Error(`Failed to fetch hot events: ${error.message}`);
    }
  }
  
  
  
  /**
   * 특정 이벤트 ID로 상세 정보 조회
   * - 생성자, 이미지, 참가자(유저 포함), 좋아요(유저 포함)까지 모든 관계 로딩
   * - 승인된 참가자만 필터링해서 반환
   */
  async getEventById(eventId: number): Promise<HiforEvent> {
    this.logger.debug(`이벤트 상세 조회 시작: eventId=${eventId}`);

    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: [
        'createdBy',
        'eventImages',
        'participants',
        'participants.user',
        'likes',
        'likes.user',
        'reviews',
        'chatRoom',
      ],
    });

    if (!event) {
      this.logger.warn(`이벤트를 찾을 수 없음: eventId=${eventId}`);
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // participants가 존재할 경우에만 승인된 참가자만 남김
    const originalCount = event.participants?.length || 0;

    event.participants =
      event.participants?.filter(
        (participant) => participant.status === 'Approved',
      ) || [];

    this.logger.verbose(
      `eventId=${eventId} | 전체 참가자=${originalCount} → 승인된 참가자=${event.participants.length}`,
    );

    this.logger.log(`이벤트 상세 조회 완료: eventId=${eventId}`);
    return event;
  }


  /**
   * 승인 대기(승인 또는 보류) 상태 참가자 확인을 위한 이벤트 상세 조회
   * - 'Rejected' 상태 제외한 참가자만 반환
   * - 필요한 필드만 선택적으로 조회 (select 사용)
   */
  async getEventByIdForPending(eventId: number): Promise<HiforEvent> {
    this.logger.debug(`승인 대기용 이벤트 상세 조회 시작: eventId=${eventId}`);

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
      this.logger.warn(`이벤트를 찾을 수 없음: eventId=${eventId}`);
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const total = event.participants?.length || 0;

    // 'Rejected' 상태인 참가자 제외
    event.participants =
      event.participants?.filter(
        (participant) => participant.status !== 'Rejected',
      ) || [];

    const remaining = event.participants.length;

    this.logger.verbose(
      `eventId=${eventId} | 참가자 필터링: 전체=${total} → 'Rejected' 제외 후=${remaining}`,
    );

    this.logger.log(`승인 대기용 이벤트 조회 완료: eventId=${eventId}`);
    return event;
  }



  /**
   * 정렬 기준(hot/date)에 따라 미래의 이벤트를 정렬하여 조회
   * - hot: 좋아요 수 내림차순
   * - date: 날짜 기준 오름차순
   */
  async getSortedEvents(sortBy: string) {
    this.logger.debug(`정렬 기준 '${sortBy}'로 이벤트 조회 시작`);

    // 현재 날짜 기준 이후의 이벤트만 조회 (참가자 및 좋아요 관계 포함)
    const events = await this.eventRepository.find({
      relations: ['participants', 'likes'],
      where: {
        date: MoreThanOrEqual(new Date().toISOString().slice(0, 10)),
      },
    });

    this.logger.verbose(`조회된 이벤트 수: ${events.length}`);

    // 정렬 기준에 따른 정렬 수행
    if (sortBy === 'hot') {
      this.logger.debug('좋아요 수 기준 정렬 수행');
      events.sort((a, b) => b.likes.length - a.likes.length);
    } else if (sortBy === 'date') {
      this.logger.debug('날짜 기준 정렬 수행');
      events.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    } else {
      this.logger.warn(`알 수 없는 정렬 기준 '${sortBy}' 사용됨`);
    }

    // 데이터 가공: 승인된 참가자 수 계산 포함
    const mappedEvents = await Promise.all(
      events.map(async (event) => {
        const approvedParticipantsCount =
          await this.participantService.countApprovedParticipantsByEvent(event.id);

        this.logger.verbose(
          `eventId=${event.id} | 승인된 참가자 수=${approvedParticipantsCount} | 좋아요=${event.likes.length}`,
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

    this.logger.log(`최종 반환 이벤트 수: ${mappedEvents.length}`);
    return mappedEvents;
  }


  
  /**
   * 특정 호스트가 생성한 이벤트 목록 조회
   * - 이벤트의 참가자 수(승인된 인원만), 좋아요 수 포함
   * - 생성자 정보(createdBy.username, userId) 포함
   */
  async getEventsByHostId(hostId: string) {
    this.logger.debug(`호스트 이벤트 조회 시작: hostId=${hostId}`);

    try {
      // 해당 호스트가 만든 이벤트 조회
      const events = await this.eventRepository.find({
        where: {
          createdBy: { userId: hostId },
        },
        relations: ['createdBy', 'eventImages', 'participants', 'likes'],
      });

      this.logger.verbose(`hostId=${hostId} | 조회된 이벤트 수: ${events.length}`);

      // 이벤트별 승인된 참가자 수 계산 및 데이터 가공
      const processedEvents = await Promise.all(
        events.map(async (event) => {
          const approvedParticipantsCount =
            await this.participantService.countApprovedParticipantsByEvent(event.id);

          this.logger.debug(
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
            createdBy: {
              username: event.createdBy?.username,
              userId: event.createdBy?.userId,
            },
          };
        }),
      );

      this.logger.log(`hostId=${hostId} | 최종 반환 이벤트 수: ${processedEvents.length}`);
      return processedEvents;
    } catch (error) {
      this.logger.error(`호스트 이벤트 조회 실패: hostId=${hostId}`, error.stack);
      throw new Error(`Failed to fetch events by hostId: ${error.message}`);
    }
  }
  
  /**
   * 특정 사용자가 좋아요한 이벤트 목록을 조회하는 함수
   * - 좋아요 테이블에서 userId 기준으로 필터링
   * - 이벤트 상세 정보와 승인된 참가자 수 포함
   */
  async getLikedEvents(likedId: string) {
    this.logger.debug(`좋아요한 이벤트 조회 시작: userId=${likedId}`);

    try {
      // 해당 사용자가 좋아요한 이벤트 목록 조회
      const likedEvents = await this.likeRepository.find({
        where: {
          user: { userId: likedId },
        },
        relations: ['event', 'event.createdBy', 'event.likes', 'event.participants'],
      });

      this.logger.verbose(`userId=${likedId} | 좋아요한 이벤트 수: ${likedEvents.length}`);

      // 유효한 이벤트만 추출
      const events = likedEvents
        .map((like) => like.event)
        .filter((event) => event !== null);

      // 이벤트별 정보 매핑 (참가자 수 포함)
      const mappedEvents = await Promise.all(
        events.map(async (event) => {
          const approvedParticipantsCount =
            await this.participantRepository.count({
              where: {
                event: { id: event.id },
                status: 'Approved',
              },
            });

          this.logger.debug(
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
            createdBy: {
              username: event.createdBy?.username,
              userId: event.createdBy?.userId,
            },
            participants: approvedParticipantsCount,
            likes: event.likes.length,
          };
        }),
      );

      this.logger.log(`userId=${likedId} | 최종 반환 이벤트 수: ${mappedEvents.length}`);
      return mappedEvents;
    } catch (error) {
      this.logger.error(`좋아요한 이벤트 조회 실패: userId=${likedId}`, error.stack);
      throw new Error(`Failed to fetch liked events: ${error.message}`);
    }
  }
  
  /**
   * 카테고리별 이벤트 검색
   * - "All"일 경우 전체 이벤트 반환
   */
  async searchEventByCategory(_category: string) {
    this.logger.debug(`카테고리 검색 시작: category="${_category}"`);

    try {
      if (_category === 'All') {
        this.logger.verbose('카테고리 "All" 요청 - 전체 이벤트 반환');
        return await this.getAllEvents();
      }

      const events = await this.eventRepository.find({
        where: { category: _category },
      });

      this.logger.log(`카테고리 "${_category}" 검색 결과: ${events.length}건`);
      return events;
    } catch (error) {
      this.logger.error(`카테고리 검색 실패: category="${_category}"`, error.stack);
      throw new Error(
        `Failed to fetch events for category "${_category}": ${error.message}`,
      );
    }
  }
    /**
   * 복합 조건 이벤트 검색 (제목, 날짜, 장소, 유형)
   */
    async searchEvent(searchEventDto: SearchEventDto) {
      const { query, date, location, type } = searchEventDto;
  
      this.logger.debug(`이벤트 검색 시작 | query="${query}", date="${date}", location="${location}", type="${type}"`);
  
      const queryBuilder = this.eventRepository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.createdBy', 'createdBy')
        .leftJoinAndSelect('event.participants', 'participants')
        .leftJoinAndSelect('event.likes', 'likes');
  
      if (query) {
        queryBuilder.andWhere('event.name LIKE :query', { query: `%${query}%` });
      }
  
      if (date) {
        queryBuilder.andWhere('event.date = :date', { date });
      }
  
      if (location) {
        queryBuilder.andWhere('event.location = :location', { location });
      }
  
      if (type) {
        queryBuilder.andWhere('event.type = :type', { type });
      }
  
      try {
        const events = await queryBuilder.getMany();
        this.logger.verbose(`검색 결과 이벤트 수: ${events.length}`);
  
        const mappedEvents = await Promise.all(
          events.map(async (event) => {
            const approvedParticipantsCount =
              await this.participantService.countApprovedParticipantsByEvent(event.id);
  
            this.logger.debug(`eventId=${event.id} | 승인된 참가자 수=${approvedParticipantsCount} | 좋아요 수=${event.likes.length}`);
  
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
              },
              participants: approvedParticipantsCount,
              likes: event.likes.length,
            };
          }),
        );
  
        this.logger.log(`검색 결과 최종 반환 수: ${mappedEvents.length}`);
        return mappedEvents;
      } catch (error) {
        this.logger.error('이벤트 검색 중 오류 발생', error.stack);
        throw new Error(`Failed to search events: ${error.message}`);
      }
    }
  
  
  /**
   * 사용자의 이벤트 참여 취소 처리
   */
  async cancelParticipation(_userId: string, eventId: number): Promise<void> {
    this.logger.debug(`참여 취소 시도: userId=${_userId}, eventId=${eventId}`);

    // 이벤트 조회
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['participants', 'participants.user'],
    });

    if (!event) {
      this.logger.warn(`이벤트를 찾을 수 없음: eventId=${eventId}`);
      throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
    }

    // 사용자 조회
    const user = await this.userRepository.findOne({ where: { userId: _userId } });
    if (!user) {
      this.logger.warn(`사용자를 찾을 수 없음: userId=${_userId}`);
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const beforeCount = event.participants.length;

    // 해당 사용자를 참가자 목록에서 제거
    event.participants = event.participants.filter(
      (participant) => participant.user.userId !== _userId,
    );

    const afterCount = event.participants.length;
    this.logger.verbose(`참여자 수 변경: ${beforeCount} → ${afterCount}`);

    // 변경된 이벤트 저장
    await this.eventRepository.save(event);
    this.logger.log(`참여 취소 완료: userId=${_userId}, eventId=${eventId}`);
  }
  
    /**
   * 이벤트 삭제 처리 (트랜잭션 기반)
   * - 참가자, 좋아요 데이터 먼저 삭제
   * - 이후 이벤트 본문 삭제
   */
    async deleteEvent(eventId: number): Promise<boolean> {
      this.logger.debug(`이벤트 삭제 시도: eventId=${eventId}`);
  
      const queryRunner = this.dataSource.createQueryRunner();
  
      try {
        await queryRunner.connect();
        await queryRunner.startTransaction();
  
        // 참가자 데이터 삭제
        const deleteParticipants = await queryRunner.manager.delete('participant', {
          event: { id: eventId },
        });
        this.logger.verbose(`삭제된 참가자 수: ${deleteParticipants.affected}`);
  
        // 좋아요 데이터 삭제
        const deleteLikes = await queryRunner.manager.delete('likes', {
          event: { id: eventId },
        });
        this.logger.verbose(`삭제된 좋아요 수: ${deleteLikes.affected}`);
  
        // 이벤트 삭제
        const deleteEvent = await queryRunner.manager.delete('hifor_event', {
          id: eventId,
        });
        this.logger.verbose(`삭제된 이벤트 수: ${deleteEvent.affected}`);
  
        await queryRunner.commitTransaction();
        this.logger.log(`이벤트 삭제 완료: eventId=${eventId}`);
        return true;
      } catch (error) {
        this.logger.error(`이벤트 삭제 중 오류 발생: eventId=${eventId}`, error.stack);
        await queryRunner.rollbackTransaction();
        return false;
      } finally {
        await queryRunner.release();
        this.logger.debug(`쿼리러너 해제: eventId=${eventId}`);
      }
    }
  



    //메인 페이지 맨 아래 있는 구독 기능
    async subscribe(email: string) {
      // email 값만 받아서 엔티티 생성
      const adEmail = this.adEmailRepository.create({ email });
      return await this.adEmailRepository.save(adEmail);
    }
  
  
  }
  