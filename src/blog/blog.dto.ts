import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsArray,
    ValidateNested,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  
  class FaqDto {
    @IsString()
    @IsNotEmpty()
    question: string;
  
    @IsString()
    @IsNotEmpty()
    answer: string;
  }
  
  class RelatedLinkDto {
    @IsString()
    @IsNotEmpty()
    url: string;
  
    @IsString()
    @IsOptional()
    description?: string;
  }
  
  export class CreateBlogDto {
    @IsString()
    @IsNotEmpty()
    title: string;
  
    @IsString()
    @IsNotEmpty()
    content: string;
  
    @IsString()
    @IsOptional()
    category?: string;
  
    @IsString()
    @IsOptional()
    language?: string;
  
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    subtitles?: string[];
  
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => FaqDto)
    faqs?: FaqDto[];
  
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => RelatedLinkDto)
    relatedLinks?: RelatedLinkDto[];
  }
  