import { BookingStatus, CancelReason } from '@prisma/client';
export declare class UpdateBookingStatusDto {
    status: BookingStatus;
    adminNotes?: string;
    internalStatusNote?: string;
    cancelReason?: CancelReason;
}
