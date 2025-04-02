import { forwardRef, Module } from '@nestjs/common';
import { ParticipantController } from './participant.controller';
import { ParticipantService } from './participant.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/user.entity';
import { HiforEvent } from 'src/events/events.entity';
import { Participant } from './participant.entity';
import { Like } from 'src/likes/likes.entity';
import { MailModule } from 'src/mail/mail.module';
import { EventsModule } from 'src/events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, HiforEvent, Participant, Like]),
    MailModule,
    forwardRef(() => EventsModule),
  ],  
  controllers: [ParticipantController],
  providers: [ParticipantService],
  exports: [ParticipantService], // 다른 모듈에서 사용할 수 있도록
})
export class ParticipantModule {}
