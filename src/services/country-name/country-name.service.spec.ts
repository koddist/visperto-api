import { Test, TestingModule } from '@nestjs/testing';
import { CountryNameService } from './country-name.service';

describe('CountryNameService', () => {
  let service: CountryNameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CountryNameService],
    }).compile();

    service = module.get<CountryNameService>(CountryNameService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
