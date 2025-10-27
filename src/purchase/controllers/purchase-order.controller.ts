import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PurchaseOrderService } from '../services/purchase-order.service';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';
import { UpdatePurchaseOrderStatusDto } from '../dto/update-purchase-order-status.dto';
import { Allow } from '../../auth/decorators/allow.decorator';
import { Ctx } from '../../auth/decorators/ctx.decorator';
import { Permission } from '../../auth/enums/permission.enum';
import { RequestContext } from '../../auth/types/request-context';

@Controller('purchase-orders')
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  @Post()
  @Allow(Permission.CreatePurchaseOrder)
  create(@Body() dto: CreatePurchaseOrderDto, @Ctx() ctx: RequestContext) {
    return this.purchaseOrderService.create(ctx.activeOrganizationId!, dto);
  }

  @Get()
  @Allow(Permission.ReadPurchaseOrder)
  findAll(@Ctx() ctx: RequestContext) {
    return this.purchaseOrderService.findAll(ctx.activeOrganizationId!);
  }

  @Get(':id')
  @Allow(Permission.ReadPurchaseOrder)
  findOne(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.purchaseOrderService.findOne(ctx.activeOrganizationId!, id);
  }

  @Patch(':id')
  @Allow(Permission.UpdatePurchaseOrder)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @Ctx() ctx: RequestContext,
  ) {
    return this.purchaseOrderService.update(ctx.activeOrganizationId!, id, dto);
  }

  @Patch(':id/status')
  @Allow(Permission.UpdatePurchaseOrder)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderStatusDto,
    @Ctx() ctx: RequestContext,
  ) {
    return this.purchaseOrderService.updateStatus(
      ctx.activeOrganizationId!,
      id,
      String(ctx.activeUserId),
      dto,
    );
  }

  @Delete(':id')
  @Allow(Permission.DeletePurchaseOrder)
  remove(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.purchaseOrderService.remove(ctx.activeOrganizationId!, id);
  }
}
