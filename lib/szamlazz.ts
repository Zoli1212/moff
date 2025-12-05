export enum Currency {
  HUF = "HUF",
  EUR = "EUR",
  USD = "USD",
}

export enum Language {
  HU = "hu",
  EN = "en",
}

export enum PaymentMethod {
  Transfer = "átutalás",
  Cash = "készpénz",
  Card = "bankkártya",
}

export interface InvoiceData {
  eInvoice: boolean;
  currency: Currency;
  sendEmail: boolean;
  language: Language;
  paymentMethod: PaymentMethod;
  settled: boolean;
  comment?: string;
  customer: {
    name: string;
    email: string;
    address: string;
    city: string;
    zip: string;
    country?: string;
    taxNumber?: string;
  };
  seller?: {
    bank?: string;
    bankAccount?: string;
  };
}

export interface InvoiceItem {
  name: string;
  amount: number;
  amountName: string;
  netUnitPrice: number;
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
  vatRate: number | string;
  comment?: string;
}

export class Client {
  private apiEndpoint = "https://www.szamlazz.hu/szamla/";

  constructor(private config: { key: string }) {}

  async generateInvoice(invoiceData: InvoiceData, items: InvoiceItem[]) {
    const currentDate = new Date();
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla">
  <beallitasok>
    <szamlaagentkulcs>${this.config.key}</szamlaagentkulcs>
    <eszamla>true</eszamla>
    <szamlaLetoltes>true</szamlaLetoltes>
    <valaszVerzio>2</valaszVerzio>
  </beallitasok>
  <fejlec>
    <keltDatum>${currentDate.toISOString().split("T")[0]}</keltDatum>
    <teljesitesDatum>${currentDate.toISOString().split("T")[0]}</teljesitesDatum>
    <fizetesiHataridoDatum>${new Date(currentDate.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}</fizetesiHataridoDatum>
    <fizmod>${invoiceData.paymentMethod}</fizmod>
    <penznem>${invoiceData.currency}</penznem>
    <szamlaNyelve>${invoiceData.language}</szamlaNyelve>
    <megjegyzes>${invoiceData.comment || ""}</megjegyzes>
    <arfolyamBank>MNB</arfolyamBank>
  </fejlec>
  <elado>
    <bank>${invoiceData.seller?.bank || ""}</bank>
    <bankszamlaszam>${invoiceData.seller?.bankAccount || ""}</bankszamlaszam>
  </elado>
  <vevo>
    <nev>${invoiceData.customer.name}</nev>
    <irsz>${invoiceData.customer.zip}</irsz>
    <telepules>${invoiceData.customer.city}</telepules>
    <cim>${invoiceData.customer.address}</cim>
    <email>${invoiceData.customer.email}</email>
    <adoszam>${invoiceData.customer.taxNumber || ""}</adoszam>
  </vevo>
  <tetelek>
    ${items
      .map(
        (item) => `
    <tetel>
      <megnevezes>${item.name}</megnevezes>
      <mennyiseg>${item.amount}</mennyiseg>
      <mennyisegiEgyseg>${item.amountName}</mennyisegiEgyseg>
      <nettoEgysegar>${item.netUnitPrice}</nettoEgysegar>
      <afakulcs>${item.vatRate}</afakulcs>
      <nettoErtek>${item.netAmount}</nettoErtek>
      <afaErtek>${item.taxAmount}</afaErtek>
      <bruttoErtek>${item.grossAmount}</bruttoErtek>
      ${item.comment ? `<megjegyzes>${item.comment}</megjegyzes>` : ""}
    </tetel>`
      )
      .join("")}
  </tetelek>
</xmlszamla>`;

    const formData = new FormData();
    const blob = new Blob([xmlContent], { type: "application/xml" });
    formData.append("action-xmlagentxmlfile", blob, "szamla.xml");

    const response = await fetch(this.apiEndpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Számlázz.hu API error: ${response.status} ${response.statusText}\nResponse: ${responseText}`
      );
    }

    const responseText = await response.text();

    console.log(
      "📥 [szamlazz.hu] Raw XML response (first 1000 chars):",
      responseText.substring(0, 1000)
    );

    // Use regex to parse the XML response as DOMParser is not available in Node.js
    const invoiceNumberMatch = responseText.match(
      /<szamlaszam>(.+?)<\/szamlaszam>/
    );
    const pdfDataMatch = responseText.match(/<pdf>(.+?)<\/pdf>/);

    console.log(
      "🔍 [szamlazz.hu] Invoice number match:",
      invoiceNumberMatch?.[1]
    );
    console.log("🔍 [szamlazz.hu] PDF data match found:", !!pdfDataMatch);

    // The PDF content is Base64 encoded, so we need to decode it.
    const pdfUrl = pdfDataMatch
      ? Buffer.from(pdfDataMatch[1], "base64").toString("utf-8")
      : undefined;

    console.log("🔍 [szamlazz.hu] Decoded PDF URL:", pdfUrl);

    return {
      invoice: {
        number: invoiceNumberMatch ? invoiceNumberMatch[1] : undefined,
        pdfUrl: pdfUrl,
      },
    };
  }
}
