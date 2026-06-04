import { GuestBookingStatus } from '@prisma/client';
export declare class UpdateGuestBookingDto {
    name?: string;
    phone?: string;
    email?: string;
    startDate?: string;
    endDate?: string;
    numberOfTables?: number;
    status?: GuestBookingStatus;
}
