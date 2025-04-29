import { IsString, IsNumber, IsOptional, IsDate } from 'class-validator';
import { User } from 'src/user/user.entity';

export class CreateMessageDto {
  @IsString()
  content: string;

  @IsString()
  sender: User;

  @IsString()
  @IsOptional()
  senderId?: string;

  @IsNumber()
  @IsOptional()
  roomId?: number;
}