import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  HeightRule,
  ImageRun,
  LeaderType,
  Packer,
  PageBreak,
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
  formatOrderNumber,
  formatThaiDate,
  formatThaiMonthYear,
  formatTimeRangeThai,
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
    spacingAfter?: number;
    spacingBefore?: number;
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
      line: 276,
    },
    indent: options.indentFirstLineMm
      ? { firstLine: convertMillimetersToTwip(options.indentFirstLineMm) }
      : options.indentFirstLine
        ? { firstLine: convertMillimetersToTwip(12.5) }
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
  let max = 16;

  for (const row of rows) {
    const height = orderRowCount(row);
    if (current.length > 0 && used + height > max) {
      pages.push(current);
      current = [];
      used = 0;
      max = 24;
    }
    current.push(row);
    used += height;
  }
  if (current.length > 0 || pages.length === 0) pages.push(current);

  const count = (page: ReturnType<typeof getForm1Rows>) =>
    page.reduce((sum, row) => sum + orderRowCount(row), 0);

  // Keep the signature company: the final page must contain some table rows.
  let last = pages[pages.length - 1];
  if (count(last) > 20) {
    const moved: ReturnType<typeof getForm1Rows> = [];
    while (count(last) > 20 || count(moved) < 8) {
      const group = last.pop();
      if (!group) break;
      moved.unshift(group);
    }
    if (moved.length > 0) pages.push(moved);
  }

  last = pages[pages.length - 1];
  if (pages.length > 1 && count(last) < 8) {
    const previous = pages[pages.length - 2];
    while (count(last) < 8 && previous.length > 1) {
      const group = previous.pop();
      if (!group) break;
      last.unshift(group);
    }
  }

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

  const makeTable = (pageRows: ReturnType<typeof getForm1Rows>) => {
    const tableRows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        height: { value: convertMillimetersToTwip(10), rule: HeightRule.ATLEAST },
        children: [
          cell("วัน เดือน ปี", {
            width: dateWidth,
            bold: true,
            alignment: AlignmentType.CENTER,
            shading: "F2F2F2",
          }),
          ...shifts.map((shift) =>
            cell(`เวลา ${formatTimeRangeThai(shift.start, shift.end)}`, {
              width: shiftWidth,
              bold: true,
              alignment: AlignmentType.CENTER,
              shading: "F2F2F2",
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
              height: { value: convertMillimetersToTwip(7), rule: HeightRule.ATLEAST },
              children: [
                cell(index === 0 ? formatThaiDate(row.date) : "", {
                  width: dateWidth,
                  verticalMerge:
                    index === 0 ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE,
                }),
                ...row.cells.map((entry) =>
                  cell(entry.names[index] ?? "", { width: shiftWidth }),
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
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    if (isFirst) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [
            new ImageRun({
              type: "png",
              data: garuda,
              transformation: { width: 113, height: 113 },
            }),
          ],
        }),
        paragraph(`คำสั่ง${set.org.hospitalName}`, {
          alignment: AlignmentType.CENTER,
          bold: true,
          size: 32,
        }),
        paragraph(`ที่ ${toThaiDigits(formatOrderNumber(set.orderNumber, set.year))}`, {
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
          size: 28,
        }),
        new Paragraph({ spacing: { after: 100 }, children: [] }),
        paragraph(
          `เพื่อให้การปฏิบัติหน้าที่เป็นไปด้วยความเรียบร้อยและมีประสิทธิภาพ ${set.org.department} ${set.org.groupName} มีความประสงค์ขออนุมัติขึ้นปฏิบัติงานนอกเวลาราชการประจำเดือน ${formatThaiMonthYear(
            set.month,
            set.year,
          )} โดยอาศัยอำนาจตาม${toThaiDigits(set.org.ministryRef)} จึงขอแต่งตั้งผู้มีรายนามดังต่อไปนี้ขึ้นปฏิบัติงานนอกเวลาราชการ`,
          {
            alignment: AlignmentType.JUSTIFIED,
            indentFirstLineMm: 25,
            spacingBefore: 6,
          },
        ),
        new Paragraph({ spacing: { after: 80 }, children: [] }),
      );
    }

    children.push(makeTable(pageRows));

    if (isLast) {
      children.push(
        new Paragraph({ spacing: { after: 80 }, children: [] }),
        paragraph(
          `ทั้งนี้ให้มีสิทธิ์เบิกเงินตาม${toThaiDigits(set.org.lawRef)} โดยให้ ${controller.name} เป็นผู้ควบคุมการปฏิบัติงาน`,
          {
            alignment: AlignmentType.JUSTIFIED,
            indentFirstLineMm: 25,
          },
        ),
        new Paragraph({ spacing: { after: 100 }, children: [] }),
        paragraph(`สั่ง ณ วันที่ ${formatThaiDate(set.issueDate)}`, {
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ spacing: { after: 160 }, children: [] }),
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
          titlePage: true,
          page: {
            size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
            margin: {
              top: convertMillimetersToTwip(10),
              right: convertMillimetersToTwip(25.4),
              bottom: convertMillimetersToTwip(8),
              left: convertMillimetersToTwip(25.4),
            },
          },
        },
        headers: {
          first: new Header({ children: [new Paragraph({ children: [] })] }),
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 80 },
                children: [
                  new TextRun({
                    text: `คำสั่ง${set.org.hospitalName} ที่ ${toThaiDigits(
                      formatOrderNumber(set.orderNumber, set.year),
                    )}`,
                    font: FONT,
                    size: 24,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return saveBlob(blob, `คำสั่งแต่งตั้ง_${toThaiDigits(set.orderNumber).replace(/\//g, "-")}.docx`);
}

export async function exportMemoDocx(set: DocumentSet, settings: AppSettings) {
  const garuda = await loadImage("garuda-small.png");
  const shifts = getSetShifts(set, settings);
  const timeText = shifts
    .map((shift) => formatTimeRangeThai(shift.start, shift.end))
    .join(" และ");
  const groupHead = set.signatories.groupHead;
  const director = set.signatories.director;
  const controller = set.signatories.controller;

  const metaLine = (label: string, value: string) =>
    new Paragraph({
      spacing: { after: 40, line: 276 },
      tabStops: [{ type: TabStopType.RIGHT, position: 9000, leader: LeaderType.DOT }],
      children: [
        new TextRun({ text: `${label} `, bold: true, font: FONT, size: 40 }),
        new TextRun({ text: value, font: FONT, size: BODY_SIZE }),
        new TextRun({ text: "\t", font: FONT, size: BODY_SIZE }),
        new TextRun({ text: " ", font: FONT, size: BODY_SIZE }),
      ],
    });

  const children = [
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new ImageRun({
          type: "png",
          data: garuda,
          transformation: { width: 58, height: 58 },
        }),
        new TextRun({ text: "  บันทึกข้อความ", bold: true, font: FONT, size: 58 }),
      ],
    }),
    metaLine(
      "ส่วนราชการ",
      `${set.org.hospitalName} ${set.org.groupName}`,
    ),
    new Paragraph({
      spacing: { after: 40, line: 276 },
      tabStops: [
        { type: TabStopType.RIGHT, position: 4500, leader: LeaderType.DOT },
        { type: TabStopType.RIGHT, position: 9000, leader: LeaderType.DOT },
      ],
      children: [
        new TextRun({ text: "ที่ ", bold: true, font: FONT, size: 40 }),
        new TextRun({ text: toThaiDigits(set.memoNumber), font: FONT, size: BODY_SIZE }),
        new TextRun({ text: "\t", font: FONT, size: BODY_SIZE }),
        new TextRun({ text: "วันที่ ", bold: true, font: FONT, size: 40 }),
        new TextRun({ text: formatThaiDate(set.issueDate), font: FONT, size: BODY_SIZE }),
        new TextRun({ text: "\t", font: FONT, size: BODY_SIZE }),
      ],
    }),
    metaLine("เรื่อง", "ขออนุมัติขึ้นปฏิบัติงานนอกเวลาราชการ"),
    paragraph(`เรียน   ผู้อำนวยการ${set.org.hospitalName}`, { spacingAfter: 100 }),
    new Paragraph({ spacing: { after: 100 }, children: [] }),
    paragraph(
      `ด้วย${set.org.department} ${set.org.groupName} ${set.org.hospitalName} มีความประสงค์จะจัดเจ้าหน้าที่ขึ้นปฏิบัติงานนอกเวลาราชการ ประจำเดือน ${formatThaiMonthYear(
        set.month,
        set.year,
      )} โดยทำการนอกเวลาราชการ ตั้งแต่เวลา ${timeText} โดยมีเจ้าหน้าที่ปฏิบัติงาน ดังรายชื่อพร้อมตารางการปฏิบัติงานที่แนบมาพร้อมนี้`,
      { alignment: AlignmentType.JUSTIFIED, indentFirstLine: true },
    ),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
    paragraph(`ทั้งนี้โดยมี ${controller.name} เป็นผู้ควบคุมการปฏิบัติงาน`, {
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ spacing: { after: 320 }, children: [] }),
    paragraph(`(${controller.name})`, { alignment: AlignmentType.RIGHT, rightIndent: 12 }),
    ...controller.position
      .split("\n")
      .filter(Boolean)
      .map((line) => paragraph(line, { alignment: AlignmentType.RIGHT, rightIndent: 12 })),
    new Paragraph({ spacing: { after: 460 }, children: [] }),
    paragraph(`เรียน   ผู้อำนวยการ${set.org.hospitalName}`),
    paragraph("- เพื่อโปรดพิจารณาอนุมัติ"),
    new Paragraph({ spacing: { after: 80 }, children: [] }),
    paragraph("ลงชื่อ............................................................"),
    paragraph(`(${groupHead.name})`, { rightIndent: 18 }),
    ...groupHead.position
      .split("\n")
      .filter(Boolean)
      .map((line) => paragraph(line, { rightIndent: 18 })),
    new Paragraph({ spacing: { after: 420 }, children: [] }),
    paragraph("ลงชื่อ..............................................................", {
      alignment: AlignmentType.RIGHT,
      rightIndent: 10,
    }),
    paragraph(`(${director.name})`, { alignment: AlignmentType.RIGHT, rightIndent: 10 }),
    ...director.position
      .split("\n")
      .filter(Boolean)
      .map((line) => paragraph(line, { alignment: AlignmentType.RIGHT, rightIndent: 10 })),
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
