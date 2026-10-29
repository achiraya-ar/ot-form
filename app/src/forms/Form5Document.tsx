import type { AppSettings, DocumentSet } from "../types";
import { Paper } from "../components/PaperStage";
import { getForm5Rows, totalPayment } from "../lib/selectors";
import {
  formatBaht,
  formatThaiDate,
  formatThaiMonthYear,
  formatThaiNumber,
  getDaysInMonth,
  thaiBahtText,
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

export function Form5Document({
  set,
  settings,
}: {
  set: DocumentSet;
  settings: AppSettings;
}) {
  const rows = getForm5Rows(set, settings);
  const pages = paginateRows(rows, 4);
  const days = getDaysInMonth(set.year, set.month);
  const monthLabel = formatThaiMonthYear(set.month, set.year);
  const total = totalPayment(set, settings);
  const payer = set.signatories.payer;
  const director = set.signatories.director;
  const nursingHead = set.signatories.nursingHead;
  const auditor = set.signatories.auditor;
  const controller = set.signatories.controller;

  return (
    <>
      {pages.map((pageRows, pageIndex) => {
        const isLast = pageIndex === pages.length - 1;
        return (
          <Paper key={pageIndex} landscape className="doc doc--payment">
            <div className="official-heading">
              <h1>หลักฐานการจ่ายเงินค่าตอบแทนการปฏิบัติงานนอกเวลาราชการ</h1>
              <p>
                ส่วนราชการ {set.org.hospitalName} จังหวัด {set.org.province} ประจำเดือน{" "}
                {monthLabel}
              </p>
              <p>ลงวันที่ {formatThaiDate(set.issueDate)}</p>
              {pageIndex > 0 && (
                <span className="page-mark">หน้า {toThaiDigits(pageIndex + 1)}</span>
              )}
            </div>

            <table className="doc-table doc-table--payment">
              <colgroup>
                <col style={{ width: "7mm" }} />
                <col style={{ width: "27mm" }} />
                <col style={{ width: "20mm" }} />
                <col style={{ width: "11mm" }} />
                {Array.from({ length: days }, (_, index) => (
                  <col key={index} style={{ width: "4.75mm" }} />
                ))}
                <col style={{ width: "10mm" }} />
                <col style={{ width: "15mm" }} />
                <col style={{ width: "12mm" }} />
                <col style={{ width: "16mm" }} />
                <col style={{ width: "12mm" }} />
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2}>ลำดับ</th>
                  <th rowSpan={2}>ชื่อ</th>
                  <th rowSpan={2}>ตำแหน่ง</th>
                  <th rowSpan={2}>
                    อัตราเงิน
                    <br />
                    ตอบแทน
                  </th>
                  <th colSpan={days}>วันที่ปฏิบัติงานนอกเวลาราชการ</th>
                  <th rowSpan={2}>รวมวัน</th>
                  <th rowSpan={2}>
                    จำนวน
                    <br />
                    เงิน (บาท)
                  </th>
                  <th rowSpan={2}>วัน/เดือน/ปี</th>
                  <th rowSpan={2}>ลายมือชื่อผู้รับเงิน</th>
                  <th rowSpan={2}>หมายเหตุ</th>
                </tr>
                <tr>
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
                    <td colSpan={days + 9} className="doc-empty-cell">
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
                          <td className="center rate-cell">
                            {formatThaiNumber(row.rate, 2)}
                          </td>
                          {Array.from({ length: days }, (_, dayIndex) => {
                            const date = `${set.year - 543}-${String(set.month).padStart(
                              2,
                              "0",
                            )}-${String(dayIndex + 1).padStart(2, "0")}`;
                            const value = shift ? row.cells[date]?.[shift.id] ?? "" : "";
                            return (
                              <td
                                key={dayIndex}
                                className={`day-cell ${value === "-" ? "is-absent" : ""}`}
                              >
                                {value}
                              </td>
                            );
                          })}
                          {shiftIndex === 0 && (
                            <>
                              <td rowSpan={rowSpan} className="center total-cell">
                                {toThaiDigits(row.totalDays)} วัน
                              </td>
                              <td rowSpan={rowSpan} className="center amount-cell">
                                {formatThaiNumber(row.amount, 2)}
                              </td>
                              <td rowSpan={rowSpan} className="center date-received-cell">
                                {set.paymentDate ? formatThaiDate(set.paymentDate) : ""}
                              </td>
                              <td rowSpan={rowSpan} />
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

            {isLast && (
              <>
                <div className="payment-total">
                  <span>รวมจ่ายเงินทั้งสิ้น (ตัวอักษร)</span>
                  <strong>{thaiBahtText(total)}</strong>
                  <span className="payment-total__amount">
                    {formatBaht(total)} บาท
                  </span>
                </div>

                <p className="payment-certify">
                  ขอรับรองว่าผู้ที่รับเงินค่าตอบแทนปฏิบัติงานนอกเวลาดังกล่าว ได้ปฏิบัติงานนอกเวลาจริง
                </p>

                <div className="signature-grid">
                  <div className="signature-grid__cell">
                    <p>ลงชื่อ…………………………………………....</p>
                    <p className="signature-grid__label">หัวหน้าผู้ควบคุม</p>
                    <p className="signature-grid__name">({controller.name})</p>
                  </div>
                  <div className="signature-grid__cell">
                    <p>ลงชื่อ…………………………………………....</p>
                    <p className="signature-grid__label">ผู้จ่ายเงิน</p>
                    <p className="signature-grid__name">({payer.name})</p>
                    <p>{payer.position}</p>
                  </div>
                  <div className="signature-grid__cell">
                    <p>ลงชื่อ…………………………………………....</p>
                    <p className="signature-grid__label">ผู้อนุมัติ</p>
                    <p className="signature-grid__name">({director.name})</p>
                    <p>{director.position.split("\n").join(" ")}</p>
                  </div>
                  <div className="signature-grid__cell">
                    <p>ลงชื่อ…………………………………………....</p>
                    <p className="signature-grid__label">หัวหน้ากลุ่มการพยาบาล</p>
                    <p className="signature-grid__name">
                      ({nursingHead.name || ".............................."})
                    </p>
                  </div>
                  <div className="signature-grid__cell">
                    <p>ลงชื่อ…………………………………………....</p>
                    <p className="signature-grid__label">ผู้ตรวจสอบ</p>
                    <p className="signature-grid__name">
                      ({auditor.name || ".............................."})
                    </p>
                    {auditor.position && auditor.position !== "ผู้ตรวจสอบ" && (
                      <p>{auditor.position}</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </Paper>
        );
      })}
    </>
  );
}
