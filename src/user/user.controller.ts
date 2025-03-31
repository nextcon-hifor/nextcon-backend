import {
    Body,
    Controller,
    Get,
    Post,
    Param,
    Put,
    Delete,
    BadRequestException,
    NotFoundException, UseInterceptors, HttpException, UploadedFile, HttpStatus, UseGuards,
    Patch,
    UnauthorizedException,
  } from '@nestjs/common';
  import { CreateUserDto, SignInUserDto } from './user.dto';
  import { UserService } from './user.service';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { extname } from 'path';
  
  
  @Controller('user')
  export class UserController {
    constructor(private userService: UserService) {}
  
    
    @Get('/isUserId/:userId')
    async isUserId(@Param('userId') userId: string) {
      const user = await this.userService.isUserId(userId);
      //console.log("user:",user);
      return { available: !user };
    } 
    
    @Get('/isEmail/:email')
    async isEmail(@Param('email') email: string) {
      const user = await this.userService.isEmail(email);
      //console.log("user:",user);
      return { available: !user };
    }
  
    @Get('/getUser/:userId')
    async getUser(@Param('userId') userId: string) {
      
      //console.log("userid:",userId)
      const user = await this.userService.getUser(userId);
      //console.log("user:",user)
      return user;
    }
  
    @Post('/updateUser')
    async updateUser(@Body() user: CreateUserDto) {
      console.log('updatedto in u cont in upuser',user )
      return this.userService.updateUser(user);
    }
    
  
    @Delete('/delete/:id')
    async deleteUser(@Param('id') id: string) {
      return this.userService.deleteUser(id);
    }
  
    @Post('findUsername')
    async findUsername(@Body('email') email: string) {
      if (!email) {
        throw new BadRequestException('이메일을 입력해주세요.');
      }
  
      // 1. 이메일을 통해 유저 정보를 조회
      const user = await this.userService.findByEmail(email); // UserService에서 이메일로 유저 조회
  
      if (!user) {
        throw new NotFoundException('등록된 이메일이 없습니다.');
      }
  
      // 2. 조회된 유저의 아이디 반환 (보안을 위해 이메일로 전송하는 것도 가능)
      return { username: user.userId, message: '아이디 찾기가 완료되었습니다.' };
    }

    @Post('signUp') 
    async signUp(@Body() userDto: CreateUserDto) {
      return await this.userService.signUp(userDto); 
    }
  
    @Post('signIn')
    async signIn(@Body() userDto: SignInUserDto) {
      // 1. 사용자 정보 확인
      const userInfo = await this.userService.validateUser(userDto.userId, userDto.password);
      
      //console.log('userinfo:',userInfo )
      if (!userInfo) {
        throw new UnauthorizedException('잘못된 사용자 정보입니다.');
      }
  
       // 2. 비밀번호 변경 기간 확인 (예: 6개월 경과 여부 확인) 및 초기화 여부 확인
      const isPasswordChangeRequired =
      userInfo.passwordReset || // 비밀번호 초기화 여부 확인
      this.userService.isPasswordChangeRequired(userInfo.passwordLastChanged, 6); // 마지막 변경일 확인
  
    
      // 3. JWT 토큰 생성
      const jwtToken = await this.userService.generateJwtToken(userInfo);
    
       // 4. 로그인 성공 응답
      return {
        access_token: jwtToken,
        message: '로그인 성공',
        passwordChangeRequired: isPasswordChangeRequired,
      };
    }

    @Patch('updatePassword')
    async updatePassword(@Body() userDto: SignInUserDto): Promise<void> {
      try {
        await this.userService.updatePassword(userDto);
      } catch (error) {
        console.error('Error updating password:', error);
        throw new HttpException('Failed to update password', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
  