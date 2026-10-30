import type { AppSettings, DocumentSet } from "../types";
import { Paper } from "../components/PaperStage";
import { getForm5Rows, totalPayment } from "../lib/selectors";
import {
  formatDateDoc,
  formatDateDocOfficial,
  formatMonthYearDoc,
  formatNumberDoc,
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
  const pages = paginateRows(rows, 6);
  const spanOf = (items: typeof rows) =>
    items.reduce((sum, row) => sum + Math.max(1, row.shifts.length), 0);
  if (rows.length > 0 && spanOf(pages[pages.length - 1]) > 4) {
    pages.push([rows[rows.length - 1]]);
  }
  const days = getDaysInMonth(set.year, set.month);
  const monthLabel = formatMonthYearDoc(set.month, set.year);
  const total = totalPayment(set, settings);
  const payer = set.signatories.payer;
  const director = set.signatories.director;
  const auditor = set.signatories.auditor;

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
              <p>ลงวันที่ {formatDateDocOfficial(set.issueDate)}</p>
            </div>

            <table className="doc-table doc-table--payment">
              <colgroup>
                <col style={{ width: "7mm" }} />
                <col style={{ width: "27mm" }} />
                <col style={{ width: "20mm" }} />
                <col style={{ width: "11mm" }} />
                {Array.from({ length: days }, (_, index) => (
                  <col key={index} style={{ width: "4.2mm" }} />
                ))}
                <col style={{ width: "10mm" }} />
                <col style={{ width: "15mm" }} />
                <col style={{ width: "13mm" }} />
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
                  <th rowSpan={2}>
                    วัน/เดือน/ปี
                    <br />
                    ที่รับเงิน
                  </th>
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
                            {formatNumberDoc(row.rate, 2)}
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
                                <span>{value}</span>
                              </td>
                            );
                          })}
                          {shiftIndex === 0 && (
                            <>
                              <td rowSpan={rowSpan} className="center total-cell">
                                {toThaiDigits(row.totalDays)} วัน
                              </td>
                              <td rowSpan={rowSpan} className="center amount-cell">
                                {formatNumberDoc(row.amount, 2)}
                              </td>
                              <td rowSpan={rowSpan} className="center date-received-cell">
                                {set.paymentDate ? formatDateDoc(set.paymentDate) : ""}
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
                  <span className="payment-total__dots" />
                  <strong>{thaiBahtText(total)}</strong>
                  <span className="payment-total__dots" />
                </div>

                <p className="payment-certify">
                  ขอรับรองว่าผู้ที่รับเงินค่าตอบแทนปฏิบัติงานนอกเวลาดังกล่าว ได้ปฏิบัติงานนอกเวลาจริง
                </p>

                <div className="payment-sign">
                  <div className="payment-sign__col">
                    <p className="payment-sign__line">
                      ลงชื่อ........................................ <span>หัวหน้าผู้ควบคุม</span>
                    </p>
                    <p className="payment-sign__gap" />
                    <p className="payment-sign__line">
                      ลงชื่อ........................................ <span>ผู้ตรวจสอบ</span>
                    </p>
                    {auditor.name && <p className="payment-sign__name">({auditor.name})</p>}
                  </div>
                  <div className="payment-sign__col">
                    <p className="payment-sign__line">
                      ลงชื่อ........................................ <span>ผู้จ่ายเงิน</span>
                    </p>
                    <p className="payment-sign__name">({payer.name})</p>
                    {payer.position.split("\n").filter(Boolean).map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                  <div className="payment-sign__col">
                    <p className="payment-sign__line">
                      ลงชื่อ........................................ <span>ผู้อนุมัติ</span>
                    </p>
                    <p className="payment-sign__name">({director.name})</p>
                    {director.position.split("\n").filter(Boolean).map((line) => (
                      <p key={line}>{line}</p>
                    ))}
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
