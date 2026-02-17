import { Test, TestingModule } from '@nestjs/testing';
import { StudioStationsController } from './studio-stations.controller';

describe('StudioStationsController', () => {
  let controller: StudioStationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioStationsController],
    }).compile();

    controller = module.get<StudioStationsController>(StudioStationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
