import type { AppSettings, DocumentSet } from "../types";
import { Paper } from "../components/PaperStage";
import { getForm4Rows, type Form4Row } from "../lib/selectors";
import {
  formatDateShortDoc,
  formatMonthYearDoc,
  formatTimeDoc,
} from "../lib/thai";

interface Form4Page {
  rows: Form4Row[];
  carry: boolean;
}

function paginate(rows: Form4Row[]): Form4Page[] {
  const groups = new Map<string, Form4Row[]>();
  for (const row of rows) {
    const list = groups.get(row.date) ?? [];
    list.push(row);
    groups.set(row.date, list);
  }
  const dataPages: Form4Row[][] = [];
  let current: Form4Row[] = [];
  for (const group of groups.values()) {
    if (current.length > 0 && current.length + group.length > 27) {
      dataPages.push(current);
      current = [];
    }
    current.push(...group);
  }
  if (current.length > 0) dataPages.push(current);
  if (dataPages.length === 0) return [{ rows: [], carry: false }];

  const pages: Form4Page[] = dataPages.map((pageRows) => ({
    rows: pageRows,
    carry: false,
  }));

  // If the last page is too full for the signature, start a signature page and
  // bring the final date's rows along so the signer can see what is being signed.
  const lastPage = pages[pages.length - 1];
  const lastDate = rows[rows.length - 1]?.date;
  if (lastPage.rows.length > 18 && lastDate) {
    const carryRows = rows.filter((row) => row.date === lastDate);
    pages.push({ rows: carryRows, carry: true });
  }

  return pages;
}

function signatureName(name: string): string {
  return name.replace(/^น\.ส\./, "นางสาว");
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
  const monthLabel = formatMonthYearDoc(set.month, set.year);
  const shortDepartment = set.org.departmentShort || set.org.department;

  return (
    <>
      {pages.map((page, pageIndex) => {
        const isLast = pageIndex === pages.length - 1;
        return (
          <Paper key={pageIndex} className="doc doc--attendance">
            <div className="official-heading official-heading--portrait">
              <h1>บัญชีลงเวลาปฏิบัติงานนอกเวลาราชการ</h1>
              <p>
                {shortDepartment} {set.org.hospitalName} ประจำเดือน {monthLabel}
              </p>
            </div>

            {page.carry && <p className="carry-note">ตารางต่อเนื่อง (วันสุดท้าย)</p>}

            <table className="doc-table doc-table--attendance">
              <colgroup>
                <col style={{ width: "24mm" }} />
                <col style={{ width: "20mm" }} />
                <col style={{ width: "48mm" }} />
                <col style={{ width: "17mm" }} />
                <col style={{ width: "24mm" }} />
                <col style={{ width: "17mm" }} />
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
                {page.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="doc-empty-cell">
                      ยังไม่ได้กำหนดตารางเวรและรายชื่อผู้ปฏิบัติงาน
                    </td>
                  </tr>
                ) : (
                  page.rows.map((row) => (
                    <tr key={row.key} className={row.absent ? "is-absent" : ""}>
                      {row.showDate && (
                        <td rowSpan={row.dateSpan} className="date-cell">
                          {formatDateShortDoc(row.date)}
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
                        {!row.timeIn || row.timeIn === "-"
                          ? ""
                          : `${formatTimeDoc(row.timeIn)}น.`}
                      </td>
                      <td className="center signature-cell">{row.absent ? "-" : ""}</td>
                      <td className="center time-cell">
                        {!row.timeOut || row.timeOut === "-"
                          ? ""
                          : `${formatTimeDoc(row.timeOut)}น.`}
                      </td>
                      <td className="center signature-cell">{row.absent ? "-" : ""}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {isLast && (
              <div className="attendance-sign">
                <p className="memo-sign__line">ลงชื่อ........................................</p>
                <p className="memo-sign__name">({signatureName(controller.name)})</p>
                {controller.position.split("\n").filter(Boolean).map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            )}
          </Paper>
        );
      })}
    </>
  );
}
