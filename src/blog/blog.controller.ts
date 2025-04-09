import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { BlogService } from './blog.service';
import { CreateBlogDto } from './blog.dto';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  create(@Body() createBlogDto: CreateBlogDto) {
    return this.blogService.create(createBlogDto);
  }

  @Get()
  findAll() {
    return this.blogService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blogService.findOne(+id);
  }

//   @Patch(':id')
//   update(@Param('id') id: string, @Body() updateBlogDto: UpdateBlogDto) {
//     return this.blogService.update(+id, updateBlogDto);
//   }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blogService.remove(+id);
  }
}
