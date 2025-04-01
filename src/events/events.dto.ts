import {
    IsBoolean,
    IsOptional,
    IsString,
    IsArray,
    IsNumber,
    IsUUID,
    IsPositive,
    IsNotEmpty,
    IsDateString,
  } from 'class-validator';
  
  export class CreateEventDto {
  
    @IsString()
    userId: string;
  
    @IsOptional()
    @IsString()
    category?: string;
  
    @IsOptional()
    @IsString()
    type?: string;
  
    @IsString()
    name: string;
  
    @IsOptional()
    @IsString()
    location?: string;
  
    @IsOptional()
    @IsString()
    locationDetail?: string;
    
    @IsOptional()
    @IsString()
    date?: string;
  
    @IsOptional()
    @IsString()
    time?: string;
  
    @IsOptional()
    @IsString()
    description?: string;
  
    @IsOptional()
    @IsString()
    mainImage?: string;
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true }) // 배열의 각 항목이 문자열인지 검사
    images: string[]; // 이미지 URL 배열
  
    @IsOptional()
    @IsNumber()
    @IsPositive()
    maxParticipants?: number;
  
    @IsOptional()
    @IsNumber()
    @IsPositive()
    minParticipants?: number;
  
    @IsOptional()
    @IsNumber()
    price?: number;
  
    @IsOptional()
    @IsString()
    question?: string;
  }

  export class SearchEventDto {
    @IsOptional()
    @IsString()
    query?: string;
  
    @IsOptional()
    @IsString()
    date?: string;
  
    @IsOptional()
    @IsString()
    location?: string;
  
    @IsOptional()
    @IsString()
    type?: string;
  }