import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blog } from './blog.entity';
import { CreateBlogDto } from './blog.dto';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(Blog)
    private readonly blogRepository: Repository<Blog>,
  ) {}

  async create(createBlogDto: CreateBlogDto): Promise<Blog> {
    const blog = this.blogRepository.create(createBlogDto);
    return this.blogRepository.save(blog);
  }

  async findAll(): Promise<Blog[]> {
    return this.blogRepository.find();
  }

  async findOne(id: number): Promise<Blog> {
    const blog = await this.blogRepository.findOne({ where: { id } });
    if (!blog) throw new NotFoundException(`Blog with ID ${id} not found`);
    return blog;
  }

//   async update(id: number, updateBlogDto: UpdateBlogDto): Promise<Blog> {
//     const blog = await this.findOne(id);
//     const updated = Object.assign(blog, updateBlogDto);
//     return this.blogRepository.save(updated);
//   }

  async remove(id: number): Promise<void> {
    const result = await this.blogRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Blog with ID ${id} not found`);
    }
  }
}
