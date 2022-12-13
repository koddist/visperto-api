import { Test, TestingModule } from '@nestjs/testing';
import { TravelRestrictionsService } from './travel-restrictions.service';

describe('TravelRestrictionsService', () => {
  let service: TravelRestrictionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TravelRestrictionsService],
    }).compile();

    service = module.get<TravelRestrictionsService>(TravelRestrictionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
