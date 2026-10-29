import type { AppSettings, DocumentSet } from "../types";
import { Garuda } from "../components/Brand";
import { Paper } from "../components/PaperStage";
import { getForm1Rows, getSetShifts } from "../lib/selectors";
import {
  formatThaiDate,
  formatThaiMonthYear,
  formatOrderNumber,
  formatTimeRangeThai,
  toThaiDigits,
} from "../lib/thai";

function splitPosition(position: string): string[] {
  return position.split("\n").filter(Boolean);
}

function rowCount(row: ReturnType<typeof getForm1Rows>[number]): number {
  return Math.max(1, ...row.cells.map((cell) => cell.names.length));
}

function paginate(rows: ReturnType<typeof getForm1Rows>) {
  const pages: ReturnType<typeof getForm1Rows>[] = [];
  let current: ReturnType<typeof getForm1Rows> = [];
  let count = 0;
  let max = 14;
  for (const row of rows) {
    const height = rowCount(row);
    if (current.length > 0 && count + height > max) {
      pages.push(current);
      current = [];
      count = 0;
      max = 24;
    }
    current.push(row);
    count += height;
  }
  if (current.length > 0) pages.push(current);
  if (pages.length === 0) pages.push([]);
  const last = pages[pages.length - 1];
  const lastCount = last.reduce((sum, row) => sum + rowCount(row), 0);
  if (lastCount > 18) pages.push([]);
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
  const shifts = getSetShifts(set, settings);
  const director = set.signatories.director;
  const controller = set.signatories.controller;
  const monthLabel = formatThaiMonthYear(set.month, set.year);

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
                  <Garuda size={104} />
                </div>
                <h1 className="doc-title">คำสั่ง{set.org.hospitalName}</h1>
                <p className="doc-center doc-order-number">
                  ที่ {toThaiDigits(formatOrderNumber(set.orderNumber, set.year))}
                </p>
                <p className="doc-center doc-subject">
                  เรื่อง แต่งตั้งเจ้าหน้าที่ปฏิบัติงานนอกเวลาราชการ {set.org.department}
                </p>
                <p className="doc-center doc-subject">{set.org.groupName}</p>
                <p className="doc-center doc-dots">.....................................</p>

                <p className="doc-justify doc-indent">
                  เพื่อให้การปฏิบัติหน้าที่เป็นไปด้วยความเรียบร้อยและมีประสิทธิภาพ{" "}
                  {set.org.department} {set.org.groupName} มีความประสงค์ขออนุมัติขึ้นปฏิบัติงานนอกเวลา
                  ราชการประจำเดือน {monthLabel} โดยอาศัยอำนาจตาม{toThaiDigits(set.org.ministryRef)}{" "}
                  จึงขอแต่งตั้งผู้มีรายนามดังต่อไปนี้ขึ้นปฏิบัติงานนอกเวลาราชการ
                </p>
              </>
            ) : (
              <div className="doc-continuation">
                <strong>
                  คำสั่ง{set.org.hospitalName} ที่ {toThaiDigits(formatOrderNumber(set.orderNumber, set.year))}
                </strong>
                <span>หน้า {toThaiDigits(pageIndex + 1)}</span>
              </div>
            )}

            <table className="doc-table doc-table--order">
              <thead>
                <tr>
                  <th style={{ width: "27%" }}>วัน เดือน ปี</th>
                  {shifts.map((shift) => (
                    <th key={shift.id} style={{ width: `${73 / Math.max(shifts.length, 1)}%` }}>
                      เวลา {formatTimeRangeThai(shift.start, shift.end)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={shifts.length + 1} className="doc-empty-cell">
                      ยังไม่ได้กำหนดตารางเวร
                    </td>
                  </tr>
                ) : (
                  pageRows.flatMap((row) => {
                    const height = rowCount(row);
                    return Array.from({ length: height }, (_, index) => (
                      <tr key={`${row.date}-${index}`}>
                        {index === 0 && (
                          <td rowSpan={height} className="doc-date-cell">
                            {formatThaiDate(row.date)}
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

            {isLast && (
              <>
                <p className="doc-justify doc-indent doc-after-table">
                  ทั้งนี้ให้มีสิทธิ์เบิกเงินตาม{toThaiDigits(set.org.lawRef)} โดยให้ {controller.name}{" "}
                  เป็นผู้ควบคุมการปฏิบัติงาน
                </p>
                <p className="doc-center doc-issued">
                  สั่ง ณ วันที่ {formatThaiDate(set.issueDate)}
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
