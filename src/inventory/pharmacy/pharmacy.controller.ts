import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Allow } from '../../auth/decorators/allow.decorator';
import { Ctx } from '../../auth/decorators/ctx.decorator';
import { Permission } from '../../auth/enums/permission.enum';
import { RequestContext } from '../../auth/types/request-context';
import { PharmacyService } from './pharmacy.service';
import { CreatePharmacyDto } from '../dto/create-pharmacy.dto';
import { UpdatePharmacyDto } from '../dto/update-pharmacy.dto';

@ApiTags('Pharmacies')
@Controller('pharmacies')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Post()
  @Allow(Permission.UpdateInventory)
  @ApiOperation({ summary: 'Create a new pharmacy' })
  @ApiResponse({ status: 201, description: 'Pharmacy created successfully' })
  create(@Body() createPharmacyDto: CreatePharmacyDto, @Ctx() ctx: RequestContext) {
    return this.pharmacyService.create(createPharmacyDto, ctx);
  }

  @Get()
  @Allow(Permission.ReadInventory)
  @ApiOperation({ summary: 'Get all pharmacies' })
  @ApiResponse({ status: 200, description: 'Return all pharmacies' })
  findAll(@Ctx() ctx: RequestContext) {
    return this.pharmacyService.findAll(ctx);
  }

  @Get(':id')
  @Allow(Permission.ReadInventory)
  @ApiOperation({ summary: 'Get a pharmacy by ID' })
  @ApiResponse({ status: 200, description: 'Return the pharmacy' })
  @ApiResponse({ status: 404, description: 'Pharmacy not found' })
  findOne(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.pharmacyService.findOne(id, ctx);
  }

  @Patch(':id')
  @Allow(Permission.UpdateInventory)
  @ApiOperation({ summary: 'Update a pharmacy' })
  @ApiResponse({ status: 200, description: 'Pharmacy updated successfully' })
  @ApiResponse({ status: 404, description: 'Pharmacy not found' })
  update(
    @Param('id') id: string,
    @Body() updatePharmacyDto: UpdatePharmacyDto,
    @Ctx() ctx: RequestContext,
  ) {
    return this.pharmacyService.update(id, updatePharmacyDto, ctx);
  }

  @Delete(':id')
  @Allow(Permission.UpdateInventory)
  @ApiOperation({ summary: 'Delete a pharmacy' })
  @ApiResponse({ status: 200, description: 'Pharmacy deleted successfully' })
  @ApiResponse({ status: 404, description: 'Pharmacy not found' })
  remove(@Param('id') id: string, @Ctx() ctx: RequestContext) {
    return this.pharmacyService.remove(id, ctx);
  }
}
