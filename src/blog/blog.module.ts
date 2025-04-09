import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { Blog } from './blog.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Blog])],
  controllers: [BlogController],
  providers: [BlogService],
})
export class BlogModule {}
