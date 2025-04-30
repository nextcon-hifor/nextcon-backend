import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant } from './participant.entity';
import { EmailService } from 'src/mail/mail.service';
import { Like } from 'src/likes/likes.entity';
import { HiforEvent } from 'src/events/events.entity';
import { User } from 'src/user/user.entity';

@Injectable()
export class ParticipantService {
  constructor(
    @InjectRepository(Participant)
    private participantRepository: Repository<Participant>,
    //private readonly dataSource: DataSource,
    private emailService: EmailService, // EmailService 주입
    @InjectRepository(Like)
    private likeRepository: Repository<Like>,     
    @InjectRepository(User)
    private userRepository: Repository<User>,     
    @InjectRepository(HiforEvent)
    private eventRepository: Repository<HiforEvent>,
  ) {}


    //participant
    async createParticipant(
      eventId: number,
      _userId: string,
      answer: string,
    ): Promise<Participant> {
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
        relations: ['createdBy'],
      });
      if (!event) {
        throw new Error('Event not found');
      }
      const user = await this.userRepository.findOne({
        where: { userId: _userId },
      });
      if (!user) {
        throw new Error('User not found');
      }
  
      // 기존 참가 여부 확인 (중복 방지)
      const existingParticipant = await this.participantRepository.findOne({
        where: {
          event: { id: eventId },
          user: { userId: _userId },
        },
      });
  
      if (existingParticipant) {
        throw new HttpException('User has already joined this event', HttpStatus.BAD_REQUEST);
      }
  
      const status = event.type === 'Register' ? 'Pending' : 'Approved';
  
      const participant = this.participantRepository.create({
        event,
        user,
        status,
        answer,
      });

        // 참가자가 승인된 경우 채팅방에 추가
      if (status === 'Approved' && event.chatRoom) {
        if (!event.chatRoom.users) {
          event.chatRoom.users = [];
        }
        event.chatRoom.users.push(user); // 채팅방에 사용자 추가
        await this.eventRepository.save(event); // 이벤트 저장 (채팅방 업데이트)
      }
  
      await this.emailService.sendCreatePartiEmail(
        event.createdBy.email, // 메일 수신자는 호스트
        {
          hostName: event.createdBy.username,      // 호스트 이름
          eventTitle: event.name,                    // 이벤트 제목
          eventDate: event.date,                     // 이벤트 날짜
          eventLocation: event.location,             // 이벤트 장소
          participantName: user.username,            // 신청한 참가자의 이름
          eventId: event.id,
        }
      )
  
      return await this.participantRepository.save(participant);
  
    }


    async getParticipatedEvent(participatedId: string) {
      try {
        const participants = await this.participantRepository.find({
          where: {
            user: { userId: participatedId }, // 특정 userId가 참여한 이벤트
            status: 'Approved', // 승인된 상태만 필터링
          },
          relations: ['event', 'event.createdBy', 'event.likes', 'event.participants'], // 필요한 관계 로드
        });
  
        // null이 아닌 이벤트만 추출
        const events = participants
          .map((participant) => participant.event)
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
  
        // 매핑된 이벤트를 반환
        return mappedEvents;
      } catch (error) {
        throw new Error(`Failed to fetch participated events: ${error.message}`);
      }
    }
  
  
    // 사용자 참여 여부 확인
    async checkParticipation(eventId: number, _userId: string): Promise<boolean> {
      const user = await this.userRepository.findOne({
        where: { userId: _userId },
      });
      // 사용자 없으면 false 반환
      if (!user) {
        return false;
      }
      const participation = await this.participantRepository.findOne({
        where: { event: { id: eventId }, user: { id: user.id } },
      });
      return !!participation; // 값이 존재하면 true, 없으면 false
    }
    
    async updateStatus(
      participantId: number,
      status: string,
      eventId: number,
    ): Promise<Participant> {
      // participant와 관련된 user 정보를 함께 조회
      const participant = await this.participantRepository.findOne({
        where: { id: participantId },
        relations: ['user'],
      });
      const curEvent = await  this.eventRepository.findOne({
        where: { id: eventId}
      })

      //예외처리리
      if (!curEvent) {
        throw new NotFoundException(`event with ID ${eventId} not found`);
      }
      if (!participant) {
        throw new NotFoundException(`Participant with ID ${participantId} not found`);
      }
  
      participant.status = status;
      const updatedParticipant = await this.participantRepository.save(participant);

        // 상태가 Approved인 경우 채팅방에 사용자 추가
      if (status === 'Approved' && curEvent.chatRoom) {
        const user = participant.user;

        // 채팅방에 사용자가 이미 추가되어 있는지 확인
        const isUserInRoom = curEvent.chatRoom.users.some(
          (roomUser) => roomUser.id === user.id,
        );

        if (!isUserInRoom) {
          curEvent.chatRoom.users.push(user); // 채팅방에 사용자 추가
          await this.eventRepository.save(curEvent); // 이벤트 저장 (채팅방 업데이트)
        }
      }
  
      // 이메일 전송: 상태에 따라 각각 다른 템플릿 사용
      try {
        if (status === 'Approved') {
          await this.emailService.sendApprovedEmail(
            participant.user.email,
            {
              guestName: participant.user.username,
              eventTitle: curEvent.name,
              eventDate: curEvent.date,
              eventLocation: curEvent.location,
              eventId: curEvent.id,
            },
          );
        } else if (status === 'Rejected') {
          await this.emailService.sendRejectedEmail(
            participant.user.email,
            {
              guestName: participant.user.username,
              eventTitle: curEvent.name,
            },
          );
        }
      } catch (error) {
        console.error('이메일 전송 실패:', error);
        // 이메일 전송 실패해도 업데이트 로직은 정상 처리하도록 함
      }
  
      return updatedParticipant;
    }
    async getApprovedParticipantsCount(eventId: number): Promise<number> {
      return await this.participantRepository.count({
        where: {
          event: { id: eventId },
          status: 'Approved',
        },
      });
    }

  // participant.service.ts

async countApprovedParticipantsByEvent(eventId: number): Promise<number> {
  return this.participantRepository.count({
    where: {
      event: { id: eventId },
      status: 'Approved',
    },
  });
}

async getParticipantsByEventId(eventId: number): Promise<{ email: string }[]> {
  try {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['participants','participants.user'], // 참가자와의 관계를 로드
    });

    if (!event) {
      throw new HttpException('Event not found.', HttpStatus.NOT_FOUND);
    }

    return event.participants.map((participant) => ({
      email: participant.user.email, // 참가자의 이메일 반환
    }));
  } catch (error) {
    console.error('Error fetching participants:', error);
    throw new HttpException(
        'Failed to fetch participants. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

}
