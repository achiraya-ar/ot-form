import type { AppSettings, DocumentSet, ShiftExchange } from "../types";
import { Paper } from "../components/PaperStage";
import { getSetExchangeSettings, getSetPerson, getSetShift } from "../lib/selectors";
import { personFullName } from "../data/defaults";
import {
  formatTimeDoc,
  parseIsoDate,
  THAI_MONTHS,
  toThaiDigits,
} from "../lib/thai";

function dateParts(iso: string) {
  const date = parseIsoDate(iso);
  return {
    day: toThaiDigits(date.getDate()),
    month: THAI_MONTHS[date.getMonth()],
    year: toThaiDigits(date.getFullYear() + 543),
  };
}

function inlinePosition(position: string): string {
  return position.split("\n").join(" ");
}

export function ExchangeRequestDocument({
  set,
  settings,
  exchange,
}: {
  set: DocumentSet;
  settings: AppSettings;
  exchange: ShiftExchange;
}) {
  const original = getSetPerson(set, settings, exchange.staffId);
  const replacement = exchange.replacementStaffId
    ? getSetPerson(set, settings, exchange.replacementStaffId)
    : undefined;
  const shift = getSetShift(set, settings, exchange.shiftId);
  const exchangeSettings = getSetExchangeSettings(set, settings);
  const approver =
    set.signatories[exchangeSettings.approverKey] ?? set.signatories.groupHead;
  const approvalText = exchangeSettings.approvalText.trim() || "อนุญาต";
  const requestDate = dateParts(exchange.requestDate);
  const approvalDate = exchange.approvalDate
    ? dateParts(exchange.approvalDate)
    : null;
  const exchangeDate = dateParts(exchange.date);
  const originalName = original ? personFullName(original) : "-";
  const originalPosition = original ? inlinePosition(original.position) : "-";
  const replacementName = replacement ? personFullName(replacement) : "-";
  const replacementPosition = replacement
    ? inlinePosition(replacement.position)
    : "-";

  return (
    <Paper className="doc doc--exchange">
      <h1 className="exchange-doc__title">ใบขอแลกเปลี่ยนเวรปฏิบัติงาน</h1>

      <p className="exchange-doc__hospital">{set.org.hospitalName}</p>

      <p className="exchange-doc__date-line">
        <span>วันที่</span>
        <span className="exchange-doc__dots is-day">{requestDate.day}</span>
        <span>เดือน</span>
        <span className="exchange-doc__dots is-month">{requestDate.month}</span>
        <span>พ.ศ.</span>
        <span className="exchange-doc__dots is-year">{requestDate.year}</span>
      </p>

      <div className="exchange-doc__body">
        <p className="exchange-doc__line">
          <strong>เรื่อง</strong>
          <span>ขอแลกเปลี่ยนเวรปฏิบัติงาน</span>
        </p>
        <p className="exchange-doc__line">
          <strong>เรียน</strong>
          <span>ผู้อำนวยการ{set.org.hospitalName}</span>
        </p>

        <p className="exchange-doc__field-line exchange-doc__indent">
          <span>ข้าพเจ้า</span>
          <span className="exchange-doc__dots is-name">{originalName}</span>
          <span>ตำแหน่ง</span>
          <span className="exchange-doc__dots is-position">{originalPosition}</span>
        </p>

        <p className="exchange-doc__field-line">
          <span>ขอแลกเปลี่ยนเวรจาก วันที่</span>
          <span className="exchange-doc__dots is-day">{exchangeDate.day}</span>
          <span>เดือน</span>
          <span className="exchange-doc__dots is-month">{exchangeDate.month}</span>
          <span>พ.ศ.</span>
          <span className="exchange-doc__dots is-year">{exchangeDate.year}</span>
          {shift && (
            <>
              <span>เวลา</span>
              <span className="exchange-doc__dots is-time-start">
                {formatTimeDoc(shift.start)}
              </span>
              <span>น. ถึง</span>
              <span className="exchange-doc__dots is-time-end">
                {formatTimeDoc(shift.end)}
              </span>
              <span>น.</span>
            </>
          )}
        </p>

        <p className="exchange-doc__field-line">
          <span>เนื่องจาก</span>
          <span className="exchange-doc__dots is-reason">
            {exchange.reason.trim()}
          </span>
        </p>

        <p className="exchange-doc__field-line">
          <span>โดยมอบให้</span>
          <span className="exchange-doc__dots is-name">{replacementName}</span>
          <span>ตำแหน่ง</span>
          <span className="exchange-doc__dots is-position">{replacementPosition}</span>
        </p>

        <p className="exchange-doc__line">
          <span>ปฏิบัติงานแทนในเวรตามวันและเวลาดังกล่าว</span>
        </p>

        <p className="exchange-doc__center">
          จึงเรียนมาเพื่อทราบ และพิจารณาอนุมัติ
        </p>
      </div>

      <div className="exchange-doc__signature">
        <p className="exchange-doc__signature-line">
          <span>ลงชื่อ</span>
          <span className="exchange-doc__dots" />
          <span>ผู้ขอแลกเปลี่ยน</span>
        </p>
        <p className="exchange-doc__signature-name">({originalName})</p>
        <p className="exchange-doc__signature-line is-position">
          <span>ตำแหน่ง</span>
          <span className="exchange-doc__dots">{originalPosition}</span>
        </p>
      </div>

      <div className="exchange-doc__signature exchange-doc__signature--replacement">
        <p className="exchange-doc__signature-line">
          <span>ลงชื่อ</span>
          <span className="exchange-doc__dots">
            {replacement ? "" : "-"}
          </span>
          <span>ผู้ปฏิบัติงานแทน</span>
        </p>
        <p className="exchange-doc__signature-name">
          {replacement
            ? `(${replacementName})`
            : `(${"\u00A0".repeat(14)}-${"\u00A0".repeat(14)})`}
        </p>
        <p className="exchange-doc__signature-line is-position">
          <span>ตำแหน่ง</span>
          <span className="exchange-doc__dots">
            {replacement ? replacementPosition : "-"}
          </span>
        </p>
      </div>

      <p className="exchange-doc__approve">{approvalText}</p>

      <div className="exchange-doc__signature exchange-doc__signature--approval">
        <p className="exchange-doc__signature-line">
          <span>ลงชื่อ</span>
          <span className="exchange-doc__dots" />
        </p>
        <p className="exchange-doc__signature-name">({approver.name})</p>
        {approver.position
          .split("\n")
          .filter(Boolean)
          .map((line) => (
            <p key={line} className="exchange-doc__signature-position">
              {line}
            </p>
          ))}
        <p className="exchange-doc__signature-line is-date">
          <span>วันที่</span>
          <span className="exchange-doc__dots is-day">{approvalDate?.day}</span>
          <span>เดือน</span>
          <span className="exchange-doc__dots is-month">{approvalDate?.month}</span>
          <span>พ.ศ.</span>
          <span className="exchange-doc__dots is-year">{approvalDate?.year}</span>
        </p>
      </div>
    </Paper>
  );
}
