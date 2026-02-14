import { Test, TestingModule } from '@nestjs/testing';
import { BookingLinksService } from './booking-links.service';

describe('BookingLinksService', () => {
  let service: BookingLinksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BookingLinksService],
    }).compile();

    service = module.get<BookingLinksService>(BookingLinksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
