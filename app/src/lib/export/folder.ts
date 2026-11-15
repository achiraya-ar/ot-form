import type { AppSettings, DocumentSet } from "../../types";
import { saveFilesToFolder } from "./save";
import { buildPdf, safeFileStem } from "./print";
import { getSetExchanges } from "../selectors";
import {
  buildExchangeFormsDocx,
  buildMemoDocx,
  buildOrderDocx,
} from "./word";
import {
  buildAttendanceXlsx,
  buildPaymentXlsx,
  buildScheduleXlsx,
} from "./excel";

export async function exportAllFolder(
  set: DocumentSet,
  settings: AppSettings,
): Promise<string | null> {
  const files = await Promise.all([
    buildOrderDocx(set, settings),
    buildMemoDocx(set, settings),
    buildScheduleXlsx(set, settings),
    buildAttendanceXlsx(set, settings),
    buildPaymentXlsx(set, settings),
  ]);

  if (getSetExchanges(set).length > 0) {
    files.push(await buildExchangeFormsDocx(set, settings));
  }

  return saveFilesToFolder(files, safeFileStem(set.title));
}

export interface PdfContainers {
  order: HTMLElement | null;
  memo: HTMLElement | null;
  schedule: HTMLElement | null;
  attendance: HTMLElement | null;
  payment: HTMLElement | null;
  exchange: HTMLElement | null;
}

export async function exportAllPdf(
  set: DocumentSet,
  containers: PdfContainers,
): Promise<string | null> {
  const sources: Array<{
    container: HTMLElement | null;
    orientation: "portrait" | "landscape";
    filename: string;
  }> = [
    {
      container: containers.order,
      orientation: "portrait",
      filename: "1 คำสั่งแต่งตั้งเจ้าหน้าที่ปฏิบัติงานนอกเวลา.pdf",
    },
    {
      container: containers.memo,
      orientation: "portrait",
      filename: "2 บันทึกขออนุมัติขึ้นปฏิบัติงานนอกเวลาราชการ.pdf",
    },
    {
      container: containers.schedule,
      orientation: "landscape",
      filename: "3 ตารางการปฏิบัติงานนอกเวลาราชการ.pdf",
    },
    {
      container: containers.attendance,
      orientation: "portrait",
      filename: "4 บัญชีลงเวลาปฏิบัติงานนอกเวลาราชการ.pdf",
    },
    {
      container: containers.payment,
      orientation: "landscape",
      filename: "5 หลักฐานการจ่ายเงินค่าตอบแทน.pdf",
    },
  ];

  if (getSetExchanges(set).length > 0) {
    sources.push({
      container: containers.exchange,
      orientation: "portrait",
      filename: "6 ใบขอแลกเปลี่ยนเวร.pdf",
    });
  }

  const files: Array<{ blob: Blob; filename: string }> = [];
  for (const source of sources) {
    if (!source.container) continue;
    const blob = await buildPdf(source.container, source.orientation);
    if (blob) files.push({ blob, filename: source.filename });
  }

  if (files.length === 0) return null;
  return saveFilesToFolder(files, `${safeFileStem(set.title)}_PDF`);
}
