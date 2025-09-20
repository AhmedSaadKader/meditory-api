import { Test, TestingModule } from '@nestjs/testing';
import { DrugsController } from './drugs.controller';
import { DrugsService } from './drugs.service';

describe('DrugsController', () => {
  let controller: DrugsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DrugsController],
      providers: [DrugsService],
    }).compile();

    controller = module.get<DrugsController>(DrugsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
