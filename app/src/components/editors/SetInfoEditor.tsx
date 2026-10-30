import { useState } from "react";
import type { AppSettings, DocumentSet, OrgInfo } from "../../types";
import { Button, Field, Modal, DateInput, useToast } from "../ui";
import { getSetStaff } from "../../lib/selectors";
import { personFullName } from "../../data/defaults";
import { formatMonthYearUi, formatNumberUi, toArabicDigits } from "../../lib/thai";

export function SetInfoEditor({
  set,
  settings,
  onClose,
  onSave,
}: {
  set: DocumentSet;
  settings: AppSettings;
  onClose: () => void;
  onSave: (patch: {
    title: string;
    issueDate: string;
    orderNumber: string;
    memoNumber: string;
    controllerId: string;
    org: OrgInfo;
  }) => void;
}) {
  const notify = useToast();
  const staff = getSetStaff(set, settings);
  const [title, setTitle] = useState(set.title);
  const [issueDate, setIssueDate] = useState(set.issueDate);
  const [orderNumber, setOrderNumber] = useState(toArabicDigits(set.orderNumber));
  const [memoNumber, setMemoNumber] = useState(toArabicDigits(set.memoNumber));
  const [controllerId, setControllerId] = useState(set.controllerId);
  const [org, setOrg] = useState<OrgInfo>({ ...set.org });

  const save = () => {
    if (!title.trim() || !orderNumber.trim() || !memoNumber.trim()) {
      notify("กรุณากรอกชื่อชุด เลขที่คำสั่ง และเลขที่บันทึกให้ครบ", "error");
      return;
    }
    if (!issueDate) {
      notify("กรุณาเลือกวันที่ออกเอกสาร", "error");
      return;
    }
    onSave({
      title: title.trim(),
      issueDate,
      orderNumber: orderNumber.trim(),
      memoNumber: memoNumber.trim(),
      controllerId,
      org,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="ข้อมูลชุดเอกสาร"
      subtitle={`${formatMonthYearUi(set.month, set.year)} · ${formatNumberUi(
        set.selectedDates.length,
      )} วัน`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button variant="primary" onClick={save}>
            บันทึกข้อมูลชุด
          </Button>
        </>
      }
    >
      <div className="form-grid form-grid--2">
        <Field label="ชื่อชุดเอกสาร" required className="span-2">
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field label="วันที่ออกเอกสาร" required>
          <DateInput value={issueDate} onChange={setIssueDate} />
        </Field>
        <Field label="ผู้ควบคุมการปฏิบัติงาน" required>
          <select
            className="input"
            value={controllerId}
            onChange={(event) => setControllerId(event.target.value)}
          >
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {personFullName(person)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เลขที่คำสั่ง" required>
          <input
            className="input"
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
          />
        </Field>
        <Field label="เลขที่บันทึกข้อความ" required>
          <input
            className="input"
            value={memoNumber}
            onChange={(event) => setMemoNumber(event.target.value)}
          />
        </Field>
        <Field label="ชื่อโรงพยาบาล" required>
          <input
            className="input"
            value={org.hospitalName}
            onChange={(event) => setOrg({ ...org, hospitalName: event.target.value })}
          />
        </Field>
        <Field label="จังหวัด" required>
          <input
            className="input"
            value={org.province}
            onChange={(event) => setOrg({ ...org, province: event.target.value })}
          />
        </Field>
        <Field label="งาน / ฝ่าย" required>
          <input
            className="input"
            value={org.department}
            onChange={(event) => setOrg({ ...org, department: event.target.value })}
          />
        </Field>
        <Field label="ชื่องานแบบสั้น" hint="ใช้ในหัวใบลงเวลา">
          <input
            className="input"
            value={org.departmentShort ?? ""}
            onChange={(event) => setOrg({ ...org, departmentShort: event.target.value })}
          />
        </Field>
        <Field label="กลุ่มงาน" required>
          <input
            className="input"
            value={org.groupName}
            onChange={(event) => setOrg({ ...org, groupName: event.target.value })}
          />
        </Field>
      </div>

      <div className="editor-section">
        <div className="editor-section__head">
          <h3>ข้อความอ้างอิง</h3>
          <p>ใช้ในคำสั่งแต่งตั้งและบันทึกข้อความ</p>
        </div>
        <Field label="คำสั่งกระทรวงสาธารณสุข">
          <textarea
            className="input textarea"
            rows={3}
            value={org.ministryRef}
            onChange={(event) => setOrg({ ...org, ministryRef: event.target.value })}
          />
        </Field>
        <Field label="ข้อบังคับการจ่ายเงิน">
          <textarea
            className="input textarea"
            rows={3}
            value={org.lawRef}
            onChange={(event) => setOrg({ ...org, lawRef: event.target.value })}
          />
        </Field>
      </div>

      <div className="editor-note">
        ต้องการเปลี่ยนเดือนหรือวันที่ปฏิบัติงาน ควรสร้างชุดใหม่เพื่อไม่ให้วันที่และตารางเวรเดิมขัดกัน
      </div>
    </Modal>
  );
}
