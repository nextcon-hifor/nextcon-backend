import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EmailService } from '../mail/mail.service';
import { MailModule } from '../mail/mail.module';
import { AdEmail, HiforEvent } from './events.entity';
import { User } from '../user/user.entity';
import { EmailVerification } from '../mail/emailVerification.entity';
import { eventImage } from 'src/image/image.entity';
import { Participant } from 'src/participant/participant.entity';
import { ImageModule } from 'src/image/image.module';
import { ParticipantModule } from 'src/participant/participant.module';
import { Like } from 'src/likes/likes.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([HiforEvent, eventImage, User, EmailVerification, Participant, Like, AdEmail]),
    forwardRef(() => MailModule),
    ImageModule,
    forwardRef(() => ParticipantModule),
  ],
  controllers: [EventsController],
  providers: [EventsService, EmailService],
  exports: [
    EventsService,
    TypeOrmModule, 
  ],
})
export class EventsModule {}
