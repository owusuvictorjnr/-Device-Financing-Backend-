import { UserResponseDto } from '../../users/dto';

export class AuthResponseDto {
  accessToken: string;
  user: UserResponseDto;
}
