export type BookingLinkScope = 'INTAKE_CONTINUE' | 'UPLOAD' | 'VIEW';

export type PublicTokenContext = {
  tokenId: string;
  bookingRequestId: string;
  scopes: BookingLinkScope[];
};

declare module 'express-serve-static-core' {
  interface Request {
    publicToken?: PublicTokenContext;
  }
}
