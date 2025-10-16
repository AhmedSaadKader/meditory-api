import { IsNotEmpty, IsNumber } from 'class-validator';

export class AssignRoleDto {
  @IsNumber()
  @IsNotEmpty()
  roleId: number;
}
