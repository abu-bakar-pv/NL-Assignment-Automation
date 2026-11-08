export interface BookingDates {
  checkin: string;
  checkout: string;
}

export interface Booking {
  firstname: string;
  lastname: string;
  totalprice: number;
  depositpaid: boolean;
  bookingdates: BookingDates;
  additionalneeds?: string | null;
}

export interface CreatedBooking {
  bookingid: number;
  booking: Booking;
}

export interface BookingRef {
  bookingid: number;
}
