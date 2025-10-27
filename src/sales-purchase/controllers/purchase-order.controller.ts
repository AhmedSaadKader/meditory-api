import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PurchaseOrderService } from '../services/purchase-order.service';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';
import { UpdatePurchaseOrderStatusDto } from '../dto/update-purchase-order-status.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { Permission } from '../../auth/enums/permission.enum';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  @Post()
  @RequirePermissions(Permission.CreatePurchaseOrder)
  create(@Request() req, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchaseOrderService.create(req.user.organizationId, dto);
  }

  @Get()
  @RequirePermissions(Permission.ReadPurchaseOrder)
  findAll(@Request() req) {
    return this.purchaseOrderService.findAll(req.user.organizationId);
  }

  @Get(':id')
  @RequirePermissions(Permission.ReadPurchaseOrder)
  findOne(@Request() req, @Param('id') id: string) {
    return this.purchaseOrderService.findOne(req.user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.UpdatePurchaseOrder)
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrderService.update(req.user.organizationId, id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.UpdatePurchaseOrder)
  updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderStatusDto,
  ) {
    return this.purchaseOrderService.updateStatus(
      req.user.organizationId,
      id,
      req.user.sub,
      dto,
    );
  }

  @Delete(':id')
  @RequirePermissions(Permission.DeletePurchaseOrder)
  remove(@Request() req, @Param('id') id: string) {
    return this.purchaseOrderService.remove(req.user.organizationId, id);
  }
}
