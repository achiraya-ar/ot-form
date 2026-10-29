import type { AppSettings, DocumentSet } from "../types";
import { Paper } from "../components/PaperStage";
import { getForm4Rows, type Form4Row } from "../lib/selectors";
import {
  formatThaiDateShort,
  formatThaiMonthYear,
  formatTimeThai,
  toThaiDigits,
} from "../lib/thai";

function paginate(rows: Form4Row[]): Form4Row[][] {
  const groups = new Map<string, Form4Row[]>();
  for (const row of rows) {
    const list = groups.get(row.date) ?? [];
    list.push(row);
    groups.set(row.date, list);
  }
  const pages: Form4Row[][] = [];
  let current: Form4Row[] = [];
  for (const group of groups.values()) {
    if (current.length > 0 && current.length + group.length > 22) {
      pages.push(current);
      current = [];
    }
    current.push(...group);
  }
  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

export function Form4Document({
  set,
  settings,
}: {
  set: DocumentSet;
  settings: AppSettings;
}) {
  const rows = getForm4Rows(set, settings);
  const pages = paginate(rows);
  const controller = set.signatories.controller;
  const monthLabel = formatThaiMonthYear(set.month, set.year);

  return (
    <>
      {pages.map((pageRows, pageIndex) => {
        const isLast = pageIndex === pages.length - 1;
        return (
          <Paper key={pageIndex} className="doc doc--attendance">
            <div className="official-heading official-heading--portrait">
              <h1>บัญชีลงเวลาปฏิบัติงานนอกเวลาราชการ</h1>
              <p>
                {set.org.department} {set.org.hospitalName} ประจำเดือน {monthLabel}
              </p>
            </div>

            <table className="doc-table doc-table--attendance">
              <colgroup>
                <col style={{ width: "23mm" }} />
                <col style={{ width: "18mm" }} />
                <col style={{ width: "50mm" }} />
                <col style={{ width: "18mm" }} />
                <col style={{ width: "24mm" }} />
                <col style={{ width: "18mm" }} />
                <col style={{ width: "24mm" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>วัน/เดือน/ปี</th>
                  <th>เวร</th>
                  <th>ชื่อ-สกุล</th>
                  <th>เวลามา</th>
                  <th>ลายเซ็น</th>
                  <th>เวลากลับ</th>
                  <th>ลายเซ็น</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="doc-empty-cell">
                      ยังไม่ได้กำหนดตารางเวรและรายชื่อผู้ปฏิบัติงาน
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => (
                    <tr key={row.key} className={row.absent ? "is-absent" : ""}>
                      {row.showDate && (
                        <td rowSpan={row.dateSpan} className="date-cell">
                          {formatThaiDateShort(row.date)}
                        </td>
                      )}
                      {row.showStaff && (
                        <>
                          <td rowSpan={row.staffSpan} className="center">
                            นอกเวลา
                          </td>
                          <td rowSpan={row.staffSpan} className="name-cell">
                            {row.staff.prefix}
                            {row.staff.firstName} {row.staff.lastName}
                          </td>
                        </>
                      )}
                      <td className="center time-cell">
                        {row.absent || row.timeIn === "-" ? "" : `${formatTimeThai(row.timeIn)}น.`}
                      </td>
                      <td className="center signature-cell">{row.absent ? "-" : ""}</td>
                      <td className="center time-cell">
                        {row.absent || row.timeOut === "-" ? "" : `${formatTimeThai(row.timeOut)}น.`}
                      </td>
                      <td className="center signature-cell">{row.absent ? "-" : ""}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {isLast && (
              <div className="attendance-sign">
                <p className="memo-sign__line">ลงชื่อ............................................................</p>
                <p className="memo-sign__name">({controller.name})</p>
                {controller.position.split("\n").filter(Boolean).map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            )}

            {pages.length > 1 && (
              <div className="page-footer">
                หน้า {toThaiDigits(pageIndex + 1)} / {toThaiDigits(pages.length)}
              </div>
            )}
          </Paper>
        );
      })}
    </>
  );
}
