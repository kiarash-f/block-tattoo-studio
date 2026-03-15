import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AssignConsultSlotDto {
  @ApiProperty({ description: 'ConsultSlot id to assign to the booking' })
  @IsString()
  @IsNotEmpty()
  consultSlotId!: string;
}
