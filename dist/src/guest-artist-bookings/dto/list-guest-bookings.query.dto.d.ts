import { GuestBookingStatus } from '@prisma/client';
export declare class ListGuestBookingsQueryDto {
    status?: GuestBookingStatus;
    from?: string;
    to?: string;
}
