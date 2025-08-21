import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable"; // csak ha tényleg használod
import type { WorkDiaryWithItem } from "@/actions/get-workdiariesbyworkid-actions";

export async function generateDiaryPdf(diary: WorkDiaryWithItem): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const FONT = "helvetica"; // használható még: "times", "courier"
  type ImageFormat = "JPEG" | "PNG";
  type WithMain = { mainDiaryNumber?: string | number };
  type WithSub = { subDiaryNumber?: string | number };
  type WithDiaryType = { diaryType?: string };
  type WithStatus = { status?: string };
  type Responsible = { name?: string | null; role?: string | null };
  type Attachment = { filename?: string | null; name?: string | null };
  type WorkerLite = { name?: string | null; role?: string | null; profession?: string | null };

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
  {
    const main = (diary as Partial<WithMain>).mainDiaryNumber;
    doc.text(`Főnapló száma: ${main ?? "-"}`, 14, y);
  }
  y += 5;
  {
    const sub = (diary as Partial<WithSub>).subDiaryNumber;
    doc.text(`Alnapló száma: ${sub ?? "-"}`, 14, y);
  }
  y += 5;
  {
    const dType = (diary as Partial<WithDiaryType>).diaryType;
    doc.text(`Napló típusa: ${dType ?? "Vállalkozói napló"}`, 14, y);
  }
  y += 5;
  {
    const status = (diary as Partial<WithStatus>).status;
    doc.text(`Napló státusza: ${status ?? "-"}`, 14, y);
  }
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
  const responsibles = (diary as { responsibles?: Responsible[] }).responsibles;
  if (Array.isArray(responsibles) && responsibles.length > 0) {
    responsibles.forEach((p: Responsible) => {
      const nm = p?.name && p.name !== "" ? String(p.name) : "-";
      const rl = p?.role && p.role !== "" ? String(p.role) : "-";
      doc.text(`- ${nm} (${rl})`, 16, y);
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
  const workersArr = (diary.workItem as { workers?: WorkerLite[] } | undefined)?.workers;
  if (Array.isArray(workersArr) && workersArr.length > 0) {
    workersArr.forEach((w) => {
      const role = w?.role && w.role !== ""
        ? String(w.role)
        : w?.profession && w.profession !== ""
        ? String(w.profession)
        : "-";
      const nm = w?.name && w.name !== "" ? String(w.name) : "-";
      doc.text(`- ${nm} (${role})`, 16, y);
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
  const attachments = (diary as { attachments?: Attachment[] }).attachments;
  if (Array.isArray(attachments) && attachments.length > 0) {
    attachments.forEach((a) => {
      const nm = a?.filename && a.filename !== ""
        ? String(a.filename)
        : a?.name && a.name !== ""
        ? String(a.name)
        : "-";
      doc.text(`- ${nm}`, 16, y);
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
          reader.onloadend = () => {
            if (typeof reader.result === "string") resolve(reader.result);
            else reject(new Error("Invalid image data"));
          };
          reader.onerror = () => reject(new Error("Image read error"));
          reader.readAsDataURL(blob);
        });
        const format: ImageFormat = base64.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(base64, format, 14 + ((i % 3) * 60), y + Math.floor(i / 3) * 45, 50, 40);
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
