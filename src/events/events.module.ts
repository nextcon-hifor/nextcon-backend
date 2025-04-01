import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EmailService } from '../mail/mail.service';
import { MailModule } from '../mail/mail.module';
import { HiforEvent } from './events.entity';
import { User } from '../user/user.entity';
import { EmailVerification } from '../mail/emailVerification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([HiforEvent, Image, User, EmailVerification]),
    forwardRef(() => MailModule),
  ],
  controllers: [EventsController],
  providers: [EventsService, EmailService],
  exports: [
    EventsService,
    TypeOrmModule, 
  ],
})
export class GatheringModule {}
