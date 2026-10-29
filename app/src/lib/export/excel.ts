import ExcelJS from "exceljs";
import { saveBlob } from "./save";
import type { AppSettings, DocumentSet } from "../../types";
import {
  getForm3Rows,
  getForm4Rows,
  getForm5Rows,
  totalPayment,
} from "../selectors";
import {
  formatBaht,
  formatThaiDate,
  formatThaiDateShort,
  formatThaiMonthYear,
  formatThaiNumber,
  formatTimeThai,
  thaiBahtText,
  toThaiDigits,
} from "../thai";

const FONT = "TH SarabunPSK";

type Align = "left" | "center" | "right" | "justify";

function applyCell(
  ws: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: string | number,
  options: {
    bold?: boolean;
    size?: number;
    align?: Align;
    wrap?: boolean;
    fill?: string;
    color?: string;
    rotation?: number;
  } = {},
) {
  const cell = ws.getCell(row, col);
  cell.value = value;
  cell.font = {
    name: FONT,
    size: options.size ?? 12,
    bold: options.bold,
    color: options.color ? { argb: options.color } : undefined,
  };
  cell.alignment = {
    horizontal: options.align ?? "left",
    vertical: "middle",
    wrapText: options.wrap ?? true,
    textRotation: options.rotation,
  };
  if (options.fill) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: options.fill } };
  }
  return cell;
}

function borderRange(
  ws: ExcelJS.Worksheet,
  top: number,
  left: number,
  bottom: number,
  right: number,
) {
  const border: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };
  for (let row = top; row <= bottom; row += 1) {
    for (let col = left; col <= right; col += 1) {
      ws.getCell(row, col).border = border;
    }
  }
}

function merge(
  ws: ExcelJS.Worksheet,
  top: number,
  left: number,
  bottom: number,
  right: number,
) {
  if (top === bottom && left === right) return;
  ws.mergeCells(top, left, bottom, right);
}

function pageSetup(
  ws: ExcelJS.Worksheet,
  orientation: "portrait" | "landscape",
  options: {
    fitToWidth?: number;
    fitToHeight?: number;
    fitToPage?: boolean;
    margins?: Partial<ExcelJS.PageSetup["margins"]>;
  } = {},
) {
  const margins = {
    left: 0.25,
    right: 0.25,
    top: 0.3,
    bottom: 0.3,
    header: 0.2,
    footer: 0.2,
    ...(options.margins ?? {}),
  };
  ws.pageSetup = {
    paperSize: 9,
    orientation,
    fitToPage: options.fitToPage ?? true,
    fitToWidth: options.fitToWidth ?? 1,
    fitToHeight: options.fitToHeight ?? 0,
    scale: options.fitToPage === false ? 100 : undefined,
    horizontalCentered: true,
    verticalCentered: false,
    margins,
  };
  ws.views = [{ showGridLines: false }];
}

function saveWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  return workbook.xlsx.writeBuffer().then((buffer) =>
    saveBlob(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      filename,
    ),
  );
}

export async function exportScheduleXlsx(set: DocumentSet, settings: AppSettings) {
  const rows = getForm3Rows(set, settings);
  const days = new Date(set.year - 543, set.month, 0).getDate();
  const dayStart = 4;
  const totalCol = dayStart + days;
  const noteCol = totalCol + 1;
  const lastCol = noteCol;
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("ตารางเวร");
  pageSetup(ws, "landscape", {
    fitToHeight: 1,
    margins: { left: 0.25, right: 0.25, top: 0.3, bottom: 0.3 },
  });

  ws.getColumn(1).width = 3.2;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 7.4;
  for (let day = 0; day < days; day += 1) {
    ws.getColumn(dayStart + day).width = day === 0 ? 5.6 : 2.1;
  }
  ws.getColumn(totalCol).width = 5.6;
  ws.getColumn(noteCol).width = 10.4;

  merge(ws, 1, 1, 1, lastCol);
  applyCell(ws, 1, 1, "ตารางการปฏิบัติงานนอกเวลาราชการ", {
    bold: true,
    size: 14,
    align: "center",
  });
  ws.getRow(1).height = 23;
  merge(ws, 2, 1, 2, lastCol);
  applyCell(
    ws,
    2,
    1,
    `ส่วนราชการ ${set.org.hospitalName} จังหวัด ${set.org.province} ประจำเดือน ${formatThaiMonthYear(
      set.month,
      set.year,
    )}`,
    { size: 14, align: "center", bold: true },
  );
  ws.getRow(2).height = 23;
  merge(ws, 3, 1, 3, lastCol);
  applyCell(ws, 3, 1, `ลงวันที่ ${formatThaiDate(set.issueDate)}`, {
    size: 14,
    align: "center",
    bold: true,
  });
  ws.getRow(3).height = 23;

  merge(ws, 4, 1, 5, 1);
  merge(ws, 4, 2, 5, 2);
  merge(ws, 4, 3, 5, 3);
  merge(ws, 4, dayStart, 4, dayStart + days - 1);
  merge(ws, 4, totalCol, 5, totalCol);
  merge(ws, 4, noteCol, 5, noteCol);

  applyCell(ws, 4, 1, "ลำดับ", { bold: true, size: 11, align: "center", fill: "FFF2F2F2" });
  applyCell(ws, 4, 2, "ชื่อ", { bold: true, size: 11, align: "center", fill: "FFF2F2F2" });
  applyCell(ws, 4, 3, "ตำแหน่ง", { bold: true, size: 11, align: "center", fill: "FFF2F2F2" });
  applyCell(ws, 4, dayStart, "วันที่ปฏิบัติงานนอกเวลาราชการ", {
    bold: true,
    size: 12,
    align: "center",
    fill: "FFF2F2F2",
  });
  applyCell(ws, 4, totalCol, "รวมวัน", { bold: true, size: 11, align: "center", fill: "FFF2F2F2" });
  applyCell(ws, 4, noteCol, "หมายเหตุ", { bold: true, size: 11, align: "center", fill: "FFF2F2F2" });
  for (let day = 1; day <= days; day += 1) {
    applyCell(ws, 5, dayStart + day - 1, toThaiDigits(day), {
      bold: true,
      size: 9,
      align: "center",
      fill: "FFF2F2F2",
    });
  }
  ws.getRow(4).height = 36;
  ws.getRow(5).height = 16;

  let rowIndex = 6;
  rows.forEach((row, staffIndex) => {
    const rowSpan = Math.max(1, row.shifts.length);
    merge(ws, rowIndex, 1, rowIndex + rowSpan - 1, 1);
    merge(ws, rowIndex, 2, rowIndex + rowSpan - 1, 2);
    merge(ws, rowIndex, 3, rowIndex + rowSpan - 1, 3);
    merge(ws, rowIndex, totalCol, rowIndex + rowSpan - 1, totalCol);
    merge(ws, rowIndex, noteCol, rowIndex + rowSpan - 1, noteCol);
    applyCell(ws, rowIndex, 1, toThaiDigits(staffIndex + 1), { size: 14, align: "center" });
    applyCell(
      ws,
      rowIndex,
      2,
      `${row.staff.prefix}${row.staff.firstName} ${row.staff.lastName}`,
      { size: 12 },
    );
    applyCell(ws, rowIndex, 3, row.staff.position, { size: 12 });
    applyCell(ws, rowIndex, totalCol, `${toThaiDigits(row.totalDays)} วัน`, {
      size: 12,
      align: "center",
    });
    applyCell(ws, rowIndex, noteCol, "", { size: 12 });
    for (let shiftIndex = 0; shiftIndex < rowSpan; shiftIndex += 1) {
      const shift = row.shifts[shiftIndex];
      for (let day = 1; day <= days; day += 1) {
        const date = `${set.year - 543}-${String(set.month).padStart(2, "0")}-${String(
          day,
        ).padStart(2, "0")}`;
        const value = shift ? row.cells[date]?.[shift.id] ?? "" : "";
        applyCell(ws, rowIndex + shiftIndex, dayStart + day - 1, value, {
          size: 12,
          align: "center",
          wrap: false,
          rotation: 90,
        });
      }
      ws.getRow(rowIndex + shiftIndex).height = 60;
    }
    rowIndex += rowSpan;
  });

  const tableEnd = rowIndex - 1;
  borderRange(ws, 4, 1, Math.max(tableEnd, 5), lastCol);

  merge(ws, tableEnd + 2, 1, tableEnd + 2, 3);
  applyCell(ws, tableEnd + 2, 1, "หมายเหตุ", { size: 12 });
  merge(ws, tableEnd + 2, dayStart, tableEnd + 2, lastCol);
  applyCell(ws, tableEnd + 2, dayStart, "", { size: 12 });
  ws.pageSetup.printTitlesRow = "4:5";

  return saveWorkbook(
    workbook,
    `ตารางเวร_${toThaiDigits(String(set.month).padStart(2, "0"))}_${toThaiDigits(set.year)}.xlsx`,
  );
}

export async function exportAttendanceXlsx(
  set: DocumentSet,
  settings: AppSettings,
) {
  const rows = getForm4Rows(set, settings);
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("บัญชีลงเวลา");
  pageSetup(ws, "portrait", {
    fitToPage: false,
    margins: {
      left: 0.709,
      right: 0.709,
      top: 0.748,
      bottom: 0.748,
      header: 0.315,
      footer: 0.315,
    },
  });

  const widths = [10.5, 9.88, 22.25, 8.88, 10.62, 8.88, 10.62];
  widths.forEach((width, index) => {
    ws.getColumn(index + 1).width = width;
  });

  merge(ws, 1, 1, 1, 7);
  applyCell(ws, 1, 1, "บัญชีลงเวลาปฏิบัติงานนอกเวลาราชการ", {
    bold: false,
    size: 16,
    align: "center",
  });
  ws.getRow(1).height = 24;
  merge(ws, 2, 1, 2, 7);
  applyCell(
    ws,
    2,
    1,
    `${set.org.department} ${set.org.hospitalName} ประจำเดือน ${formatThaiMonthYear(
      set.month,
      set.year,
    )}`,
    { size: 16, align: "center" },
  );
  ws.getRow(2).height = 24;
  ws.getRow(3).height = 23.25;

  const headers = ["วัน/เดือน/ปี", "เวร", "ชื่อ-สกุล", "เวลามา", "ลายเซ็น", "เวลากลับ", "ลายเซ็น"];
  headers.forEach((header, index) => {
    applyCell(ws, 4, index + 1, header, {
      bold: true,
      size: 16,
      align: "center",
      fill: "FFF2F2F2",
    });
  });
  ws.getRow(4).height = 21;

  let rowIndex = 5;
  for (const row of rows) {
    if (row.showDate) {
      merge(ws, rowIndex, 1, rowIndex + row.dateSpan - 1, 1);
      applyCell(ws, rowIndex, 1, formatThaiDateShort(row.date), {
        size: 16,
        align: "center",
      });
    }
    if (row.showStaff) {
      merge(ws, rowIndex, 2, rowIndex + row.staffSpan - 1, 2);
      applyCell(ws, rowIndex, 2, "นอกเวลา", { size: 16, align: "center" });
      merge(ws, rowIndex, 3, rowIndex + row.staffSpan - 1, 3);
      applyCell(
        ws,
        rowIndex,
        3,
        `${row.staff.prefix}${row.staff.firstName} ${row.staff.lastName}`,
        { size: 16 },
      );
    }
    applyCell(ws, rowIndex, 4, row.absent || row.timeIn === "-" ? "" : `${formatTimeThai(row.timeIn)}น.`, {
      size: 16,
      align: "center",
    });
    applyCell(ws, rowIndex, 5, row.absent ? "-" : "", { size: 16, align: "center" });
    applyCell(ws, rowIndex, 6, row.absent || row.timeOut === "-" ? "" : `${formatTimeThai(row.timeOut)}น.`, {
      size: 16,
      align: "center",
    });
    applyCell(ws, rowIndex, 7, row.absent ? "-" : "", { size: 16, align: "center" });
    ws.getRow(rowIndex).height = 21;
    rowIndex += 1;
  }

  borderRange(ws, 4, 1, Math.max(rowIndex - 1, 4), 7);

  if (rows.length === 0) {
    merge(ws, 5, 1, 5, 7);
    applyCell(ws, 5, 1, "ยังไม่ได้กำหนดตารางเวรและรายชื่อผู้ปฏิบัติงาน", {
      align: "center",
      size: 14,
    });
    rowIndex = 6;
  }

  // Break pages only at the end of a date group so the merged date cell and
  // the rows it belongs to always stay on the same printed page.
  const dateGroups: { start: number; end: number; size: number }[] = [];
  rows.forEach((row, index) => {
    if (!row.showDate) return;
    const start = 5 + index;
    const end = start + Math.max(row.dateSpan, 1) - 1;
    dateGroups.push({ start, end, size: end - start + 1 });
  });

  const PAGE_ROWS = 30;
  const breaks: number[] = [];
  let pageRows = 0;
  dateGroups.forEach((group, index) => {
    if (pageRows > 0 && pageRows + group.size > PAGE_ROWS) {
      const remaining = dateGroups
        .slice(index)
        .reduce((sum, item) => sum + item.size, 0);
      // Keep a final page from containing only a stray row or two before the
      // signature block; it should still carry meaningful data.
      if (remaining >= 8) {
        breaks.push(dateGroups[index - 1].end);
        pageRows = 0;
      }
    }
    pageRows += group.size;
  });

  if (breaks.length > 0) {
    const breaksApi = ws as unknown as {
      rowBreaks: { id: number; max: number; min: number; man: number }[];
    };
    for (const id of breaks) {
      breaksApi.rowBreaks.push({ id, max: 16383, min: 0, man: 1 });
    }
  }

  const controller = set.signatories.controller;
  const signRow = rowIndex;
  merge(ws, signRow, 5, signRow, 7);
  applyCell(ws, signRow, 5, "ลงชื่อ........................................................", {
    size: 16,
    align: "center",
  });
  merge(ws, signRow + 1, 5, signRow + 1, 7);
  applyCell(ws, signRow + 1, 5, `(${controller.name})`, {
    size: 16,
    align: "center",
  });
  merge(ws, signRow + 2, 5, signRow + 2, 7);
  applyCell(ws, signRow + 2, 5, controller.position.split("\n").join(" "), {
    size: 16,
    align: "center",
  });

  ws.pageSetup.printTitlesRow = "4:4";

  return saveWorkbook(
    workbook,
    `ใบรายชื่อเข้างาน_${toThaiDigits(String(set.month).padStart(2, "0"))}_${toThaiDigits(set.year)}.xlsx`,
  );
}

export async function exportPaymentXlsx(set: DocumentSet, settings: AppSettings) {
  const rows = getForm5Rows(set, settings);
  const days = new Date(set.year - 543, set.month, 0).getDate();
  const dayStart = 5;
  const totalCol = dayStart + days;
  const amountCol = totalCol + 1;
  const dateCol = amountCol + 1;
  const signCol = dateCol + 1;
  const noteCol = signCol + 1;
  const lastCol = noteCol;
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("หลักฐานการจ่ายเงิน");
  pageSetup(ws, "landscape", {
    fitToHeight: 1,
    margins: { left: 0.25, right: 0.25, top: 0.3, bottom: 0.3 },
  });

  ws.getColumn(1).width = 3.2;
  ws.getColumn(2).width = 15.1;
  ws.getColumn(3).width = 7.4;
  ws.getColumn(4).width = 5.6;
  for (let day = 0; day < days; day += 1) {
    ws.getColumn(dayStart + day).width = 2.1;
  }
  ws.getColumn(totalCol).width = 5.6;
  ws.getColumn(amountCol).width = 6.3;
  ws.getColumn(dateCol).width = 6.7;
  ws.getColumn(signCol).width = 10.4;
  ws.getColumn(noteCol).width = 6.5;

  merge(ws, 1, 1, 1, lastCol);
  applyCell(ws, 1, 1, "หลักฐานการจ่ายเงินค่าตอบแทนการปฏิบัติงานนอกเวลาราชการ", {
    bold: true,
    size: 14,
    align: "center",
  });
  ws.getRow(1).height = 23;
  merge(ws, 2, 1, 2, lastCol);
  applyCell(
    ws,
    2,
    1,
    `ส่วนราชการ ${set.org.hospitalName} จังหวัด ${set.org.province} ประจำเดือน ${formatThaiMonthYear(
      set.month,
      set.year,
    )}`,
    { size: 14, align: "center", bold: true },
  );
  ws.getRow(2).height = 23;
  merge(ws, 3, 1, 3, lastCol);
  applyCell(ws, 3, 1, `ลงวันที่ ${formatThaiDate(set.issueDate)}`, {
    size: 14,
    align: "center",
    bold: true,
  });
  ws.getRow(3).height = 23;

  merge(ws, 4, 1, 5, 1);
  merge(ws, 4, 2, 5, 2);
  merge(ws, 4, 3, 5, 3);
  merge(ws, 4, 4, 5, 4);
  merge(ws, 4, dayStart, 4, dayStart + days - 1);
  merge(ws, 4, totalCol, 5, totalCol);
  merge(ws, 4, amountCol, 5, amountCol);
  merge(ws, 4, dateCol, 5, dateCol);
  merge(ws, 4, signCol, 5, signCol);
  merge(ws, 4, noteCol, 5, noteCol);

  applyCell(ws, 4, 1, "ลำดับ", { bold: true, size: 11, align: "center", fill: "FFF2F2F2" });
  applyCell(ws, 4, 2, "ชื่อ", { bold: true, size: 11, align: "center", fill: "FFF2F2F2" });
  applyCell(ws, 4, 3, "ตำแหน่ง", { bold: true, size: 11, align: "center", fill: "FFF2F2F2" });
  applyCell(ws, 4, 4, "อัตราเงิน\nตอบแทน", {
    bold: true,
    size: 11,
    align: "center",
    fill: "FFF2F2F2",
  });
  applyCell(ws, 4, dayStart, "วันที่ปฏิบัติงานนอกเวลาราชการ", {
    bold: true,
    size: 12,
    align: "center",
    fill: "FFF2F2F2",
  });
  applyCell(ws, 4, totalCol, "รวมวัน", { bold: true, size: 11, align: "center", fill: "FFF2F2F2" });
  applyCell(ws, 4, amountCol, "จำนวนเงิน\n(บาท)", {
    bold: true,
    size: 11,
    align: "center",
    fill: "FFF2F2F2",
  });
  applyCell(ws, 4, dateCol, "วัน/เดือน/ปี", {
    bold: true,
    size: 11,
    align: "center",
    fill: "FFF2F2F2",
  });
  applyCell(ws, 4, signCol, "ลายมือชื่อผู้รับเงิน", {
    bold: true,
    size: 11,
    align: "center",
    fill: "FFF2F2F2",
  });
  applyCell(ws, 4, noteCol, "หมายเหตุ", {
    bold: true,
    size: 11,
    align: "center",
    fill: "FFF2F2F2",
  });
  for (let day = 1; day <= days; day += 1) {
    applyCell(ws, 5, dayStart + day - 1, toThaiDigits(day), {
      bold: true,
      size: 9,
      align: "center",
      fill: "FFF2F2F2",
    });
  }
  ws.getRow(4).height = 36;
  ws.getRow(5).height = 16;

  let rowIndex = 6;
  rows.forEach((row, staffIndex) => {
    const rowSpan = Math.max(1, row.shifts.length);
    merge(ws, rowIndex, 1, rowIndex + rowSpan - 1, 1);
    merge(ws, rowIndex, 2, rowIndex + rowSpan - 1, 2);
    merge(ws, rowIndex, 3, rowIndex + rowSpan - 1, 3);
    merge(ws, rowIndex, 4, rowIndex + rowSpan - 1, 4);
    merge(ws, rowIndex, totalCol, rowIndex + rowSpan - 1, totalCol);
    merge(ws, rowIndex, amountCol, rowIndex + rowSpan - 1, amountCol);
    merge(ws, rowIndex, dateCol, rowIndex + rowSpan - 1, dateCol);
    merge(ws, rowIndex, signCol, rowIndex + rowSpan - 1, signCol);
    merge(ws, rowIndex, noteCol, rowIndex + rowSpan - 1, noteCol);
    applyCell(ws, rowIndex, 1, toThaiDigits(staffIndex + 1), { align: "center" });
    applyCell(
      ws,
      rowIndex,
      2,
      `${row.staff.prefix}${row.staff.firstName} ${row.staff.lastName}`,
      { size: 12 },
    );
    applyCell(ws, rowIndex, 3, row.staff.position, { size: 12 });
    applyCell(ws, rowIndex, 4, formatThaiNumber(row.rate, 2), {
      size: 14,
      align: "center",
    });
    applyCell(ws, rowIndex, totalCol, `${toThaiDigits(row.totalDays)} วัน`, {
      size: 12,
      align: "center",
    });
    applyCell(ws, rowIndex, amountCol, formatThaiNumber(row.amount, 2), {
      size: 12,
      align: "right",
    });
    applyCell(
      ws,
      rowIndex,
      dateCol,
      set.paymentDate ? formatThaiDate(set.paymentDate) : "",
      { size: 12, align: "center" },
    );
    applyCell(ws, rowIndex, signCol, "", { size: 12 });
    applyCell(ws, rowIndex, noteCol, "", { size: 12 });

    for (let shiftIndex = 0; shiftIndex < rowSpan; shiftIndex += 1) {
      const shift = row.shifts[shiftIndex];
      for (let day = 1; day <= days; day += 1) {
        const date = `${set.year - 543}-${String(set.month).padStart(2, "0")}-${String(
          day,
        ).padStart(2, "0")}`;
        const value = shift ? row.cells[date]?.[shift.id] ?? "" : "";
        applyCell(ws, rowIndex + shiftIndex, dayStart + day - 1, value, {
          size: 12,
          align: "center",
          wrap: false,
          rotation: 90,
        });
      }
      ws.getRow(rowIndex + shiftIndex).height = 60;
    }
    rowIndex += rowSpan;
  });

  const tableEnd = rowIndex - 1;
  borderRange(ws, 4, 1, Math.max(tableEnd, 5), lastCol);

  const total = totalPayment(set, settings);
  const totalRow = tableEnd + 2;
  merge(ws, totalRow, 1, totalRow, 3);
  applyCell(ws, totalRow, 1, "รวมจ่ายเงินทั้งสิ้น (ตัวอักษร)", {
    bold: true,
    size: 12,
  });
  merge(ws, totalRow, 4, totalRow, amountCol - 1);
  applyCell(ws, totalRow, 4, thaiBahtText(total), { size: 12 });
  applyCell(ws, totalRow, amountCol, formatBaht(total), {
    bold: true,
    size: 12,
    align: "right",
  });
  borderRange(ws, totalRow, 1, totalRow, lastCol);

  const certifyRow = totalRow + 1;
  merge(ws, certifyRow, 1, certifyRow, lastCol);
  applyCell(
    ws,
    certifyRow,
    1,
    "ขอรับรองว่าผู้ที่รับเงินค่าตอบแทนปฏิบัติงานนอกเวลาดังกล่าว ได้ปฏิบัติงานนอกเวลาจริง",
    { size: 12 },
  );

  const payer = set.signatories.payer;
  const director = set.signatories.director;
  const nursingHead = set.signatories.nursingHead;
  const auditor = set.signatories.auditor;
  const controller = set.signatories.controller;

  const third = Math.floor(lastCol / 3);
  const blocks: [number, number][] = [
    [1, third],
    [third + 1, third * 2],
    [third * 2 + 1, lastCol],
  ];
  const sigRows = [
    certifyRow + 2,
    certifyRow + 3,
    certifyRow + 4,
    certifyRow + 5,
    certifyRow + 6,
    certifyRow + 7,
  ];
  const signatureBlocks = [
    {
      label1: "ลงชื่อ……………………………………  หัวหน้าผู้ควบคุม",
      name1: controller.name,
      pos1: controller.position.split("\n").join(" "),
      label2: "ลงชื่อ……………………………………  หัวหน้ากลุ่มการพยาบาล",
      name2: nursingHead.name || "..............................",
      pos2: nursingHead.position,
    },
    {
      label1: "ลงชื่อ……………………………………  ผู้จ่ายเงิน",
      name1: payer.name,
      pos1: payer.position,
      label2: "ลงชื่อ……………………………………  ผู้ตรวจสอบ",
      name2: auditor.name || "..............................",
      pos2: auditor.position,
    },
    {
      label1: "ลงชื่อ……………………………………  ผู้อนุมัติ",
      name1: director.name,
      pos1: director.position.split("\n").join(" "),
      label2: "",
      name2: "",
      pos2: "",
    },
  ];
  signatureBlocks.forEach((block, blockIndex) => {
    const [start, end] = blocks[blockIndex];
    const values = [block.label1, block.name1, block.pos1, block.label2, block.name2, block.pos2];
    values.forEach((value, rowOffset) => {
      merge(ws, sigRows[rowOffset], start, sigRows[rowOffset], end);
      applyCell(ws, sigRows[rowOffset], start, value, {
        size: 12,
        align: "center",
      });
    });
  });

  return saveWorkbook(
    workbook,
    `หลักฐานการจ่ายเงิน_${toThaiDigits(String(set.month).padStart(2, "0"))}_${toThaiDigits(set.year)}.xlsx`,
  );
}
