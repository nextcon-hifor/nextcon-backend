import { IsString, IsEmail, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsString()
  userId: string;

  @IsEmail()
  email: string;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  dob?: string;  // 생년월일 (선택 사항)

  @IsString()
  @IsOptional()
  gender?: string;  // 성별 (선택 사항)

  @IsString()
  @IsOptional()
  nationality?: string; // 국적 - 선택 사항
}


export class UpdateUserDto {
  @IsString()
  username: string;

  @IsString()
  @IsOptional()
  dob?: string;  // 생년월일 (선택 사항)

  @IsString()
  @IsOptional()
  gender?: string;  // 성별 (선택 사항)

  @IsString()
  @IsOptional()
  phoneNumber?: string; // 휴대폰 번호 (선택 사항)

  @IsString()
  @IsOptional()
  nationality?: string; // 국적 - 선택 사항

  @IsString()
  @IsOptional()
  identityStatus?: string; // 신분 - 선택 사항
}

export class SignInUserDto {
  @IsString()
  userId: string;

  @IsString()
  password: string;
}

export class FindPasswordDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;
}
