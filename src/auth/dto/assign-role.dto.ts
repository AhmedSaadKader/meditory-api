import { IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({
    description: 'ID of the role to assign',
    example: 1,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  roleId: number;
}
