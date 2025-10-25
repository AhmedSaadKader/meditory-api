import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ResetUserPasswordDto {
  @ApiProperty({
    description: 'New password for the user (minimum 6 characters)',
    example: 'NewSecurePass123!',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
