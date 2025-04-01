import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // ✅ TypeOrmModule 추가
import { VerificationController } from './mail.controller';
import { EmailService } from './mail.service';
import { EmailVerification } from './emailVerification.entity'; // ✅ 엔터티 추가
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailVerification]), // ✅ EmailVerification 엔터티 등록
    UserModule
  ],
  controllers: [VerificationController],
  providers: [EmailService],
  exports: [EmailService, TypeOrmModule],
})
export class MailModule {}
