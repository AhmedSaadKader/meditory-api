import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CustomerService } from '../services/customer.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Permission } from '../../auth/enums/permission.enum';
import { Ctx } from '../../auth/decorators/request-context.decorator';
import { RequestContext } from '../../auth/types/request-context';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @Permissions(Permission.CreateCustomer)
  create(@Body() createCustomerDto: CreateCustomerDto, @Ctx() ctx: RequestContext) {
    return this.customerService.create(createCustomerDto, ctx);
  }

  @Get()
  @Permissions(Permission.ReadCustomer)
  findAll(@Ctx() ctx: RequestContext) {
    return this.customerService.findAll(ctx);
  }

  @Get(':id')
  @Permissions(Permission.ReadCustomer)
  findOne(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.customerService.findOne(id, ctx);
  }

  @Patch(':id')
  @Permissions(Permission.UpdateCustomer)
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @Ctx() ctx: RequestContext,
  ) {
    return this.customerService.update(id, updateCustomerDto, ctx);
  }

  @Delete(':id')
  @Permissions(Permission.DeleteCustomer)
  remove(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.customerService.remove(id, ctx);
  }
}
