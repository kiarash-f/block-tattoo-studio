import { Test, TestingModule } from '@nestjs/testing';
import { StudioStationsService } from './studio-stations.service';

describe('StudioStationsService', () => {
  let service: StudioStationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudioStationsService],
    }).compile();

    service = module.get<StudioStationsService>(StudioStationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
