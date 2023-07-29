import { Test, TestingModule } from '@nestjs/testing';
import { SelectedCountriesService } from './selected-countries.service';

describe('SelectedCountriesService', () => {
  let service: SelectedCountriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SelectedCountriesService],
    }).compile();

    service = module.get<SelectedCountriesService>(SelectedCountriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
