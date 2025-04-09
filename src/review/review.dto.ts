import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  userId: string;

  @IsNumber({ maxDecimalPlaces: 1 }) // 소수점 1자리까지만 허용
  @Min(0)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsNumber()
  eventId: number;
}

export class UpdateReviewDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}