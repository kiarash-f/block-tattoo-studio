import { CanActivate, ExecutionContext } from '@nestjs/common';
import { BookingLinksService } from '../booking-links.service';
export declare class PublicTokenGuard implements CanActivate {
    private readonly bookingLinks;
    constructor(bookingLinks: BookingLinksService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
