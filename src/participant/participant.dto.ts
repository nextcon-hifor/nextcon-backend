import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateParticipantDto {
  @IsNotEmpty()
  @IsNumber()
  eventId: number;

  @IsNotEmpty()
  userId: string;

  @IsString()
  answer: string;
}