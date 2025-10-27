import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PurchaseReceiptService } from '../services/purchase-receipt.service';
import { CreatePurchaseReceiptDto } from '../dto/create-purchase-receipt.dto';
import { UpdatePurchaseReceiptStatusDto } from '../dto/update-purchase-receipt-status.dto';
import { Allow } from '../../auth/decorators/allow.decorator';
import { Ctx } from '../../auth/decorators/ctx.decorator';
import { Permission } from '../../auth/enums/permission.enum';
import { RequestContext } from '../../auth/types/request-context';

@Controller('purchase-receipts')
export class PurchaseReceiptController {
  constructor(
    private readonly purchaseReceiptService: PurchaseReceiptService,
  ) {}

  @Post()
  @Allow(Permission.CreatePurchaseReceipt)
  create(@Body() dto: CreatePurchaseReceiptDto, @Ctx() ctx: RequestContext) {
    return this.purchaseReceiptService.create(ctx.activeOrganizationId!, dto);
  }

  @Get()
  @Allow(Permission.ReadPurchaseReceipt)
  findAll(@Ctx() ctx: RequestContext) {
    return this.purchaseReceiptService.findAll(ctx.activeOrganizationId!);
  }

  @Get(':id')
  @Allow(Permission.ReadPurchaseReceipt)
  findOne(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.purchaseReceiptService.findOne(ctx.activeOrganizationId!, id);
  }

  @Patch(':id/status')
  @Allow(Permission.UpdatePurchaseReceipt)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseReceiptStatusDto,
    @Ctx() ctx: RequestContext,
  ) {
    return this.purchaseReceiptService.updateStatus(
      ctx.activeOrganizationId!,
      id,
      ctx.activeUserId!,
      dto,
    );
  }

  @Delete(':id')
  @Allow(Permission.DeletePurchaseReceipt)
  remove(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.purchaseReceiptService.remove(ctx.activeOrganizationId!, id);
  }
}
