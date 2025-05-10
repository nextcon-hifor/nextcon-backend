import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { EventsModule } from './events/events.module';
import { LikesModule } from './likes/likes.module';
import { MailModule } from './mail/mail.module';
import { ParticipantModule } from './participant/participant.module';
import { ImageModule } from './image/image.module';
import { ReviewModule } from './review/review.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogModule } from './blog/blog.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ChatRoomModule } from './chat/room/room.module';
import { ChatMessageModule } from './chat/message/message.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'], // 환경 변수 파일 로드
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (!databaseUrl) {
          console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다!');
          throw new Error('DATABASE_URL is not defined!');
        }

        console.log(`✅ DATABASE_URL: ${databaseUrl}`);

        return {
          type: 'postgres',
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize: configService.get<boolean>('DB_SYNCHRONIZE', true),
          logging: configService.get<boolean>('DB_LOGGING', false),
        };
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    UserModule,
    EventsModule,
    LikesModule,
    MailModule,
    ParticipantModule,
    ImageModule,
    ReviewModule,
    BlogModule,
    ChatMessageModule,
    ChatRoomModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
