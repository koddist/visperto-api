import { Test, TestingModule } from '@nestjs/testing';
import { LogtailService } from './logtail.service';

describe('LogtailService', () => {
  let service: LogtailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogtailService],
    }).compile();

    service = module.get<LogtailService>(LogtailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
