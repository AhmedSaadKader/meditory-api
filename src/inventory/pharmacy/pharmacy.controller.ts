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
import { Permission } from '../../auth/enums/permission.enum';
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
  create(@Body() createPharmacyDto: CreatePharmacyDto) {
    return this.pharmacyService.create(createPharmacyDto);
  }

  @Get()
  @Allow(Permission.ReadInventory)
  @ApiOperation({ summary: 'Get all pharmacies' })
  @ApiResponse({ status: 200, description: 'Return all pharmacies' })
  findAll() {
    return this.pharmacyService.findAll();
  }

  @Get(':id')
  @Allow(Permission.ReadInventory)
  @ApiOperation({ summary: 'Get a pharmacy by ID' })
  @ApiResponse({ status: 200, description: 'Return the pharmacy' })
  @ApiResponse({ status: 404, description: 'Pharmacy not found' })
  findOne(@Param('id') id: string) {
    return this.pharmacyService.findOne(id);
  }

  @Patch(':id')
  @Allow(Permission.UpdateInventory)
  @ApiOperation({ summary: 'Update a pharmacy' })
  @ApiResponse({ status: 200, description: 'Pharmacy updated successfully' })
  @ApiResponse({ status: 404, description: 'Pharmacy not found' })
  update(
    @Param('id') id: string,
    @Body() updatePharmacyDto: UpdatePharmacyDto,
  ) {
    return this.pharmacyService.update(id, updatePharmacyDto);
  }

  @Delete(':id')
  @Allow(Permission.UpdateInventory)
  @ApiOperation({ summary: 'Delete a pharmacy' })
  @ApiResponse({ status: 200, description: 'Pharmacy deleted successfully' })
  @ApiResponse({ status: 404, description: 'Pharmacy not found' })
  remove(@Param('id') id: string) {
    return this.pharmacyService.remove(id);
  }
}
