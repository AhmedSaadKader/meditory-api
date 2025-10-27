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
import { PurchaseReceiptService } from '../services/purchase-receipt.service';
import { CreatePurchaseReceiptDto } from '../dto/create-purchase-receipt.dto';
import { UpdatePurchaseReceiptStatusDto } from '../dto/update-purchase-receipt-status.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { Permission } from '../../auth/enums/permission.enum';

@Controller('purchase-receipts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseReceiptController {
  constructor(
    private readonly purchaseReceiptService: PurchaseReceiptService,
  ) {}

  @Post()
  @RequirePermissions(Permission.CreatePurchaseReceipt)
  create(@Request() req, @Body() dto: CreatePurchaseReceiptDto) {
    return this.purchaseReceiptService.create(req.user.organizationId, dto);
  }

  @Get()
  @RequirePermissions(Permission.ReadPurchaseReceipt)
  findAll(@Request() req) {
    return this.purchaseReceiptService.findAll(req.user.organizationId);
  }

  @Get(':id')
  @RequirePermissions(Permission.ReadPurchaseReceipt)
  findOne(@Request() req, @Param('id') id: string) {
    return this.purchaseReceiptService.findOne(req.user.organizationId, id);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.UpdatePurchaseReceipt)
  updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseReceiptStatusDto,
  ) {
    return this.purchaseReceiptService.updateStatus(
      req.user.organizationId,
      id,
      req.user.sub,
      dto,
    );
  }

  @Delete(':id')
  @RequirePermissions(Permission.DeletePurchaseReceipt)
  remove(@Request() req, @Param('id') id: string) {
    return this.purchaseReceiptService.remove(req.user.organizationId, id);
  }
}
