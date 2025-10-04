import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { DrugsService } from './drugs.service';
import { CreateDrugDto } from './dto/create-drug.dto';
import { UpdateDrugDto } from './dto/update-drug.dto';
import { Paginate, Paginated } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { Drug } from './entities/drug.entity';
import { PaginatedSwaggerDocs } from 'nestjs-paginate/lib/swagger';
import { DRUG_PAGINATION_CONFIG } from './config/pagination.config';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('drugs')
@Controller('drugs')
export class DrugsController {
  constructor(private readonly drugsService: DrugsService) {}

  @Post()
  create(@Body() createDrugDto: CreateDrugDto) {
    return this.drugsService.create(createDrugDto);
  }

  @Get()
  @PaginatedSwaggerDocs(Drug, DRUG_PAGINATION_CONFIG)
  findAll(@Paginate() query: PaginateQuery): Promise<Paginated<Drug>> {
    return this.drugsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.drugsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDrugDto: UpdateDrugDto) {
    return this.drugsService.update(+id, updateDrugDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.drugsService.remove(+id);
  }

  @Get('search/ingredient')
  @ApiOperation({
    summary: 'Search drugs by ingredient name',
    description: `
      Search for drugs by active ingredient (e.g., paracetamol, ibuprofen).
      Searches across:
      - Standard ingredient terms (exact match)
      - Synonyms and alternative spellings
      - Ingredient groups (finds all drugs in the group)

      Optional filters: dosage_form, route, price range
    `,
  })
  @ApiQuery({ name: 'query', required: true, example: 'paracetamol', description: 'Ingredient name to search' })
  @ApiQuery({ name: 'dosage_form', required: false, example: 'Tablet', description: 'Filter by dosage form' })
  @ApiQuery({ name: 'route', required: false, example: 'Oral', description: 'Filter by administration route' })
  @ApiQuery({ name: 'price_min', required: false, type: Number, example: 10, description: 'Minimum price' })
  @ApiQuery({ name: 'price_max', required: false, type: Number, example: 100, description: 'Maximum price' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20, description: 'Items per page (default: 20, max: 100)' })
  searchByIngredient(
    @Query('query') query: string,
    @Query('dosage_form') dosageForm?: string,
    @Query('route') route?: string,
    @Query('price_min') priceMin?: string,
    @Query('price_max') priceMax?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.drugsService.searchByIngredient(
      query,
      dosageForm,
      route,
      priceMin !== undefined ? parseFloat(priceMin) : undefined,
      priceMax !== undefined ? parseFloat(priceMax) : undefined,
      page !== undefined ? parseInt(page) : undefined,
      limit !== undefined ? parseInt(limit) : undefined,
    );
  }
}
