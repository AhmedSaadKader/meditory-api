import { Controller, Post, Get, Body, Param, Query, UnauthorizedException } from '@nestjs/common';
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

@ApiTags('Stock Management')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('receive')
  @Allow(Permission.UpdateInventory)
  @ApiOperation({ summary: 'Receive stock from supplier' })
  @ApiResponse({ status: 201, description: 'Stock received successfully' })
  receiveStock(@Body() dto: ReceiveStockDto) {
    return this.stockService.receiveStock(dto);
  }

  @Post('dispense')
  @Allow(Permission.UpdateInventory)
  @ApiOperation({ summary: 'Dispense stock (FEFO logic)' })
  @ApiResponse({ status: 201, description: 'Stock dispensed successfully' })
  @ApiResponse({ status: 404, description: 'No available stock found' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  dispenseStock(@Body() dto: DispenseStockDto) {
    return this.stockService.dispenseStock(dto);
  }

  @Get('levels/:pharmacyId')
  @Allow(Permission.ReadInventory)
  @ApiOperation({ summary: 'Get stock levels by pharmacy' })
  @ApiParam({ name: 'pharmacyId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Returns stock levels' })
  getStockLevels(@Param('pharmacyId') pharmacyId: string) {
    return this.stockService.getStockLevelsByPharmacy(pharmacyId);
  }

  @Get('movements/:pharmacyId')
  @Allow(Permission.ReadInventory)
  @ApiOperation({ summary: 'Get stock movement history' })
  @ApiParam({ name: 'pharmacyId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Returns movement history' })
  getMovementHistory(
    @Param('pharmacyId') pharmacyId: string,
    @Query('limit') limit?: number,
  ) {
    return this.stockService.getMovementHistory(pharmacyId, limit);
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
  adjustStock(@Body() dto: AdjustStockDto) {
    return this.stockService.adjustStock(dto);
  }

  @Get('low-stock/:pharmacyId')
  @Allow(Permission.ReadInventory)
  @ApiOperation({ summary: 'Get low stock items (at or below minimum level)' })
  @ApiParam({ name: 'pharmacyId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Returns low stock items' })
  getLowStockItems(@Param('pharmacyId') pharmacyId: string) {
    return this.stockService.getLowStockItems(pharmacyId);
  }

  @Get('expiring/:pharmacyId')
  @Allow(Permission.ReadInventory)
  @ApiOperation({ summary: 'Get stock expiring within specified days' })
  @ApiParam({ name: 'pharmacyId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Returns expiring stock' })
  getExpiringStock(
    @Param('pharmacyId') pharmacyId: string,
    @Query('daysThreshold') daysThreshold?: number,
  ) {
    return this.stockService.getExpiringStock(pharmacyId, daysThreshold);
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
    return this.stockService.removeExpiredStock(pharmacyId, userId);
  }

  @Post('transfer')
  @Allow(Permission.UpdateInventory)
  @ApiOperation({ summary: 'Transfer stock between pharmacies' })
  @ApiResponse({ status: 201, description: 'Stock transferred successfully' })
  @ApiResponse({ status: 404, description: 'Source stock not found' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  transferStock(@Body() dto: TransferStockDto) {
    return this.stockService.transferStock(dto);
  }
}
