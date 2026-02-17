import { Test, TestingModule } from '@nestjs/testing';
import { BookingAssignmentsService } from './booking-assignments.service';

describe('BookingAssignmentsService', () => {
  let service: BookingAssignmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BookingAssignmentsService],
    }).compile();

    service = module.get<BookingAssignmentsService>(BookingAssignmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
