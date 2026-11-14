import type { AppSettings, DocumentSet } from "../types";
import { Paper } from "../components/PaperStage";
import { getForm3Rows } from "../lib/selectors";
import {
  formatDateDocOfficial,
  formatHoursDaysDoc,
  formatMonthYearDoc,
  getDaysInMonth,
  toThaiDigits,
} from "../lib/thai";

function paginateRows<T extends { shifts: unknown[] }>(
  items: T[],
  maxRows: number,
): T[][] {
  const pages: T[][] = [];
  let current: T[] = [];
  let used = 0;
  for (const item of items) {
    const span = Math.max(1, item.shifts.length);
    if (current.length > 0 && used + span > maxRows) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(item);
    used += span;
  }
  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

export function Form3Document({
  set,
  settings,
}: {
  set: DocumentSet;
  settings: AppSettings;
}) {
  const rows = getForm3Rows(set, settings);
  const pages = paginateRows(rows, 8);
  const days = getDaysInMonth(set.year, set.month);
  const monthLabel = formatMonthYearDoc(set.month, set.year);

  return (
    <>
      {pages.map((pageRows, pageIndex) => (
        <Paper key={pageIndex} landscape className="doc doc--schedule">
          <div className="official-heading">
            <h1>ตารางการปฏิบัติงานนอกเวลาราชการ</h1>
            <p>
              ส่วนราชการ {set.org.hospitalName} จังหวัด {set.org.province} ประจำเดือน{" "}
              {monthLabel}
            </p>
            <p>ลงวันที่ {formatDateDocOfficial(set.issueDate)}</p>
          </div>

          <table className="doc-table doc-table--schedule">
            <colgroup>
              <col style={{ width: "8mm" }} />
              <col style={{ width: "30mm" }} />
              <col style={{ width: "24mm" }} />
              {Array.from({ length: days }, (_, index) => (
                <col key={index} style={{ width: "5.2mm" }} />
              ))}
              <col style={{ width: "20mm" }} />
              <col style={{ width: "17mm" }} />
            </colgroup>
            <thead>
              <tr>
                <th>ลำดับ</th>
                <th rowSpan={2}>ชื่อ</th>
                <th rowSpan={2}>ตำแหน่ง</th>
                <th colSpan={days}>วันที่ปฏิบัติงานนอกเวลาราชการ</th>
                <th rowSpan={2}>รวมชม.(วัน)</th>
                <th rowSpan={2}>หมายเหตุ</th>
              </tr>
              <tr>
                <th>ที่</th>
                {Array.from({ length: days }, (_, index) => (
                  <th key={index} className="day-col">
                    {toThaiDigits(index + 1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={days + 5} className="doc-empty-cell">
                    ยังไม่มีพนักงานในชุดเอกสารนี้
                  </td>
                </tr>
              ) : (
                pageRows.flatMap((row) => {
                  const rowSpan = Math.max(1, row.shifts.length);
                  return Array.from({ length: rowSpan }, (_, shiftIndex) => {
                    const shift = row.shifts[shiftIndex];
                    return (
                      <tr key={`${row.staff.id}-${shiftIndex}`}>
                        {shiftIndex === 0 && (
                          <>
                            <td rowSpan={rowSpan} className="center">
                              {toThaiDigits(rows.indexOf(row) + 1)}
                            </td>
                            <td rowSpan={rowSpan} className="name-cell">
                              {row.staff.prefix}
                              {row.staff.firstName} {row.staff.lastName}
                            </td>
                            <td rowSpan={rowSpan} className="position-cell">
                              {row.staff.position}
                            </td>
                          </>
                        )}
                        {Array.from({ length: days }, (_, dayIndex) => {
                          const date = `${set.year - 543}-${String(set.month).padStart(
                            2,
                            "0",
                          )}-${String(dayIndex + 1).padStart(2, "0")}`;
                          const value = shift ? row.cells[date]?.[shift.id] ?? "" : "";
                          return (
                            <td key={dayIndex} className="day-cell">
                              <span>{value}</span>
                            </td>
                          );
                        })}
                        {shiftIndex === 0 && (
                          <>
                            <td rowSpan={rowSpan} className="center total-cell">
                              {formatHoursDaysDoc(row.totalHours, row.totalDays)}
                            </td>
                            <td rowSpan={rowSpan} />
                          </>
                        )}
                      </tr>
                    );
                  });
                })
              )}
            </tbody>
          </table>
        </Paper>
      ))}
    </>
  );
}
