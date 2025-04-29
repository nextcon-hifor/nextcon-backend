import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { User } from './user.entity';
import { UserService } from './user.service';
import { JwtModule } from '@nestjs/jwt';
import { GoogleStrategy } from './google.strategy';

import { PassportModule } from '@nestjs/passport';
import { ChatMessage } from 'src/chat/message/message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ChatMessage]),
  
    PassportModule.register({ session: false }),
    JwtModule.register({
      secret: '123',
      signOptions: { expiresIn: '1h' },
    }),],
  controllers: [UserController],
  providers: [UserService, GoogleStrategy],
  exports: [UserService],
})
export class UserModule {}
