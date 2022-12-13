import { Test, TestingModule } from '@nestjs/testing';
import { VisaRequirementsService } from './visa-requirements.service';

describe('VisaRequirementsService', () => {
  let service: VisaRequirementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VisaRequirementsService],
    }).compile();

    service = module.get<VisaRequirementsService>(VisaRequirementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
