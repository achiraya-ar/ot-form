import type { AppSettings, DocumentSet } from "../types";
import { Garuda } from "../components/Brand";
import { Paper } from "../components/PaperStage";
import {
  documentPeriodPhrase,
  getDocumentShifts,
} from "../lib/selectors";
import { formatDateDoc, formatTimeDoc, toThaiDigits } from "../lib/thai";

function splitPosition(position: string): string[] {
  return position.split("\n").filter(Boolean);
}

export function Form2Document({
  set,
  settings,
}: {
  set: DocumentSet;
  settings: AppSettings;
}) {
  const shifts = getDocumentShifts(set, settings);
  const shortTime = (time: string) => formatTimeDoc(time).replace(/^0/, "");
  const timeText = shifts
    .map((shift) => `${shortTime(shift.start)}-${shortTime(shift.end)} น.`)
    .join(" และ");
  const periodPhrase = documentPeriodPhrase(set);
  const groupHead = set.signatories.groupHead;
  const director = set.signatories.director;
  const controller = set.signatories.controller;

  return (
    <Paper className="doc doc--memo">
      <div className="memo-brand">
        <Garuda size={57} small />
        <h1>บันทึกข้อความ</h1>
      </div>

      <div className="memo-meta">
        <p className="memo-line">
          <strong>ส่วนราชการ</strong>
          <span className="memo-underline">
            {set.org.hospitalName} {set.org.groupName}
          </span>
        </p>
        <div className="memo-meta__row">
          <p className="memo-line memo-line--half">
            <strong>ที่</strong>
            <span className="memo-underline">{toThaiDigits(set.memoNumber)}</span>
          </p>
          <p className="memo-line memo-line--half">
            <strong>วันที่</strong>
            <span className="memo-underline">{formatDateDoc(set.issueDate)}</span>
          </p>
        </div>
        <p className="memo-line">
          <strong>เรื่อง</strong>
          <span className="memo-underline">ขออนุมัติขึ้นปฏิบัติงานนอกเวลาราชการ</span>
        </p>
        <p className="memo-line memo-line--plain">
          <strong>เรียน</strong> ผู้อำนวยการ{set.org.hospitalName}
        </p>
      </div>

      <p className="memo-body memo-body--indent">
        {`ด้วย${set.org.department} ${set.org.groupName} ${set.org.hospitalName} มีความประสงค์จะจัดเจ้าหน้าที่ขึ้นปฏิบัติงานนอกเวลาราชการ ${periodPhrase} โดยทำการนอกเวลาราชการ ตั้งแต่เวลา ${timeText} โดยมีเจ้าหน้าที่ปฏิบัติงาน ดังรายชื่อพร้อมตารางการปฏิบัติงานที่แนบมาพร้อมนี้`}
      </p>

      <p className="memo-body memo-body--center">
        ทั้งนี้โดยมี {controller.name} เป็นผู้ควบคุมการปฏิบัติงาน
      </p>

      <div className="memo-sign memo-sign--head">
        <p className="memo-sign__space">&nbsp;</p>
        <p>({controller.name})</p>
        {splitPosition(controller.position).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <div className="memo-approval">
        <p className="memo-line memo-line--plain">
          <strong>เรียน</strong> ผู้อำนวยการ{set.org.hospitalName}
        </p>
        <p className="memo-approval__item">- เพื่อโปรดพิจารณาอนุมัติ</p>
        <p className="memo-sign__line">ลงชื่อ............................................................</p>
        <p className="memo-sign__name">({groupHead.name})</p>
        {splitPosition(groupHead.position).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <div className="memo-sign memo-sign--director">
        <p className="memo-sign__line">ลงชื่อ..............................................................</p>
        <p className="memo-sign__name">({director.name})</p>
        {splitPosition(director.position).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </Paper>
  );
}
