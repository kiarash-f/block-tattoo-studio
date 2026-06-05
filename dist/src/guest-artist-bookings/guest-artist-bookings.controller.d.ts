import { GuestArtistBookingsService } from './guest-artist-bookings.service';
import { CreateGuestBookingDto } from './dto/create-guest-booking.dto';
import { UpdateGuestBookingDto } from './dto/update-guest-booking.dto';
import { ListGuestBookingsQueryDto } from './dto/list-guest-bookings.query.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
export declare class GuestBookingsPublicController {
    private readonly service;
    constructor(service: GuestArtistBookingsService);
    getAvailability(query: AvailabilityQueryDto): Promise<{
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
}
export declare class GuestBookingsAdminController {
    private readonly service;
    constructor(service: GuestArtistBookingsService);
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
