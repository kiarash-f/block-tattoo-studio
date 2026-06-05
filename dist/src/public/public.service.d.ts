import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { EmailService } from '../email/email.service';
import { CreateBookingIntakeDto } from './dto/booking-intake.dto';
export declare class PublicService {
    private readonly prisma;
    private readonly media;
    private readonly email;
    constructor(prisma: PrismaService, media: MediaService, email: EmailService);
    createBookingIntake(dto: CreateBookingIntakeDto, files: Express.Multer.File[]): Promise<{
        bookingRequestId: string;
        status: import("@prisma/client").$Enums.BookingStatus;
        createdAt: Date;
    }>;
    getMonthAvailability(month: string): Promise<{
        month: string;
        days: {
            date: string;
            status: "closed" | "open" | "busy";
            count: number;
        }[];
    }>;
}
