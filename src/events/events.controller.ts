import {
    Body,
    Controller, Delete,
    Get,
    HttpException,
    HttpStatus,
    NotFoundException,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query, Req,
    UploadedFile, UseGuards,
    UseInterceptors,
    ValidationPipe,
  } from '@nestjs/common';
  import {
    CreateEventDto,
    SearchEventDto
  } from './events.dto';
  import { EventsService } from './events.service';
  import { ConfigService } from '@nestjs/config';
  
  import { FileInterceptor } from '@nestjs/platform-express';
  import { diskStorage } from 'multer';
  import { v4 as uuidv4 } from 'uuid';
  import * as path from 'path';
  import * as console from 'node:console';
  import { extname } from 'path';
  import supabase from '../supabase';
  
  @Controller('events')
    export class EventsController {
      constructor(    private readonly eventsService: EventsService,
                      private readonly configService: ConfigService,
                     ) {}
  

  
    @Post('submit')
    async createEvent(@Body() createEventDto: CreateEventDto) {
        try {
          const event = await this.eventsService.createEvent(createEventDto);
          return { success: true, event };
        } catch (error) {
          console.error(error);
          return { success: false, message: error.message };
        }
    }
  
    @Get()
    async getEvents(
      @Query('fetchType') fetchType: string,
      @Query('category') category?: string,
      @Query(new ValidationPipe({ transform: true })) searchEventDto?: SearchEventDto,
    ) {
      try {
        switch (fetchType) {
          case 'all':
            return await this.eventsService.getAllEvents();
          case 'hot':
            return await this.eventsService.getHotEvents();
          case 'search':
            return await this.eventsService.searchEvent(searchEventDto);
          case 'category':
            return await this.eventsService.searchEventByCategory(category);
          case 'upcoming':
            return await this.eventsService.getUpcomingEvents();
          default:
            throw new Error('Invalid type parameter');
        }
      } catch (error) {
        throw new Error(`Failed to get events: ${error.message}`);
      }
    }

    @Get('getEvents/:eventId')
    async getEvent(@Param('eventId') eventId: number) {
      const event = await this.eventsService.getEventById(eventId);
      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }
      return event;
    }
  
    @Get('getEventForPending/:eventId')
    async getEventByIdForPending(@Param('eventId') eventId: number) {
      const event = await this.eventsService.getEventByIdForPending(eventId);
      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }
      return event;
    }


    @Get('getEventsByHostId/:userId')
    async getEventsByHostId(@Param('userId') hostId: string){
      return await this.eventsService.getEventsByHostId(hostId)
    }



    @Get('getLikedEvent/:userId')
    async getLikedEvent(@Param('userId') likedId: string) {
      return await this.eventsService.getLikedEvents(likedId);
    }

    @Get('sorted')
    async getSortedEvents(@Query('sortBy') sortBy: string) {
      return await this.eventsService.getSortedEvents(sortBy);
    }

    // 요청 본문에서 email 필드만 추출합니다.
    @Post('subscribe')
    async subscribe(@Body('email') email: string) {
      return await this.eventsService.subscribe(email);
    }

    @Delete(':eventId')
    async deleteEvent(@Param('eventId') eventId: number) {
      const deleted = await this.eventsService.deleteEvent(eventId);
      if (!deleted) {
        throw new HttpException('Event not found or failed to delete', HttpStatus.NOT_FOUND);
      }
      return { message: 'Event successfully deleted' };
    }
  }
    