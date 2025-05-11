import {
    Body,
    Controller,
    Get,
    Post,
    Param,
    Request,
    Response,
    Put,
    Delete,
    BadRequestException,
    NotFoundException, UseInterceptors, HttpException, UploadedFile, HttpStatus, UseGuards,
    Patch,
    UnauthorizedException,
  } from '@nestjs/common';
  import { CreateUserDto, SignInUserDto } from './user.dto';
  import { UserService } from './user.service';
  import { ConfigService } from '@nestjs/config';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { extname } from 'path';
import { GoogleAuthGuard } from './auth.guard';
import supabase from '../supabase';
  
  
  @Controller('user')
  export class UserController {
    constructor(private userService: UserService,
      private readonly configService: ConfigService,
    ) {}
  
    
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

    
  @Get('to-google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Request() req) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Request() req, @Response() res) {
    const { user } = req;

    // DB에서 사용자 정보 조회
    const completeUser = await this.userService.findByEmail(user.email);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    if (!completeUser || !completeUser.dob || !completeUser.gender || !completeUser.nationality) {
      res.redirect(`${frontendUrl}/googleSignUp?email=${user.email}&name=${user.username}`);
      return;
    }

    const jwtToken = await this.userService.googleGenerateJwtToken({
      id: completeUser.id,
      userId: completeUser.userId,
      email: completeUser.email,
      username: completeUser.username,
      dob: completeUser.dob,
      gender: completeUser.gender,
      nationality: completeUser.nationality,
    });

    res.redirect(`${frontendUrl}/?access_token=${jwtToken.access_token}&userId=${completeUser.userId}`);

  }


  
  @Post('googleSignUp')
  async handleGoogleSignUp(@Body() body: any) {
    const { email, userId, dob, gender, nationality } = body;
    try {
      // 서비스 호출
      const user = await this.userService.findByEmail(email);
      if (!user) {
        throw new HttpException('해당 이메일의 사용자를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
      }
      
      user.userId = userId;
      user.dob = dob;
      user.gender = gender;
      user.nationality = nationality;
      await this.userService.updateUser(user);
      // JWT 토큰 생성
      const jwtToken = await this.userService.generateJwtToken(user);
    
      return {
        access_token: jwtToken,
        message: '로그인 성공',
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }    
  }

  @Post('uploadProfileImage/:userId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined,
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|heic|webp)$/)) {
          return callback(new HttpException('Only image files are allowed!', HttpStatus.BAD_REQUEST), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadProfileImage(@Param('userId') userId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    // 파일 확장자 추출
    const fileExt = extname(file.originalname);
    const fileName = `${userId}-${Date.now()}${fileExt}`;

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new HttpException('Failed to upload image', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Supabase에서 제공하는 퍼블릭 URL 생성
    const imageUrl = `https://vpivwjxuuobsmetklofb.supabase.co/storage/v1/object/public/profile-images/${fileName}`;

    // DB에 저장된 유저 프로필 이미지 업데이트
    const updatedUser = await this.userService.updateProfileImage(userId, imageUrl);

    if (!updatedUser) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return {
      message: 'Profile image updated successfully',
      imageUrl,
    };
  }
  }
  