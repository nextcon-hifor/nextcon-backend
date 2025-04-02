import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';

@Injectable()
export class signInGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    // Authorization 헤더에서 토큰 확인
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        request.user = this.jwtService.verify(token);
        return true;
      } catch (error) {
        return false;
      }
    }

    // 로그인 시도 시 이메일과 비밀번호 검증
    if (!request.body.email || !request.body.password) {
      return false;
    }

    const user = await this.userService.validateUser(
      request.body.email,
      request.body.password,
    );

    if (!user) {
      return false;
    }

    const jwt = await this.userService.generateJwtToken(user);
    request.user = user;
    request.jwt = jwt; // 응답에 JWT 포함
    return true;
  }
}


@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  async canActivate(context: any): Promise<boolean> {
    return (await super.canActivate(context)) as boolean;
  }
}


