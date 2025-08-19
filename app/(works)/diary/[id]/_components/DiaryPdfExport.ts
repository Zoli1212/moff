import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable"; // csak ha tényleg használod
import type { WorkDiaryWithItem } from "@/actions/get-workdiariesbyworkid-actions";

export async function generateDiaryPdf(diary: WorkDiaryWithItem): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const FONT = "helvetica"; // használható még: "times", "courier"

  // Alap font
  doc.setFont(FONT, "normal");

  // Header
  doc.setFontSize(18);
  doc.text("Építési napló bejegyzés (vállalkozó)", 14, 18);
  doc.setFontSize(10);
  doc.text(
    "A 191/2009. (IX. 15.) Korm. rendelet szerinti szabályos elektronikus építési napló kivonat",
    14,
    25
  );

  let y = 32;
  doc.setFontSize(12);
  doc.setFont(FONT, "bold");
  doc.text("Projekt adatok", 14, y);
  doc.setFont(FONT, "normal");
  doc.setFontSize(10);

  y += 6;
  doc.text(`Projekt azonosító: ${diary.workId ?? "-"}`, 14, y);
  y += 5;
  doc.text(
    `Projekt neve: ${
      diary.workItem &&
      "projectName" in diary.workItem &&
      typeof diary.workItem.projectName === "string" &&
      diary.workItem.projectName
        ? diary.workItem.projectName
        : "-"
    }`,
    14,
    y
  );
  y += 5;
  doc.text(
    `Főnapló száma: ${
      "mainDiaryNumber" in diary && (diary as any).mainDiaryNumber
        ? (diary as any).mainDiaryNumber
        : "-"
    }`,
    14,
    y
  );
  y += 5;
  doc.text(
    `Alnapló száma: ${
      "subDiaryNumber" in diary && (diary as any).subDiaryNumber
        ? (diary as any).subDiaryNumber
        : "-"
    }`,
    14,
    y
  );
  y += 5;
  doc.text(
    `Napló típusa: ${
      "diaryType" in diary && (diary as any).diaryType
        ? (diary as any).diaryType
        : "Vállalkozói napló"
    }`,
    14,
    y
  );
  y += 5;
  doc.text(
    `Napló státusza: ${
      "status" in diary && (diary as any).status ? (diary as any).status : "-"
    }`,
    14,
    y
  );
  y += 5;
  doc.text(
    `Dátum: ${diary.date ? new Date(diary.date).toLocaleDateString("hu-HU") : "-"}`,
    14,
    y
  );
  y += 7;

  // Felelősök
  doc.setFont(FONT, "bold");
  doc.text("Felelősök:", 14, y);
  doc.setFont(FONT, "normal");
  y += 5;
  if (
    "responsibles" in diary &&
    Array.isArray((diary as any).responsibles) &&
    (diary as any).responsibles.length > 0
  ) {
    (diary as any).responsibles.forEach((p: any) => {
      doc.text(
        `- ${p.name && p.name !== "" ? p.name : "-"} (${
          p.role && p.role !== "" ? p.role : "-"
        })`,
        16,
        y
      );
      y += 5;
    });
  } else {
    doc.text("-", 16, y);
    y += 5;
  }

  // Résztvevők
  doc.setFont(FONT, "bold");
  doc.text("Résztvevők:", 14, y);
  doc.setFont(FONT, "normal");
  y += 5;
  if (
    diary.workItem &&
    "workers" in diary.workItem &&
    Array.isArray((diary.workItem as any).workers) &&
    (diary.workItem as any).workers.length > 0
  ) {
    (diary.workItem as any).workers.forEach((w: any) => {
      const role =
        w.role && w.role !== "" ? w.role : w.profession && w.profession !== "" ? w.profession : "-";
      doc.text(`- ${w.name && w.name !== "" ? w.name : "-"} (${role})`, 16, y);
      y += 5;
    });
  } else {
    doc.text("-", 16, y);
    y += 5;
  }

  // Munkafázis
  doc.setFont(FONT, "bold");
  doc.text("Munkafázis:", 14, y);
  doc.setFont(FONT, "normal");
  y += 5;
  doc.text(String(diary.workItem?.name ?? "-"), 16, y);
  y += 7;

  // Leírás
  doc.setFont(FONT, "bold");
  doc.text("Leírás:", 14, y);
  doc.setFont(FONT, "normal");
  y += 6;
  const desc = diary.description ?? "-";
  doc.text(desc, 16, y, { maxWidth: 180 });
  y += Math.max(12, doc.splitTextToSize(desc, 180).length * 6);

  // Időjárás, hőmérséklet, előrehaladás
  doc.setFont(FONT, "bold");
  doc.text("Időjárás:", 14, y);
  doc.setFont(FONT, "normal");
  doc.text(diary.weather ?? "-", 40, y);
  y += 6;

  doc.setFont(FONT, "bold");
  doc.text("Hőmérséklet:", 14, y);
  doc.setFont(FONT, "normal");
  doc.text(diary.temperature != null ? diary.temperature + " °C" : "-", 40, y);
  y += 6;

  doc.setFont(FONT, "bold");
  doc.text("Előrehaladás:", 14, y);
  doc.setFont(FONT, "normal");
  doc.text(diary.progress != null ? diary.progress + "%" : "-", 40, y);
  y += 7;

  // Problémák, jegyzetek
  doc.setFont(FONT, "bold");
  doc.text("Problémák:", 14, y);
  doc.setFont(FONT, "normal");
  doc.text(diary.issues ?? "-", 40, y);
  y += 6;

  doc.setFont(FONT, "bold");
  doc.text("Jegyzetek:", 14, y);
  doc.setFont(FONT, "normal");
  doc.text(diary.notes && diary.notes !== "" ? diary.notes : "-", 40, y);
  y += 7;

  // Csatolmányok
  doc.setFont(FONT, "bold");
  doc.text("Csatolmányok:", 14, y);
  doc.setFont(FONT, "normal");
  y += 5;
  if (
    "attachments" in diary &&
    Array.isArray((diary as any).attachments) &&
    (diary as any).attachments.length > 0
  ) {
    (diary as any).attachments.forEach((a: any) => {
      const name =
        a.filename && a.filename !== "" ? a.filename : a.name && a.name !== "" ? a.name : "-";
      doc.text(`- ${name}`, 16, y);
      y += 5;
    });
  } else {
    doc.text("-", 16, y);
    y += 5;
  }

  // Képek
  if (diary.images && diary.images.length > 0) {
    doc.setFont(FONT, "bold");
    doc.text("Képek:", 14, y);
    doc.setFont(FONT, "normal");
    y += 6;

    for (let i = 0; i < diary.images.length; i++) {
      const url = diary.images[i];
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const reader = new FileReader();
        const base64: string = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const format = base64.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(base64, format as any, 14 + ((i % 3) * 60), y + Math.floor(i / 3) * 45, 50, 40);
      } catch {
        // kép kihagyása hibánál
      }
    }
    y += Math.ceil(diary.images.length / 3) * 45 + 5;
  }

  // Lábléc – aláírás, dátum
  y = Math.max(y, 245);
  doc.setFont(FONT, "normal");
  doc.line(14, y, 90, y); // aláírás vonal
  doc.text("Aláírás", 14, y + 5);
  doc.line(110, y, 196, y); // dátum vonal
  doc.text("Dátum", 110, y + 5);
  y += 14;
  doc.setFontSize(8);
  doc.text(
    "Ez a dokumentum a magyar jogszabályoknak megfelelően készült elektronikus építési napló kivonat. A napló tartalma hiteles, minden módosítás naplózásra kerül.",
    14,
    y,
    { maxWidth: 180 }
  );
  y += 8;
  doc.text("Készült: " + new Date().toLocaleString("hu-HU"), 14, y);

  // Ne mentsünk kétszer; a hívó fél dönthet a letöltésről.
  // doc.save("epitesi-naplo.pdf");

  // Blob visszaadása
  return doc.output("blob");
}
