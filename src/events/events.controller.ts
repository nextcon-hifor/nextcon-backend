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
            if (!searchEventDto) throw new Error('SearchEventDto is required');
            return await this.eventsService.searchEvent(searchEventDto);        
          case 'category':
            if (!category) throw new Error('category is required');
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

    @Post('upload-image-postEvent')
    @UseInterceptors(
      FileInterceptor('file', {
        storage: undefined, // Supabase 사용 시 Multer의 storage 필요 없음
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
        fileFilter: (req, file, callback) => {
          if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|heic|webp)$/)) {
            return callback(new HttpException('Only image files are allowed!', HttpStatus.BAD_REQUEST), false);
          }
          callback(null, true);
        },
      }),
    )
    async uploadImage(@UploadedFile() file: Express.Multer.File) {
      if (!file) {
        throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
      }
  
      // 파일명 생성 (이벤트용 이미지라 event- 접두사 추가)
      const fileExt = extname(file.originalname);
      const fileName = `event-${Date.now()}${fileExt}`;
  
      // Supabase Storage에 업로드
      const { data, error } = await supabase.storage
        .from('event-images')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });
      if (error) {
        throw new HttpException('Failed to upload image', HttpStatus.INTERNAL_SERVER_ERROR);
      }
  
      // Supabase에서 제공하는 퍼블릭 URL 생성
      const imageUrl = `https://vpivwjxuuobsmetklofb.supabase.co/storage/v1/object/public/event-images/${fileName}`;
  
      return {
        success: true,
        fileName: file.originalname,
        imageUrl,
      };
    }
  }
    