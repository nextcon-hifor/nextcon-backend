import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { User } from 'src/user/user.entity';
import { UserService } from 'src/user/user.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
  constructor(private userService: UserService,
              private configService: ConfigService, ) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${configService.get<string>('BASE_URL')}/user/google`,
      scope: [
        'email',
        'profile'
      ],
    });
  }
  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    const email = profile?.emails?.[0]?.value;
    const fullName = `${profile?.name?.familyName || ''}${profile?.name?.givenName || ''}`.trim();
  
    if (!email) {
      throw new Error('Google에서 이메일을 제공하지 않았습니다.');
    }
  
    try {
      let user = await this.userService.findByEmail(email);
  
      if (!user) {
        user = await this.userService.signUpToGoogle(email, fullName);
      }
  
      return user;
    } catch (error) {
      console.error('Google 사용자 검증 중 오류 발생:', {
        message: error.message,
        stack: error.stack,
        profile,
      });
  
      throw new Error('Google 사용자 인증 실패');
    }
  }
  
}
