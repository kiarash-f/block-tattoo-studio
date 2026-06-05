import { PrismaService } from '../prisma/prisma.service';
export declare class GuestBookingExpiryService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    expireStaleBookings(): Promise<void>;
}
