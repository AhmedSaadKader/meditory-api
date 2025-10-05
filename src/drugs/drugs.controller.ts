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
  @ApiQuery({
    name: 'query',
    required: true,
    example: 'paracetamol',
    description: 'Ingredient name to search',
  })
  @ApiQuery({
    name: 'dosage_form',
    required: false,
    example: 'Tablet',
    description: 'Filter by dosage form',
  })
  @ApiQuery({
    name: 'route',
    required: false,
    example: 'Oral',
    description: 'Filter by administration route',
  })
  @ApiQuery({
    name: 'price_min',
    required: false,
    type: Number,
    example: 10,
    description: 'Minimum price',
  })
  @ApiQuery({
    name: 'price_max',
    required: false,
    type: Number,
    example: 100,
    description: 'Maximum price',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: 'Items per page (default: 20, max: 100)',
  })
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

  @Get('search')
  @ApiOperation({
    summary: 'Unified search across drug names and ingredients',
    description: `
      Universal search that finds drugs by:
      - Drug name (exact or partial match)
      - Active ingredient name
      - Ingredient synonyms and alternative spellings
      - Ingredient groups

      Supports wildcards:
      - * = match any characters (e.g., "para*" finds paracetamol)
      - ? = match single character (e.g., "para?ol" finds parazol)

      Results are prioritized: exact name > drug name > ingredient > synonym > group
      Optional filters: dosage_form, route, price range
    `,
  })
  @ApiQuery({
    name: 'query',
    required: true,
    example: 'abimol',
    description:
      'Search term (drug name or ingredient, supports * and ? wildcards)',
  })
  @ApiQuery({
    name: 'dosage_form',
    required: false,
    example: 'Tablet',
    description: 'Filter by dosage form',
  })
  @ApiQuery({
    name: 'route',
    required: false,
    example: 'Oral',
    description: 'Filter by administration route',
  })
  @ApiQuery({
    name: 'price_min',
    required: false,
    type: Number,
    example: 10,
    description: 'Minimum price',
  })
  @ApiQuery({
    name: 'price_max',
    required: false,
    type: Number,
    example: 100,
    description: 'Maximum price',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: 'Items per page (default: 20, max: 100)',
  })
  searchUnified(
    @Query('query') query: string,
    @Query('dosage_form') dosageForm?: string,
    @Query('route') route?: string,
    @Query('price_min') priceMin?: string,
    @Query('price_max') priceMax?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.drugsService.searchUnified(
      query,
      dosageForm,
      route,
      priceMin !== undefined ? parseFloat(priceMin) : undefined,
      priceMax !== undefined ? parseFloat(priceMax) : undefined,
      page !== undefined ? parseInt(page) : undefined,
      limit !== undefined ? parseInt(limit) : undefined,
    );
  }

  @Get('search/advanced')
  @ApiOperation({
    summary: 'Advanced search with separate drug name and ingredient filters',
    description: `
      Search drugs by drug name AND/OR active ingredient with separate filters.

      Example use cases:
      - Search drug name containing "ab" AND ingredient "paracetamol"
      - Search only by drug name: "abimol"
      - Search only by ingredient: "paracetamol"
      - Combine both for precise filtering

      Both filters support wildcards:
      - * = match any characters
      - ? = match single character

      Optional filters: dosage_form, route, price range
    `,
  })
  @ApiQuery({
    name: 'drug_name',
    required: false,
    example: 'ab*',
    description: 'Drug name filter (supports * and ? wildcards)',
  })
  @ApiQuery({
    name: 'ingredient',
    required: false,
    example: 'paracetamol',
    description: 'Active ingredient filter (supports * and ? wildcards)',
  })
  @ApiQuery({
    name: 'dosage_form',
    required: false,
    example: 'Tablet',
    description: 'Filter by dosage form',
  })
  @ApiQuery({
    name: 'route',
    required: false,
    example: 'Oral',
    description: 'Filter by administration route',
  })
  @ApiQuery({
    name: 'price_min',
    required: false,
    type: Number,
    example: 10,
    description: 'Minimum price',
  })
  @ApiQuery({
    name: 'price_max',
    required: false,
    type: Number,
    example: 100,
    description: 'Maximum price',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: 'Items per page (default: 20, max: 100)',
  })
  searchAdvanced(
    @Query('drug_name') drugName?: string,
    @Query('ingredient') ingredient?: string,
    @Query('dosage_form') dosageForm?: string,
    @Query('route') route?: string,
    @Query('price_min') priceMin?: string,
    @Query('price_max') priceMax?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.drugsService.searchAdvanced(
      drugName,
      ingredient,
      dosageForm,
      route,
      priceMin !== undefined ? parseFloat(priceMin) : undefined,
      priceMax !== undefined ? parseFloat(priceMax) : undefined,
      page !== undefined ? parseInt(page) : undefined,
      limit !== undefined ? parseInt(limit) : undefined,
    );
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
}
