import { Test, TestingModule } from '@nestjs/testing';
import { BookingLinksController } from './booking-links.controller';

describe('BookingLinksController', () => {
  let controller: BookingLinksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingLinksController],
    }).compile();

    controller = module.get<BookingLinksController>(BookingLinksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
