import { Controller, Post, Body, Get, Param, Patch, HttpException, HttpStatus, Query } from '@nestjs/common';
import { ParticipantService } from './participant.service';
import { EventsService } from 'src/events/events.service';
import { CreateParticipantDto } from './participant.dto';

@Controller('participants')
export class ParticipantController {
  constructor(
    private readonly participantService: ParticipantService,
    private readonly eventsService: EventsService,
  ) {}

    @Post('createParticipant')
    async createParticipant(@Body() createParticipantDto: CreateParticipantDto) {
      const { eventId, userId, answer } = createParticipantDto;
      return await this.participantService.createParticipant(eventId, userId, answer);
    }

    @Post('cancelParticipation')
    async cancelParticipation(
      @Body() cancelParticipationDto: { userId: string; eventId: number }
    ): Promise<{ message: string }> {
      const { userId, eventId } = cancelParticipationDto;

      if (!userId || !eventId) {
        throw new HttpException('Missing userId or eventId', HttpStatus.BAD_REQUEST);
      }

      await this.eventsService.cancelParticipation(userId, eventId);
      return { message: 'Participation canceled successfully.' };
    }

    @Patch(':id/status')
    async updateParticipantStatus(
      @Param('id') participantId: number,
      @Body('status') status: string,
      @Body('eventId') eventId: number,
    ) {
      if (!['Approved', 'Rejected'].includes(status)) {
        throw new HttpException('Invalid status value', HttpStatus.BAD_REQUEST);
      }
  
      return await this.participantService.updateStatus(participantId, status, eventId);
    }

    @Get('checkParticipation')
    async checkParticipation(
      @Query('eventId') eventId: number,
      @Query('userId') userId: string
    ): Promise<{ isParticipating: boolean }> {
      console.log(userId,eventId);
      const isParticipating = await this.participantService.checkParticipation(eventId, userId);
      return { isParticipating };
    }

    @Get('getParticipatedEvent/:userId')
    async getParticipatedEvent(@Param('userId') participatedId: string) {
      return await this.participantService.getParticipatedEvent(participatedId);
    }    
    

}
