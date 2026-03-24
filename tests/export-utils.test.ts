/**
 * Unit Tests: export-utils.ts
 * Tests for parseEstimateData (indirectly), exportToExcel, exportToPDF
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock browser-only modules before importing ---
const mockAoaToSheet = vi.fn(() => ({ "!cols": undefined } as any));
const mockBookNew = vi.fn(() => ({} as any));
const mockBookAppendSheet = vi.fn();
const mockWrite = vi.fn(() => new ArrayBuffer(8));
const mockSaveAs = vi.fn();

vi.mock("xlsx", () => ({
  utils: {
    aoa_to_sheet: mockAoaToSheet,
    book_new: mockBookNew,
    book_append_sheet: mockBookAppendSheet,
  },
  write: mockWrite,
}));

vi.mock("file-saver", () => ({
  saveAs: mockSaveAs,
}));

// Mock window.open for exportToPDF
const mockWindowWrite = vi.fn();
const mockWindowClose = vi.fn();
const mockWindowFocus = vi.fn();
const mockWindowPrint = vi.fn();
const mockOpenWindow = vi.fn(() => ({
  document: { write: mockWindowWrite, close: mockWindowClose },
  focus: mockWindowFocus,
  print: mockWindowPrint,
}));

vi.stubGlobal("window", {
  open: mockOpenWindow,
});

import { exportToPDF, exportToExcel } from "@/app/(client)/quote-request/[sessionId]/export-utils";

// -------------------------------------------------------
// Test fixtures
// -------------------------------------------------------
const FULL_ESTIMATE = `**Projekt összefoglaló:** 50m² lakás festése Budapesten
**Helyszín:** Budapest, XIII. kerület
**Munkanemek és becsült árak:**
- Festési alapozás: 50 m² × 1 500 Ft = 75 000 Ft
- Beltéri festés: 50 m² × 2 000 Ft = 100 000 Ft
- Mennyezet festés: 30 m² × 1 800 Ft = 54 000 Ft
**Becsült nettó összeg:** 229 000 Ft
**Becsült bruttó összeg (27% ÁFA):** 290 830 Ft
*Ez egy tájékoztató jellegű becslés.*`;

const MINIMAL_ESTIMATE = `Projekt összefoglaló: Kis munka
Becsült nettó összeg: 10 000 Ft
Becsült bruttó összeg (27% ÁFA): 12 700 Ft`;

const NO_LOCATION_ESTIMATE = `Projekt összefoglaló: Festés helyszín nélkül
- Festés: 20 m² × 2 000 Ft = 40 000 Ft
Becsült nettó összeg: 40 000 Ft
Becsült bruttó összeg (27% ÁFA): 50 800 Ft`;

const BULLET_DOT_ESTIMATE = `Projekt összefoglaló: Tesztelés
Helyszín: Győr
• Burkolás: 15 m² × 5 000 Ft = 75 000 Ft
Becsült nettó összeg: 75 000 Ft
Becsült bruttó összeg (27% ÁFA): 95 250 Ft`;

const EMPTY_ESTIMATE = ``;

// -------------------------------------------------------
// exportToExcel – tesztek (parseEstimateData is tested indirectly)
// -------------------------------------------------------
describe("exportToExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAoaToSheet.mockReturnValue({ "!cols": undefined } as any);
  });

  it("meghívja a saveAs-t xlsx blob-bal és helyes fájlnévvel", () => {
    exportToExcel(FULL_ESTIMATE);

    expect(mockSaveAs).toHaveBeenCalledOnce();
    const [blob, filename] = mockSaveAs.mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(filename).toMatch(/^offerflow-ajanlat-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it("létrehozza a workbook-ot és 'Ajánlat' lapra írja", () => {
    exportToExcel(FULL_ESTIMATE);

    expect(mockBookNew).toHaveBeenCalledOnce();
    expect(mockBookAppendSheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "Ajánlat"
    );
  });

  it("beállítja az oszlopszélességeket", () => {
    const mockSheet: any = { "!cols": undefined };
    mockAoaToSheet.mockReturnValue(mockSheet);

    exportToExcel(FULL_ESTIMATE);

    expect(mockSheet["!cols"]).toEqual([
      { wch: 45 },
      { wch: 15 },
      { wch: 30 },
      { wch: 20 },
    ]);
  });

  it("tartalmazza a fejléc sort (BECSÜLT AJÁNLAT)", () => {
    exportToExcel(FULL_ESTIMATE);

    const rows: any[][] = mockAoaToSheet.mock.calls[0][0];
    expect(rows[0]).toEqual(["BECSÜLT AJÁNLAT – OFFERFLOW"]);
  });

  it("tartalmazza a dátum sort", () => {
    exportToExcel(FULL_ESTIMATE);

    const rows: any[][] = mockAoaToSheet.mock.calls[0][0];
    expect(rows[1][0]).toMatch(/^Kelt:/);
  });

  it("tartalmazza a tájékoztató jogi szöveget", () => {
    exportToExcel(FULL_ESTIMATE);

    const rows: any[][] = mockAoaToSheet.mock.calls[0][0];
    const flatRows = rows.map((r) => r.join(" "));
    expect(flatRows.some((r) => r.includes("tájékoztató jellegű becslés"))).toBe(true);
  });

  // --- parseEstimateData viselkedés exportToExcel-en keresztül ---

  it("kinyeri a projekt összefoglalót markdown nélkül", () => {
    exportToExcel(FULL_ESTIMATE);

    const rows: any[][] = mockAoaToSheet.mock.calls[0][0];
    const summaryRow = rows.find((r) => r[0] === "Projekt összefoglaló:");
    expect(summaryRow).toBeDefined();
    expect(summaryRow![1]).toBe("50m² lakás festése Budapesten");
  });

  it("kinyeri a helyszínt", () => {
    exportToExcel(FULL_ESTIMATE);

    const rows: any[][] = mockAoaToSheet.mock.calls[0][0];
    const locationRow = rows.find((r) => r[0] === "Helyszín:");
    expect(locationRow).toBeDefined();
    expect(locationRow![1]).toBe("Budapest, XIII. kerület");
  });

  it("kinyeri a tételeket 'leírás: mennyiség × egységár = összeg' formátumban", () => {
    exportToExcel(FULL_ESTIMATE);

    const rows: any[][] = mockAoaToSheet.mock.calls[0][0];
    expect(rows).toContainEqual(["Festési alapozás", "50 m²", "1 500 Ft", "75 000 Ft"]);
    expect(rows).toContainEqual(["Beltéri festés", "50 m²", "2 000 Ft", "100 000 Ft"]);
    expect(rows).toContainEqual(["Mennyezet festés", "30 m²", "1 800 Ft", "54 000 Ft"]);
  });

  it("kinyeri a nettó összeget", () => {
    exportToExcel(FULL_ESTIMATE);

    const rows: any[][] = mockAoaToSheet.mock.calls[0][0];
    const netRow = rows.find((r) => r[2] === "Becsült nettó összeg:");
    expect(netRow).toBeDefined();
    expect(netRow![3]).toBe("229 000 Ft");
  });

  it("kinyeri a bruttó összeget", () => {
    exportToExcel(FULL_ESTIMATE);

    const rows: any[][] = mockAoaToSheet.mock.calls[0][0];
    const grossRow = rows.find((r) => r[2] === "Becsült bruttó összeg (27% ÁFA):");
    expect(grossRow).toBeDefined();
    expect(grossRow![3]).toBe("290 830 Ft");
  });

  it("nem dob hibát ha nincs helyszín", () => {
    expect(() => exportToExcel(NO_LOCATION_ESTIMATE)).not.toThrow();

    const rows: any[][] = mockAoaToSheet.mock.calls[0][0];
    const locationRow = rows.find((r) => r[0] === "Helyszín:");
    expect(locationRow).toBeUndefined();
  });

  it("nem dob hibát ha nincsenek tételek", () => {
    expect(() => exportToExcel(MINIMAL_ESTIMATE)).not.toThrow();

    const rows: any[][] = mockAoaToSheet.mock.calls[0][0];
    const headerRow = rows.find((r) => r[0] === "Munkanem");
    expect(headerRow).toBeDefined();
  });

  it("• bullet pointokat is felismeri tételként", () => {
    exportToExcel(BULLET_DOT_ESTIMATE);

    const rows: any[][] = mockAoaToSheet.mock.calls[0][0];
    expect(rows).toContainEqual(["Burkolás", "15 m²", "5 000 Ft", "75 000 Ft"]);
  });

  it("nem dob hibát üres bemeneten", () => {
    expect(() => exportToExcel(EMPTY_ESTIMATE)).not.toThrow();
  });

  it("eltávolítja a markdown ** jelölőket a projekt összefoglalóból", () => {
    exportToExcel(FULL_ESTIMATE);

    const rows: any[][] = mockAoaToSheet.mock.calls[0][0];
    const summaryRow = rows.find((r) => r[0] === "Projekt összefoglaló:");
    expect(summaryRow![1]).not.toContain("**");
  });

  it("tételeket description=-vel jelöli ha nem illeszkedik a formátumra", () => {
    const nonStandardEstimate = `Projekt összefoglaló: Teszt
Helyszín: Budapest
- Elbontás (ár nélkül)
Becsült nettó összeg: 0 Ft
Becsült bruttó összeg (27% ÁFA): 0 Ft`;

    exportToExcel(nonStandardEstimate);

    const rows: any[][] = mockAoaToSheet.mock.calls[0][0];
    // Non-parseable item should still appear with "-" placeholders
    expect(rows).toContainEqual(["Elbontás (ár nélkül)", "-", "-", "-"]);
  });
});

// -------------------------------------------------------
// exportToPDF – tesztek
// -------------------------------------------------------
describe("exportToPDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenWindow.mockReturnValue({
      document: { write: mockWindowWrite, close: mockWindowClose },
      focus: mockWindowFocus,
      print: mockWindowPrint,
    });
  });

  it("megnyit egy új ablakot", () => {
    exportToPDF(FULL_ESTIMATE);
    expect(mockOpenWindow).toHaveBeenCalledWith("", "_blank");
  });

  it("HTML-t ír az új ablakba", () => {
    exportToPDF(FULL_ESTIMATE);
    expect(mockWindowWrite).toHaveBeenCalledOnce();
    const html: string = mockWindowWrite.mock.calls[0][0];
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Offerflow");
  });

  it("a HTML tartalmazza a projekt összefoglalót", () => {
    exportToPDF(FULL_ESTIMATE);
    const html: string = mockWindowWrite.mock.calls[0][0];
    expect(html).toContain("50m² lakás festése Budapesten");
  });

  it("a HTML tartalmazza a helyszínt", () => {
    exportToPDF(FULL_ESTIMATE);
    const html: string = mockWindowWrite.mock.calls[0][0];
    expect(html).toContain("Budapest, XIII. kerület");
  });

  it("a HTML tartalmazza az összes tételt", () => {
    exportToPDF(FULL_ESTIMATE);
    const html: string = mockWindowWrite.mock.calls[0][0];
    expect(html).toContain("Festési alapozás");
    expect(html).toContain("Beltéri festés");
    expect(html).toContain("Mennyezet festés");
  });

  it("a HTML tartalmazza a nettó és bruttó összeget", () => {
    exportToPDF(FULL_ESTIMATE);
    const html: string = mockWindowWrite.mock.calls[0][0];
    expect(html).toContain("229 000 Ft");
    expect(html).toContain("290 830 Ft");
  });

  it("a HTML tartalmazza a 'BECSÜLT AJÁNLAT' feliratot", () => {
    exportToPDF(FULL_ESTIMATE);
    const html: string = mockWindowWrite.mock.calls[0][0];
    expect(html).toContain("BECSÜLT AJÁNLAT");
  });

  it("a HTML tartalmazza a tájékoztató szöveget", () => {
    exportToPDF(FULL_ESTIMATE);
    const html: string = mockWindowWrite.mock.calls[0][0];
    expect(html).toContain("tájékoztató jellegű becslés");
  });

  it("lezárja és fókuszba hozza az ablakot", () => {
    exportToPDF(FULL_ESTIMATE);
    expect(mockWindowClose).toHaveBeenCalledOnce();
    expect(mockWindowFocus).toHaveBeenCalledOnce();
  });

  it("nem dob hibát ha window.open null-t ad vissza", () => {
    mockOpenWindow.mockReturnValue(null);
    expect(() => exportToPDF(FULL_ESTIMATE)).not.toThrow();
  });

  it("nem dob hibát üres bemeneten", () => {
    expect(() => exportToPDF(EMPTY_ESTIMATE)).not.toThrow();
  });

  it("a HTML tartalmaz print stílust", () => {
    exportToPDF(FULL_ESTIMATE);
    const html: string = mockWindowWrite.mock.calls[0][0];
    expect(html).toContain("@media print");
  });
});
