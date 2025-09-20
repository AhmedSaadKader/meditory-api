import { Test, TestingModule } from '@nestjs/testing';
import { DrugsService } from './drugs.service';

describe('DrugsService', () => {
  let service: DrugsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DrugsService],
    }).compile();

    service = module.get<DrugsService>(DrugsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
