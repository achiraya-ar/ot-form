import type { AppSettings, DocumentSet } from "../types";
import { Garuda } from "../components/Brand";
import { Paper } from "../components/PaperStage";
import {
  documentPeriodPhrase,
  getDocumentShifts,
  getForm1Rows,
} from "../lib/selectors";
import {
  formatDateDoc,
  formatDateDocOrderIssued,
  formatOrderNumber,
  formatTimeHeaderDoc,
  toThaiDigits,
} from "../lib/thai";

type Form1Row = ReturnType<typeof getForm1Rows>[number];

function splitPosition(position: string): string[] {
  return position.split("\n").filter(Boolean);
}

function rowCount(row: Form1Row): number {
  return Math.max(1, ...row.cells.map((cell) => cell.names.length));
}

function paginate(rows: Form1Row[]) {
  const pages: Form1Row[][] = [];
  let current: Form1Row[] = [];
  let count = 0;
  let max = 24;
  for (const row of rows) {
    const height = rowCount(row);
    if (current.length > 0 && count + height > max) {
      pages.push(current);
      current = [];
      count = 0;
      max = 34;
    }
    current.push(row);
    count += height;
  }
  if (current.length > 0) pages.push(current);
  if (pages.length === 0) pages.push([]);
  const last = pages[pages.length - 1];
  const lastCount = last.reduce((sum, row) => sum + rowCount(row), 0);
  // The source keeps the closing paragraph and signature on a clean page when
  // the table runs almost to the bottom of the preceding page.
  if (lastCount > 20) pages.push([]);
  return pages;
}

export function Form1Document({
  set,
  settings,
}: {
  set: DocumentSet;
  settings: AppSettings;
}) {
  const rows = getForm1Rows(set, settings);
  const pages = paginate(rows);
  const shifts = getDocumentShifts(set, settings);
  const director = set.signatories.director;
  const controller = set.signatories.controller;
  const periodPhrase = documentPeriodPhrase(set);
  const shortDepartment = set.org.departmentShort || set.org.department;
  const orderNumber = set.orderNumber.trim()
    ? formatOrderNumber(set.orderNumber, set.year)
    : `${"\u00a0".repeat(10)}/${toThaiDigits(set.year)}`;
  const lastDate = rows[rows.length - 1]?.date;
  const carryRows = lastDate ? rows.filter((row) => row.date === lastDate) : [];

  const renderTable = (tableRows: Form1Row[], emptyText?: string) => (
    <table className="doc-table doc-table--order">
      <colgroup>
        <col style={{ width: "32.6%" }} />
        {shifts.map((shift) => (
          <col key={shift.id} style={{ width: `${67.4 / Math.max(shifts.length, 1)}%` }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th>วัน เดือน ปี</th>
          {shifts.map((shift) => (
            <th key={shift.id}>{formatTimeHeaderDoc(shift.start, shift.end)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tableRows.length === 0 ? (
          <tr>
            <td colSpan={shifts.length + 1} className="doc-empty-cell">
              {emptyText || "\u00a0"}
            </td>
          </tr>
        ) : (
          tableRows.flatMap((row) => {
            const height = rowCount(row);
            return Array.from({ length: height }, (_, index) => (
              <tr key={`${row.date}-${index}`}>
                {index === 0 && (
                  <td rowSpan={height} className="doc-date-cell">
                    {formatDateDoc(row.date)}
                  </td>
                )}
                {row.cells.map((cell) => (
                  <td key={cell.shift.id} className="doc-name-cell">
                    {cell.names[index] ?? "\u00a0"}
                  </td>
                ))}
              </tr>
            ));
          })
        )}
      </tbody>
    </table>
  );

  return (
    <>
      {pages.map((pageRows, pageIndex) => {
        const isFirst = pageIndex === 0;
        const isLast = pageIndex === pages.length - 1;
        return (
          <Paper key={pageIndex} className="doc doc--order">
            {isFirst ? (
              <>
                <div className="doc-garuda">
                  <Garuda size={113} />
                </div>
                <h1 className="doc-title">คำสั่ง{set.org.hospitalName}</h1>
                <p className="doc-center doc-order-number">ที่ {orderNumber}</p>
                <p className="doc-center doc-subject">
                  เรื่อง แต่งตั้งเจ้าหน้าที่ปฏิบัติงานนอกเวลาราชการ {set.org.department}
                </p>
                <p className="doc-center doc-subject">{set.org.groupName}</p>
                <p className="doc-center doc-dots">.....................................</p>

                <p className="doc-justify doc-indent">
                  {`เพื่อให้การปฏิบัติหน้าที่เป็นไปด้วยความเรียบร้อยและมีประสิทธิภาพ ${shortDepartment} ${set.org.groupName} มีความประสงค์ขออนุมัติขึ้นปฏิบัติงานนอกเวลาราชการ${periodPhrase} โดยอาศัยอำนาจตาม${toThaiDigits(set.org.ministryRef)} จึงขอแต่งตั้งผู้มีรายนามดังต่อไปนี้ขึ้นปฏิบัติงานนอกเวลาราชการ`}
                </p>
              </>
            ) : null}

            {!(pageRows.length === 0 && !isFirst) &&
              renderTable(pageRows, isFirst ? "ยังไม่ได้กำหนดตารางเวร" : undefined)}

            {isLast && pageRows.length === 0 && carryRows.length > 0 && (
              <>
                <p className="carry-note">ตารางต่อเนื่อง (วันสุดท้าย)</p>
                {renderTable(carryRows)}
              </>
            )}

            {isLast && (
              <>
                <p className="doc-justify doc-indent doc-after-table">
                  ทั้งนี้ให้มีสิทธิ์เบิกเงินตาม{toThaiDigits(set.org.lawRef)} โดยให้ {controller.name}{" "}
                  เป็นผู้ควบคุมการปฏิบัติงาน
                </p>
                <p className="doc-issued">
                  สั่ง&nbsp;&nbsp;&nbsp;ณ&nbsp;&nbsp;&nbsp;วันที่&nbsp;&nbsp;&nbsp;&nbsp;{formatDateDocOrderIssued(set.issueDate)}
                </p>
                <div className="doc-sign doc-sign--order">
                  <p>ลงชื่อ..............................................................</p>
                  <p className="doc-sign__name">({director.name})</p>
                  {splitPosition(director.position).map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </>
            )}
          </Paper>
        );
      })}
    </>
  );
}
