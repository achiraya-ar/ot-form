import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  ImageRun,
  LeaderType,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  VerticalMergeType,
  WidthType,
  convertMillimetersToTwip,
} from "docx";
import { saveBlob } from "./save";
import type { AppSettings, DocumentSet } from "../../types";
import { assetUrl } from "../../components/ui";
import { personFullName } from "../../data/defaults";
import { getForm1Rows, getSetShifts } from "../selectors";
import {
  formatDateDoc,
  formatDateDocOrderIssued,
  formatMonthYearDoc,
  formatOrderNumber,
  formatTimeHeaderDoc,
  toThaiDigits,
} from "../thai";

const FONT = "TH SarabunPSK";
const BODY_SIZE = 32; // 16pt
const TABLE_SIZE = 32; // 16pt

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const cellBorders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
};

async function loadImage(path: string): Promise<Uint8Array> {
  const response = await fetch(assetUrl(path));
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

function run(text: string, options: { bold?: boolean; size?: number } = {}) {
  return new TextRun({
    text,
    font: FONT,
    size: options.size ?? BODY_SIZE,
    bold: options.bold,
  });
}

function paragraph(
  text: string,
  options: {
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    bold?: boolean;
    size?: number;
    indentFirstLine?: boolean;
    indentFirstLineMm?: number;
    indentLeftMm?: number;
    spacingAfter?: number;
    spacingBefore?: number;
    line?: number;
    rightIndent?: number;
    keepNext?: boolean;
  } = {},
) {
  return new Paragraph({
    alignment: options.alignment,
    keepNext: options.keepNext,
    spacing: {
      before: options.spacingBefore ? options.spacingBefore * 20 : undefined,
      after: options.spacingAfter ?? 0,
      line: options.line ?? 276,
    },
    indent: options.indentFirstLineMm
      ? { firstLine: convertMillimetersToTwip(options.indentFirstLineMm) }
      : options.indentFirstLine
        ? { firstLine: convertMillimetersToTwip(25) }
        : options.indentLeftMm
          ? { left: convertMillimetersToTwip(options.indentLeftMm) }
          : options.rightIndent
            ? { right: convertMillimetersToTwip(options.rightIndent) }
            : undefined,
    children: [run(text, { bold: options.bold, size: options.size })],
  });
}

function cell(
  text: string,
  options: {
    width?: number;
    bold?: boolean;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    verticalMerge?: (typeof VerticalMergeType)[keyof typeof VerticalMergeType];
    columnSpan?: number;
    shading?: string;
    size?: number;
  } = {},
) {
  return new TableCell({
    width: options.width
      ? { size: options.width, type: WidthType.DXA }
      : undefined,
    verticalAlign: VerticalAlign.CENTER,
    verticalMerge: options.verticalMerge,
    columnSpan: options.columnSpan,
    shading: options.shading ? { fill: options.shading } : undefined,
    margins: { top: 30, bottom: 30, left: 80, right: 80 },
    borders: cellBorders,
    children: [
      new Paragraph({
        alignment: options.alignment ?? AlignmentType.LEFT,
        spacing: { after: 0, line: 240 },
        children: [
          run(text || " ", {
            bold: options.bold,
            size: options.size ?? TABLE_SIZE,
          }),
        ],
      }),
    ],
  });
}

function orderRowCount(row: ReturnType<typeof getForm1Rows>[number]): number {
  return Math.max(1, ...row.cells.map((entry) => entry.names.length));
}

function paginateOrderRows(rows: ReturnType<typeof getForm1Rows>) {
  const pages: ReturnType<typeof getForm1Rows>[] = [];
  let current: ReturnType<typeof getForm1Rows> = [];
  let used = 0;
  let max = 21;

  for (const row of rows) {
    const height = orderRowCount(row);
    if (current.length > 0 && used + height > max) {
      pages.push(current);
      current = [];
      used = 0;
      max = 40;
    }
    current.push(row);
    used += height;
  }
  if (current.length > 0 || pages.length === 0) pages.push(current);

  const count = (page: ReturnType<typeof getForm1Rows>) =>
    page.reduce((sum, row) => sum + orderRowCount(row), 0);

  const last = pages[pages.length - 1];
  if (count(last) > 20) pages.push([]);
  return pages;
}

export async function exportOrderDocx(set: DocumentSet, settings: AppSettings) {
  const garuda = await loadImage("garuda.png");
  const rows = getForm1Rows(set, settings);
  const shifts = getSetShifts(set, settings);
  const director = set.signatories.director;
  const controller = set.signatories.controller;
  const tableWidth = 9242;
  const dateWidth = 3012;
  const shiftWidth = Math.floor((tableWidth - dateWidth) / Math.max(shifts.length, 1));
  const pages = paginateOrderRows(rows);
  const lastDate = rows[rows.length - 1]?.date;
  const carryRows = lastDate ? rows.filter((row) => row.date === lastDate) : [];
  const orderNumber = set.orderNumber.trim()
    ? formatOrderNumber(set.orderNumber, set.year)
    : `          /${toThaiDigits(set.year)}`;
  const shortDepartment = set.org.departmentShort || set.org.department;

  const makeTable = (pageRows: ReturnType<typeof getForm1Rows>) => {
    const tableRows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        height: { value: convertMillimetersToTwip(8.5), rule: HeightRule.EXACT },
        children: [
          cell("วัน เดือน ปี", {
            width: dateWidth,
            bold: false,
            alignment: AlignmentType.CENTER,
          }),
          ...shifts.map((shift) =>
            cell(formatTimeHeaderDoc(shift.start, shift.end), {
              width: shiftWidth,
              bold: false,
              alignment: AlignmentType.CENTER,
            }),
          ),
        ],
      }),
    ];

    if (pageRows.length === 0) {
      tableRows.push(
        new TableRow({
          children: [
            cell("ยังไม่ได้กำหนดตารางเวร", {
              columnSpan: shifts.length + 1,
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      );
    } else {
      for (const row of pageRows) {
        const height = orderRowCount(row);
        for (let index = 0; index < height; index += 1) {
          tableRows.push(
            new TableRow({
              height: { value: convertMillimetersToTwip(6.2), rule: HeightRule.EXACT },
              children: [
                cell(index === 0 ? formatDateDoc(row.date) : "", {
                  width: dateWidth,
                  alignment: AlignmentType.CENTER,
                  verticalMerge:
                    index === 0 ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE,
                }),
                ...row.cells.map((entry) =>
                  cell(entry.names[index] ?? "", {
                    width: shiftWidth,
                    alignment: AlignmentType.CENTER,
                  }),
                ),
              ],
            }),
          );
        }
      }
    }

    return new Table({
      width: { size: tableWidth, type: WidthType.DXA },
      columnWidths: [dateWidth, ...shifts.map(() => shiftWidth)],
      rows: tableRows,
    });
  };

  const children: (Paragraph | Table)[] = [];

  pages.forEach((pageRows, pageIndex) => {
    const isFirst = pageIndex === 0;
    const isLast = pageIndex === pages.length - 1;

    if (pageIndex > 0) {
      children.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    }

    if (isFirst) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [
            new ImageRun({
              type: "png",
              data: garuda,
              transformation: { width: 85, height: 85 },
            }),
          ],
        }),
        paragraph(`คำสั่ง${set.org.hospitalName}`, {
          alignment: AlignmentType.CENTER,
          size: 32,
        }),
        paragraph(`ที่ ${orderNumber}`, {
          alignment: AlignmentType.CENTER,
          size: 32,
        }),
        paragraph(`เรื่อง แต่งตั้งเจ้าหน้าที่ปฏิบัติงานนอกเวลาราชการ ${set.org.department}`, {
          alignment: AlignmentType.CENTER,
          size: 32,
        }),
        paragraph(set.org.groupName, { alignment: AlignmentType.CENTER, size: 32 }),
        paragraph(".....................................", {
          alignment: AlignmentType.CENTER,
          size: 32,
        }),
        new Paragraph({ spacing: { after: 60 }, children: [] }),
        paragraph(
          `เพื่อให้การปฏิบัติหน้าที่เป็นไปด้วยความเรียบร้อยและมีประสิทธิภาพ ${shortDepartment} ${set.org.groupName} มีความประสงค์ขออนุมัติขึ้นปฏิบัติงานนอกเวลาราชการประจำเดือน ${formatMonthYearDoc(
            set.month,
            set.year,
          )} โดยอาศัยอำนาจตาม${toThaiDigits(set.org.ministryRef)} จึงขอแต่งตั้งผู้มีรายนามดังต่อไปนี้ขึ้นปฏิบัติงานนอกเวลาราชการ`,
          {
            alignment: AlignmentType.JUSTIFIED,
            indentFirstLineMm: 25,
            spacingBefore: 6,
            line: 240,
          },
        ),
        new Paragraph({ spacing: { after: 60 }, children: [] }),
      );
    }

    if (pageRows.length > 0 || isFirst) {
      children.push(makeTable(pageRows));
    } else if (isLast && carryRows.length > 0) {
      children.push(
        paragraph("ตารางต่อเนื่อง (วันสุดท้าย)", {
          alignment: AlignmentType.CENTER,
          size: 20,
        }),
        makeTable(carryRows),
      );
    }

    if (isLast) {
      children.push(
        new Paragraph({ spacing: { after: 60 }, children: [] }),
        paragraph(
          `ทั้งนี้ให้มีสิทธิ์เบิกเงินตาม${toThaiDigits(set.org.lawRef)} โดยให้ ${controller.name} เป็นผู้ควบคุมการปฏิบัติงาน`,
          {
            alignment: AlignmentType.JUSTIFIED,
            indentFirstLineMm: 25,
            line: 240,
          },
        ),
        new Paragraph({ spacing: { after: 100 }, children: [] }),
        paragraph(`สั่ง   ณ   วันที่    ${formatDateDocOrderIssued(set.issueDate)}`, {
          indentLeftMm: 59,
        }),
        new Paragraph({ spacing: { after: 220 }, children: [] }),
        paragraph("ลงชื่อ..............................................................", {
          alignment: AlignmentType.CENTER,
        }),
        paragraph(`(${director.name})`, { alignment: AlignmentType.CENTER }),
        ...director.position
          .split("\n")
          .filter(Boolean)
          .map((line) => paragraph(line, { alignment: AlignmentType.CENTER })),
      );
    }
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: BODY_SIZE },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
            margin: {
              top: convertMillimetersToTwip(10),
              right: convertMillimetersToTwip(25.4),
              bottom: convertMillimetersToTwip(5),
              left: convertMillimetersToTwip(25.4),
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return saveBlob(blob, `คำสั่งแต่งตั้ง_${(orderNumber || "blank").replace(/\//g, "-")}.docx`);
}

export async function exportMemoDocx(set: DocumentSet, settings: AppSettings) {
  const garuda = await loadImage("garuda-small.png");
  const shifts = getSetShifts(set, settings);
  const shortTime = (time: string) =>
    toThaiDigits(time.replace(":", ".").replace(/^0/, ""));
  const timeText = shifts
    .map((shift) => `${shortTime(shift.start)}-${shortTime(shift.end)} น.`)
    .join(" และ");
  const groupHead = set.signatories.groupHead;
  const director = set.signatories.director;
  const controller = set.signatories.controller;

  const metaLine = (label: string, value: string) =>
    new Paragraph({
      spacing: { after: 20, line: 276 },
      tabStops: [{ type: TabStopType.RIGHT, position: 8640, leader: LeaderType.DOT }],
      children: [
        new TextRun({ text: `${label} `, bold: true, font: FONT, size: 40 }),
        new TextRun({ text: value, font: FONT, size: BODY_SIZE, underline: {} }),
        new TextRun({ text: "\t", font: FONT, size: BODY_SIZE }),
      ],
    });

  const children = [
    new Paragraph({
      spacing: { before: 520, after: 60 },
      tabStops: [{ type: TabStopType.LEFT, position: 3600 }],
      children: [
        new ImageRun({
          type: "png",
          data: garuda,
          transformation: { width: 57, height: 57 },
        }),
        new TextRun({ text: "\tบันทึกข้อความ", bold: true, font: FONT, size: 58 }),
      ],
    }),
    metaLine("ส่วนราชการ", `${set.org.hospitalName} ${set.org.groupName}`),
    new Paragraph({
      spacing: { after: 20, line: 276 },
      tabStops: [
        { type: TabStopType.LEFT, position: 4500 },
        { type: TabStopType.RIGHT, position: 8640, leader: LeaderType.DOT },
      ],
      children: [
        new TextRun({ text: "ที่ ", bold: true, font: FONT, size: 40 }),
        new TextRun({ text: toThaiDigits(set.memoNumber), font: FONT, size: BODY_SIZE }),
        new TextRun({ text: "\t", font: FONT, size: BODY_SIZE }),
        new TextRun({ text: "วันที่ ", bold: true, font: FONT, size: 40 }),
        new TextRun({
          text: formatDateDoc(set.issueDate),
          font: FONT,
          size: BODY_SIZE,
          underline: {},
        }),
        new TextRun({ text: "\t", font: FONT, size: BODY_SIZE }),
      ],
    }),
    metaLine("เรื่อง", "ขออนุมัติขึ้นปฏิบัติงานนอกเวลาราชการ"),
    new Paragraph({
      spacing: { before: 120, after: 100 },
      children: [
        new TextRun({ text: "เรียน   ", bold: true, font: FONT, size: BODY_SIZE }),
        new TextRun({ text: `ผู้อำนวยการ${set.org.hospitalName}`, font: FONT, size: BODY_SIZE }),
      ],
    }),
    new Paragraph({ spacing: { after: 80 }, children: [] }),
    paragraph(
      `ด้วย${set.org.department} ${set.org.groupName} ${set.org.hospitalName} มีความประสงค์จะจัดเจ้าหน้าที่ขึ้นปฏิบัติงานนอกเวลาราชการ ประจำเดือน ${formatMonthYearDoc(
        set.month,
        set.year,
      )} โดยทำการนอกเวลาราชการ ตั้งแต่เวลา ${timeText} โดยมีเจ้าหน้าที่ปฏิบัติงาน ดังรายชื่อพร้อมตารางการปฏิบัติงานที่แนบมาพร้อมนี้`,
      { alignment: AlignmentType.JUSTIFIED, indentFirstLine: true },
    ),
    new Paragraph({ spacing: { after: 160 }, children: [] }),
    paragraph(`ทั้งนี้โดยมี ${controller.name} เป็นผู้ควบคุมการปฏิบัติงาน`, {
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ spacing: { after: 380 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      indent: { right: convertMillimetersToTwip(20) },
      children: [
        new TextRun({ text: "(", font: FONT, size: 36 }),
        new TextRun({ text: controller.name, font: FONT, size: BODY_SIZE }),
        new TextRun({ text: ")", font: FONT, size: 36 }),
      ],
    }),
    ...controller.position
      .split("\n")
      .filter(Boolean)
      .map((line) =>
        paragraph(line, { alignment: AlignmentType.RIGHT, rightIndent: 20 }),
      ),
    new Paragraph({ spacing: { after: 560 }, children: [] }),
    new Paragraph({
      spacing: { after: 20 },
      indent: { left: convertMillimetersToTwip(8) },
      children: [
        new TextRun({ text: "เรียน   ", bold: true, font: FONT, size: BODY_SIZE }),
        new TextRun({ text: `ผู้อำนวยการ${set.org.hospitalName}`, font: FONT, size: BODY_SIZE }),
      ],
    }),
    new Paragraph({
      indent: { left: convertMillimetersToTwip(13) },
      children: [new TextRun({ text: "- เพื่อโปรดพิจารณาอนุมัติ", font: FONT, size: BODY_SIZE })],
    }),
    new Paragraph({ spacing: { after: 80 }, children: [] }),
    new Paragraph({
      indent: { left: convertMillimetersToTwip(8) },
      children: [
        new TextRun({ text: "ลงชื่อ............................................................", font: FONT, size: BODY_SIZE }),
      ],
    }),
    new Paragraph({
      indent: { left: convertMillimetersToTwip(20) },
      children: [
        new TextRun({ text: "(", font: FONT, size: 36 }),
        new TextRun({ text: groupHead.name, font: FONT, size: BODY_SIZE }),
        new TextRun({ text: ")", font: FONT, size: 36 }),
      ],
    }),
    ...groupHead.position
      .split("\n")
      .filter(Boolean)
      .map((line) =>
        paragraph(line, { indentLeftMm: 12 }),
      ),
    new Paragraph({ spacing: { after: 520 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      indent: { right: convertMillimetersToTwip(10) },
      children: [
        new TextRun({ text: "ลงชื่อ..............................................................", font: FONT, size: BODY_SIZE }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      indent: { right: convertMillimetersToTwip(10) },
      children: [
        new TextRun({ text: "(", font: FONT, size: 36 }),
        new TextRun({ text: director.name, font: FONT, size: BODY_SIZE }),
        new TextRun({ text: ")", font: FONT, size: 36 }),
      ],
    }),
    ...director.position
      .split("\n")
      .filter(Boolean)
      .map((line) =>
        paragraph(line, { alignment: AlignmentType.RIGHT, rightIndent: 10 }),
      ),
  ];

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: BODY_SIZE },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
            margin: {
              top: convertMillimetersToTwip(6.3),
              right: convertMillimetersToTwip(20),
              bottom: convertMillimetersToTwip(10),
              left: convertMillimetersToTwip(30),
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return saveBlob(blob, `บันทึกขออนุมัติ_${toThaiDigits(set.memoNumber).replace(/\//g, "-")}.docx`);
}
