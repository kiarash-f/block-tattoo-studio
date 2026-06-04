import { BookingStatus } from '@prisma/client';
export declare class ListBookingsQueryDto {
    status?: BookingStatus;
    q?: string;
    page: number;
    limit: number;
}
