import { Module } from '@nestjs/common';
import { ImageService } from './image.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { eventImage } from './image.entity';

@Module({
  controllers: [],
  imports: [TypeOrmModule.forFeature([eventImage])],
  providers: [ImageService],
  exports: [ImageService], // 다른 모듈에서 LikesService를 사용할 수 있게 함
})
export class ImageModule {}