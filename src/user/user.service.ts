import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, SignInUserDto } from './user.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name); // 로거 인스턴스 생성

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

 // user CRUD
  createUser(user): Promise<User> {
    return this.userRepository.save(user);
  }
  async signUp(userDto: CreateUserDto) {
    const encryptedPassword = bcrypt.hashSync(userDto.password, 10);

    try {
      const user = await this.createUser({
        ...userDto,
        password: encryptedPassword,
      });
      user.password = '';
      this.logger.log(`signUp 성공 → userId=${user.userId}, email=${user.email}`);
      return user;
    } catch (error) {
      this.logger.error('signUp 실패', error.stack);
      throw new HttpException('서버에러', 500);
    }
  }
  async updateUser(user: any) {
    const { email, ...fieldsToUpdate } = user;

    try {
      await this.userRepository.update({ email }, fieldsToUpdate);
      const updatedUser = await this.userRepository.findOne({ where: { email } });
      this.logger.log(`updateUser(${email}) → 업데이트 성공`);
      return updatedUser;
    } catch (error) {
      this.logger.error('updateUser 에러:', error.stack);
      throw new Error('Failed to update user');
    }
  }

  async deleteUser(userId: string) {
    await this.userRepository.delete({ userId });
    this.logger.warn(`deleteUser(${userId}) → 사용자 삭제됨`);
    return { message: 'User deleted successfully.' };
  }
// USER CRUD

async generateJwtToken(user: any) {
  const payload = { email: user.email, userId: user.userId };
  const token = this.jwtService.sign(payload);
  this.logger.log(`generateJwtToken → 토큰 생성됨 (userId=${user.userId})`);
  return { access_token: token };
}

  async googleGenerateJwtToken(user: {
    id: number;
    userId: string;
    email: string;
    username: string;
    dob?: Date | null;
    gender?: string | null;
    nationality?: string | null;
  }) {
    const payload = {
      id: user.id,
      userId: user.userId,
      email: user.email,
      name: user.username,
      dob: user.dob,
      gender: user.gender,
      nationality: user.nationality,
    };

    const token = this.jwtService.sign(payload);
    this.logger.log(`googleGenerateJwtToken(${user.userId}) → 토큰 생성 완료`);
    return { access_token: token };
  }

  async isUserId(userId: string) {
    const result = await this.userRepository.findOne({ where: { userId } });
    this.logger.debug(`isUserId(${userId}) → ${result ? '존재함' : '없음'}`);
    return result;
  }

  async isEmail(email: string) {
    const result = await this.userRepository.findOne({ where: { email } });
    this.logger.debug(`isEmail(${email}) → ${result ? '존재함' : '없음'}`);
    return result;
  }

  async getUser(userId: string) {
    const result = await this.userRepository.findOne({ where: { userId } });
    if (!result) {
      this.logger.warn(`getUser(${userId}) → 사용자 없음`);
      throw new NotFoundException('User not found');
    }

    const age = this.calculateAge(result.dob);
    this.logger.debug(`getUser(${userId}) → 나이 계산됨: ${age}`);
    return { ...result, age };
  }

  async findByEmail(email: string) {
    const result = await this.userRepository.findOne({ where: { email } });
    this.logger.debug(`findByEmail(${email}) → ${result ? '조회됨' : '없음'}`);
    return result;
  }

  async findByUsernameAndEmail(userId: string, email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { userId, email } });
    if (!user) {
      this.logger.warn(`findByUsernameAndEmail(${userId}, ${email}) → 사용자 없음`);
      throw new NotFoundException('해당 사용자 정보를 찾을 수 없습니다.');
    }
    this.logger.log(`findByUsernameAndEmail → 사용자 조회 성공`);
    return user;
  }

  async signUpToGoogle(
    email: string,
    username: string,
  ): Promise<User> {
    return await this.userRepository.save({
      email,
      username,
    });
  }

  //생년월일을 받아서 나이를 계산하는 api
  private calculateAge(dob: string | Date): number {
    const birthDate = dob instanceof Date ? dob : new Date(dob);

    if (isNaN(birthDate.getTime())) {
      this.logger.error('calculateAge → 잘못된 생년월일 형식');
      throw new Error('Invalid date format');
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  //user table에 변경된 imageurl 갱신하는 api
  async updateProfileImage(userId: string, imageUrl: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { userId } });

    if (!user) {
      this.logger.warn(`updateProfileImage(${userId}) → 사용자 없음`);
      throw new NotFoundException('User not found');
    }

    user.profileImage = imageUrl;
    this.logger.log(`updateProfileImage(${userId}) → 이미지 변경 완료`);
    return await this.userRepository.save(user);
  }


  //로그인시 사용자 검즘 api
  async validateUser(userId: string, password: string) {
    const user = await this.getUser(userId);
    if (!user) {
      this.logger.warn(`validateUser(${userId}) → 사용자 없음`);
      return null;
    }

    const { password: hashedPassword, ...userInfo } = user;
    const isValid = await bcrypt.compare(password, hashedPassword);

    if (isValid) {
      this.logger.log(`validateUser(${userId}) → 로그인 성공`);
      return userInfo;
    } else {
      this.logger.warn(`validateUser(${userId}) → 비밀번호 불일치`);
      return null;
    }
  }




//비밀번호 관련  API
  //비밀번호 변경한지 6개월지나면 true 리턴하는 api
  isPasswordChangeRequired(passwordLastChanged: Date, months: number = 6): boolean {
    const now = new Date();
    const durationInMs = months * 30 * 24 * 60 * 60 * 1000;
    const isRequired =
      new Date(passwordLastChanged).getTime() < now.getTime() - durationInMs;
    this.logger.debug(`isPasswordChangeRequired → ${isRequired}`);
    return isRequired;
  }


  //비밀번호 변경 api
  async updatePassword(userDto: SignInUserDto): Promise<void> {
    try {
      const { userId, password } = userDto;
      const hashedPassword = bcrypt.hashSync(password, 10);
      await this.updateUserPassword(userId, hashedPassword);
      this.logger.log(`updatePassword(${userId}) → 비밀번호 변경 완료`);
    } catch (error) {
      this.logger.error('updatePassword 실패', error.stack);
      throw new BadRequestException('비밀번호 업데이트 중 오류가 발생했습니다.');
    }
  }

  async updateUserPassword(userId: string, password: string) {
    const user = await this.getUser(userId);
    user.password = password;
    user.passwordReset = false;
    this.logger.log(`updateUserPassword(${userId}) → 비밀번호 변경 완료`);
    return this.userRepository.save(user);
  }

  

  //비밀번호 잊었을때 메일로 비밀번호 변경했을때 사용
  async updatePasswordAndFlag(userId: string, newPassword: string): Promise<void> {
    const encryptedPassword = bcrypt.hashSync(newPassword, 10);
    const user = await this.getUser(userId);
    user.password = encryptedPassword;
    user.passwordReset = true;

    await this.userRepository.save(user);
    this.logger.log(`updatePasswordAndFlag(${userId}) → 비밀번호 초기화 및 플래그 설정 완료`);
  }


}
