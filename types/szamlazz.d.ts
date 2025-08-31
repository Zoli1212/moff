declare module 'szamlazz.js' {
  export class Client {
    constructor(options: { authToken: string });
    issueInvoice(invoice: Invoice): Promise<{ invoiceId: string; pdfUrl: string; grossTotal: number }>;
  }

  export class Seller {
    constructor(options: {
      bank?: string;
      bankAccountNumber?: string;
      email?: string;
      replyTo?: string;
    });
  }

  export class Buyer {
    constructor(options: {
      name: string;
      zip: string;
      city: string;
      address: string;
      email: string;
      taxNumber?: string;
    });
  }

  export class Item {
    constructor(options: {
      label: string;
      quantity: number;
      unit: string;
      vat: number | string; // Can be a number (percentage) or a special string like 'AAM'
      netUnitPrice: number;
    });
  }

  export class Invoice {
    constructor(options: {
      paymentMethod: 'bank-transfer' | 'cash' | 'credit-card' | 'voucher';
      currency: 'HUF' | 'EUR' | 'CHF' | 'USD' | 'GBP';
      language: 'hu' | 'en' | 'de' | 'it' | 'ro' | 'sk' | 'fr';
      seller: Seller;
      buyer: Buyer;
      items: Item[];
      paid?: boolean;
    });
  }
}
