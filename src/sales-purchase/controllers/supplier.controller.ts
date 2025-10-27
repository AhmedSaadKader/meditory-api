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
import { SupplierService } from '../services/supplier.service';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Permission } from '../../auth/enums/permission.enum';
import { Ctx } from '../../auth/decorators/request-context.decorator';
import { RequestContext } from '../../auth/types/request-context';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  @Permissions(Permission.CreateSupplier)
  create(@Body() createSupplierDto: CreateSupplierDto, @Ctx() ctx: RequestContext) {
    return this.supplierService.create(createSupplierDto, ctx);
  }

  @Get()
  @Permissions(Permission.ReadSupplier)
  findAll(@Ctx() ctx: RequestContext) {
    return this.supplierService.findAll(ctx);
  }

  @Get(':id')
  @Permissions(Permission.ReadSupplier)
  findOne(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.supplierService.findOne(id, ctx);
  }

  @Patch(':id')
  @Permissions(Permission.UpdateSupplier)
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @Ctx() ctx: RequestContext,
  ) {
    return this.supplierService.update(id, updateSupplierDto, ctx);
  }

  @Delete(':id')
  @Permissions(Permission.DeleteSupplier)
  remove(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.supplierService.remove(id, ctx);
  }
}
