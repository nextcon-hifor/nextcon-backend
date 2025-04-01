import { Module } from '@nestjs/common';
import { ParticipantController } from './participant.controller';
import { ParticipantService } from './participant.service';

@Module({
  controllers: [ParticipantController],
  providers: [ParticipantService],
  exports: [ParticipantService], // 다른 모듈에서 사용할 수 있도록
})
export class ParticipantModule {}
