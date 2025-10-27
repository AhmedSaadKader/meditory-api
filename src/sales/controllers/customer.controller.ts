import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CustomerService } from '../services/customer.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { Allow } from '../../auth/decorators/allow.decorator';
import { Permission } from '../../auth/enums/permission.enum';
import { Ctx } from '../../auth/decorators/ctx.decorator';
import { RequestContext } from '../../auth/types/request-context';

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @Allow(Permission.CreateCustomer)
  create(@Body() createCustomerDto: CreateCustomerDto, @Ctx() ctx: RequestContext) {
    return this.customerService.create(createCustomerDto, ctx);
  }

  @Get()
  @Allow(Permission.ReadCustomer)
  findAll(@Ctx() ctx: RequestContext) {
    return this.customerService.findAll(ctx);
  }

  @Get(':id')
  @Allow(Permission.ReadCustomer)
  findOne(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.customerService.findOne(id, ctx);
  }

  @Patch(':id')
  @Allow(Permission.UpdateCustomer)
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @Ctx() ctx: RequestContext,
  ) {
    return this.customerService.update(id, updateCustomerDto, ctx);
  }

  @Delete(':id')
  @Allow(Permission.DeleteCustomer)
  remove(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.customerService.remove(id, ctx);
  }
}
