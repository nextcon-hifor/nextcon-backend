import { IsString, IsNumber, ValidateNested, IsObject } from 'class-validator';
import { User } from 'src/user/user.entity';
import { Type } from 'class-transformer';

class SenderDto {
  @IsNumber()
  id: number;

  @IsString()
  username?: string;

  @IsString()
  email?: string;
}

export class CreateMessageDto {
  @IsString()
  content: string;

  @IsNumber()
  roomId: number;

  // 엔티티와 일치하도록 sender는 User 타입으로 처리합니다.
  // (생성 시 클라이언트가 전체 User 객체를 전달하거나, 미들웨어에서 주입하는 방식으로 구성할 수 있습니다.)
  @IsObject()
  @ValidateNested()
  @Type(() => SenderDto)
  sender: SenderDto;
}