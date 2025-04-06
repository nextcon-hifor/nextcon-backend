import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import * as passport from 'passport';
import * as express from 'express';
import { join } from 'path';
import {ConfigService} from "@nestjs/config";

async function bootstrap() {

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  console.log('🌐 Allowed Origin:', frontendUrl);
  app.enableCors({
    origin: [frontendUrl],
    credentials: true, // 쿠키 사용 허용
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  // 👇 OPTIONS 요청 처리
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.options('*', (_, res) => {
    res.sendStatus(204);
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false, // 추가 데이터 무시
    transform: true, // 요청 데이터를 DTO로 자동 변환
  }));
  app.use(cookieParser());

  app.use(
    session({
      secret: 'very-important-secret', // 세션 암호화에 사용되는 키
      resave: false, // 세션을 항상 저장할 지 여부
      saveUninitialized: false, // 세션이 저장되기 전에 uninitialized 상태로 미리 만들어서 저장
      cookie: {
        maxAge: 3600000, // 1시간
        secure: true, // HTTPS에서만 쿠키 전달 (배포 환경에서는 필수)
        sameSite: 'none', // CORS 문제 해결
        httpOnly: true, // JS에서 접근 불가능 (보안 강화)
      },
    }),
  );

  app.use(passport.initialize());
  // ✅ 전역 Validation Pipe 설정
  app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false, // 추가 데이터 무시
        transform: true, // DTO 자동 변환
      }),
  );
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
