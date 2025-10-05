import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReferenceDataService } from './reference-data.service';

@ApiTags('reference-data')
@Controller('reference-data')
export class ReferenceDataController {
  constructor(private readonly referenceDataService: ReferenceDataService) {}

  @Get('ingredients')
  @ApiOperation({
    summary: 'Get all active ingredients (grouped)',
    description: `
      Returns all active ingredient groups available in the database.
      Use these to filter drugs by ingredient in search endpoints.

      Each ingredient group may contain multiple synonyms and related terms.
      Includes therapeutic category classification where available.
    `,
  })
  getIngredients() {
    return this.referenceDataService.getIngredients();
  }

  @Get('dosage-forms')
  @ApiOperation({
    summary: 'Get all dosage forms',
    description: `
      Returns all standardized dosage forms (e.g., Tablet, Capsule, Syrup).
      Use these to filter drugs by dosage form in search endpoints.

      Includes:
      - Standard name (use this for filtering)
      - Description
      - Pharmaceutical category
      - Synonyms and alternative names
    `,
  })
  getDosageForms() {
    return this.referenceDataService.getDosageForms();
  }

  @Get('routes')
  @ApiOperation({
    summary: 'Get all administration routes',
    description: `
      Returns all standardized administration routes (e.g., Oral, Topical, IV).
      Use these to filter drugs by route in search endpoints.

      Includes:
      - Standard name (use this for filtering)
      - Description
      - Administration type (Systemic/Local)
      - Synonyms and alternative names
    `,
  })
  getRoutes() {
    return this.referenceDataService.getRoutes();
  }

  @Get('therapeutic-categories')
  @ApiOperation({
    summary: 'Get all therapeutic categories',
    description: `
      Returns all therapeutic/pharmacological categories with clinical information.

      Includes:
      - Category name and description
      - ATC (Anatomical Therapeutic Chemical) codes
      - Mechanism of action
      - Primary indications
      - Contraindications
      - Common side effects

      Use for advanced filtering and clinical information display.
    `,
  })
  getTherapeuticCategories() {
    return this.referenceDataService.getTherapeuticCategories();
  }

  @Get('companies')
  @ApiOperation({
    summary: 'Get all pharmaceutical companies',
    description: `
      Returns all unique pharmaceutical companies in the database.
      Use these to filter drugs by manufacturer/company.

      Note: Company names may include distributor information separated by '>'.
    `,
  })
  getCompanies() {
    return this.referenceDataService.getCompanies();
  }
}
