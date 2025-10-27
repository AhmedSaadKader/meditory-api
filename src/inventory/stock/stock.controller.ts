import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Allow } from '../../auth/decorators/allow.decorator';
import { Permission } from '../../auth/enums/permission.enum';
import { Ctx } from '../../auth/decorators/ctx.decorator';
import { RequestContext } from '../../auth/types/request-context';
import { StockService } from './stock.service';
import { ReceiveStockDto } from '../dto/receive-stock.dto';
import { DispenseStockDto } from '../dto/dispense-stock.dto';
import { AdjustStockDto } from '../dto/adjust-stock.dto';
import { TransferStockDto } from '../dto/transfer-stock.dto';
import { AllocateStockDto } from '../dto/allocate-stock.dto';
import { ReleaseStockDto } from '../dto/release-stock.dto';

@ApiTags('Stock Management')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('receive')
  @Allow(Permission.UpdateInventory)
  @ApiOperation({ summary: 'Receive stock from supplier' })
  @ApiResponse({ status: 201, description: 'Stock received successfully' })
  receiveStock(@Body() dto: ReceiveStockDto, @Ctx() ctx: RequestContext) {
    if (!ctx.activeUserId) {
      throw new UnauthorizedException('User ID not found in session');
    }
    return this.stockService.receiveStock(dto, ctx.activeUserId, ctx);
  }

  @Post('dispense')
  @Allow(Permission.UpdateInventory)
  @ApiOperation({ summary: 'Dispense stock (FEFO logic)' })
  @ApiResponse({ status: 201, description: 'Stock dispensed successfully' })
  @ApiResponse({ status: 404, description: 'No available stock found' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  dispenseStock(@Body() dto: DispenseStockDto, @Ctx() ctx: RequestContext) {
    if (!ctx.activeUserId) {
      throw new UnauthorizedException('User ID not found in session');
    }
    return this.stockService.dispenseStock(dto, ctx.activeUserId, ctx);
  }

  @Get('levels/:pharmacyId')
  @Allow(Permission.ReadInventory)
  @ApiOperation({ summary: 'Get stock levels by pharmacy' })
  @ApiParam({ name: 'pharmacyId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Returns stock levels' })
  getStockLevels(@Param('pharmacyId') pharmacyId: string, @Ctx() ctx: RequestContext) {
    return this.stockService.getStockLevelsByPharmacy(pharmacyId, ctx);
  }

  @Get('movements/:pharmacyId')
  @Allow(Permission.ReadInventory)
  @ApiOperation({ summary: 'Get stock movement history' })
  @ApiParam({ name: 'pharmacyId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Returns movement history' })
  getMovementHistory(
    @Param('pharmacyId') pharmacyId: string,
    @Ctx() ctx: RequestContext,
    @Query('limit') limit?: number,
  ) {
    return this.stockService.getMovementHistory(pharmacyId, ctx, limit);
  }

  @Post('adjust')
  @Allow(Permission.UpdateInventory)
  @ApiOperation({ summary: 'Manually adjust stock quantity' })
  @ApiResponse({ status: 201, description: 'Stock adjusted successfully' })
  @ApiResponse({ status: 404, description: 'Stock batch not found' })
  @ApiResponse({
    status: 400,
    description: 'Invalid adjustment (would result in negative stock)',
  })
  adjustStock(@Body() dto: AdjustStockDto, @Ctx() ctx: RequestContext) {
    if (!ctx.activeUserId) {
      throw new UnauthorizedException('User ID not found in session');
    }
    return this.stockService.adjustStock(dto, ctx.activeUserId, ctx);
  }

  @Get('low-stock/:pharmacyId')
  @Allow(Permission.ReadInventory)
  @ApiOperation({ summary: 'Get low stock items (at or below minimum level)' })
  @ApiParam({ name: 'pharmacyId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Returns low stock items' })
  getLowStockItems(@Param('pharmacyId') pharmacyId: string, @Ctx() ctx: RequestContext) {
    return this.stockService.getLowStockItems(pharmacyId, ctx);
  }

  @Get('expiring/:pharmacyId')
  @Allow(Permission.ReadInventory)
  @ApiOperation({ summary: 'Get stock expiring within specified days' })
  @ApiParam({ name: 'pharmacyId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Returns expiring stock' })
  getExpiringStock(
    @Param('pharmacyId') pharmacyId: string,
    @Ctx() ctx: RequestContext,
    @Query('daysThreshold') daysThreshold?: number,
  ) {
    return this.stockService.getExpiringStock(pharmacyId, ctx, daysThreshold);
  }

  @Post('remove-expired/:pharmacyId')
  @Allow(Permission.UpdateInventory)
  @ApiOperation({ summary: 'Remove all expired stock for a pharmacy' })
  @ApiParam({ name: 'pharmacyId', type: 'string' })
  @ApiResponse({
    status: 201,
    description: 'Expired stock removed successfully',
  })
  removeExpiredStock(
    @Param('pharmacyId') pharmacyId: string,
    @Ctx() ctx: RequestContext,
  ) {
    const userId = ctx.activeUserId;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in session');
    }
    return this.stockService.removeExpiredStock(pharmacyId, userId, ctx);
  }

  @Post('transfer')
  @Allow(Permission.UpdateInventory)
  @ApiOperation({ summary: 'Transfer stock between pharmacies' })
  @ApiResponse({ status: 201, description: 'Stock transferred successfully' })
  @ApiResponse({ status: 404, description: 'Source stock not found' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  transferStock(@Body() dto: TransferStockDto, @Ctx() ctx: RequestContext) {
    if (!ctx.activeUserId) {
      throw new UnauthorizedException('User ID not found in session');
    }
    return this.stockService.transferStock(dto, ctx.activeUserId, ctx);
  }

  @Post('allocate')
  @Allow(Permission.UpdateInventory)
  @ApiOperation({ summary: 'Allocate stock (reserve for pending prescriptions)' })
  @ApiResponse({ status: 201, description: 'Stock allocated successfully' })
  @ApiResponse({ status: 404, description: 'No available stock found' })
  @ApiResponse({ status: 400, description: 'Insufficient unallocated stock' })
  allocateStock(@Body() dto: AllocateStockDto, @Ctx() ctx: RequestContext) {
    if (!ctx.activeUserId) {
      throw new UnauthorizedException('User ID not found in session');
    }
    return this.stockService.allocateStock(dto, ctx.activeUserId, ctx);
  }

  @Post('release')
  @Allow(Permission.UpdateInventory)
  @ApiOperation({ summary: 'Release allocated stock (cancel reservation)' })
  @ApiResponse({ status: 201, description: 'Stock released successfully' })
  @ApiResponse({ status: 404, description: 'No allocated stock found' })
  @ApiResponse({ status: 400, description: 'Insufficient allocated stock' })
  releaseStock(@Body() dto: ReleaseStockDto, @Ctx() ctx: RequestContext) {
    if (!ctx.activeUserId) {
      throw new UnauthorizedException('User ID not found in session');
    }
    return this.stockService.releaseStock(dto, ctx.activeUserId, ctx);
  }
}
