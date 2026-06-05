import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { StationConfigService } from '../station-config/station-config.service';
import { CreateGuestBookingDto } from './dto/create-guest-booking.dto';
import { UpdateGuestBookingDto } from './dto/update-guest-booking.dto';
import { ListGuestBookingsQueryDto } from './dto/list-guest-bookings.query.dto';
export declare class GuestArtistBookingsService {
    private readonly prisma;
    private readonly stripe;
    private readonly configSvc;
    private readonly logger;
    constructor(prisma: PrismaService, stripe: StripeService, configSvc: StationConfigService);
    getAvailability(startDateStr: string, endDateStr: string): Promise<{
        startDate: string;
        endDate: string;
        pricePerDay: number;
        monthlyDiscountPercent: number;
        days: {
            date: string;
            totalTables: number;
            bookedTables: number;
            availableTables: number;
        }[];
    }>;
    create(dto: CreateGuestBookingDto): Promise<{
        booking: {
            id: string;
            email: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            startDate: Date;
            endDate: Date;
            numberOfTables: number;
            totalPrice: number;
            status: import("@prisma/client").$Enums.GuestBookingStatus;
            phone: string;
            acknowledgment: boolean;
            discountApplied: number;
            stripeSessionId: string | null;
            stripePaymentUrl: string | null;
        };
        stripePaymentUrl: string;
    }>;
    list(query: ListGuestBookingsQueryDto): Promise<{
        total: number;
        items: {
            id: string;
            email: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            startDate: Date;
            endDate: Date;
            numberOfTables: number;
            totalPrice: number;
            status: import("@prisma/client").$Enums.GuestBookingStatus;
            phone: string;
            acknowledgment: boolean;
            discountApplied: number;
            stripeSessionId: string | null;
            stripePaymentUrl: string | null;
        }[];
    }>;
    detail(id: string): Promise<{
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        startDate: Date;
        endDate: Date;
        numberOfTables: number;
        totalPrice: number;
        status: import("@prisma/client").$Enums.GuestBookingStatus;
        phone: string;
        acknowledgment: boolean;
        discountApplied: number;
        stripeSessionId: string | null;
        stripePaymentUrl: string | null;
    }>;
    update(id: string, dto: UpdateGuestBookingDto): Promise<{
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        startDate: Date;
        endDate: Date;
        numberOfTables: number;
        totalPrice: number;
        status: import("@prisma/client").$Enums.GuestBookingStatus;
        phone: string;
        acknowledgment: boolean;
        discountApplied: number;
        stripeSessionId: string | null;
        stripePaymentUrl: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        startDate: Date;
        endDate: Date;
        numberOfTables: number;
        totalPrice: number;
        status: import("@prisma/client").$Enums.GuestBookingStatus;
        phone: string;
        acknowledgment: boolean;
        discountApplied: number;
        stripeSessionId: string | null;
        stripePaymentUrl: string | null;
    }>;
}
