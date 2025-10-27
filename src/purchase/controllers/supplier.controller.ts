import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SupplierService } from '../services/supplier.service';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';
import { Allow } from '../../auth/decorators/allow.decorator';
import { Permission } from '../../auth/enums/permission.enum';
import { Ctx } from '../../auth/decorators/ctx.decorator';
import { RequestContext } from '../../auth/types/request-context';

@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  @Allow(Permission.CreateSupplier)
  create(@Body() createSupplierDto: CreateSupplierDto, @Ctx() ctx: RequestContext) {
    return this.supplierService.create(createSupplierDto, ctx);
  }

  @Get()
  @Allow(Permission.ReadSupplier)
  findAll(@Ctx() ctx: RequestContext) {
    return this.supplierService.findAll(ctx);
  }

  @Get(':id')
  @Allow(Permission.ReadSupplier)
  findOne(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.supplierService.findOne(id, ctx);
  }

  @Patch(':id')
  @Allow(Permission.UpdateSupplier)
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @Ctx() ctx: RequestContext,
  ) {
    return this.supplierService.update(id, updateSupplierDto, ctx);
  }

  @Delete(':id')
  @Allow(Permission.DeleteSupplier)
  remove(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.supplierService.remove(id, ctx);
  }
}
