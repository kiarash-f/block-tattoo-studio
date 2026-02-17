import { Test, TestingModule } from '@nestjs/testing';
import { BookingAssignmentsController } from './booking-assignments.controller';

describe('BookingAssignmentsController', () => {
  let controller: BookingAssignmentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingAssignmentsController],
    }).compile();

    controller = module.get<BookingAssignmentsController>(BookingAssignmentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
