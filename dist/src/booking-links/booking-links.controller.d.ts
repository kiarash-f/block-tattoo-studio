import { BookingLinksService } from './booking-links.service';
import { CreateBookingLinkDto } from './dto/create-booking-link.dto';
export declare class BookingLinksController {
    private readonly tokens;
    constructor(tokens: BookingLinksService);
    createBookingLink(bookingRequestId: string, dto: CreateBookingLinkDto, req: any): Promise<{
        url: string;
        tokenId: string;
        expiresAt: Date;
        scopes: ("INTAKE_CONTINUE" | "UPLOAD" | "VIEW")[];
        bookingRequestId: string;
    }>;
}
