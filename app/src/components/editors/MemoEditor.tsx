import { useState } from "react";
import type { AppSettings, DocumentSet, SignatoryMap } from "../../types";
import { Button, Field, Modal, DateInput, useToast } from "../ui";
import { personFullName } from "../../data/defaults";
import { getDocumentShifts, getSetStaff } from "../../lib/selectors";
import { formatDateUi, formatTimeRangeUi } from "../../lib/thai";
import { SignatoryFields } from "./SignatoryFields";

export function MemoEditor({
  set,
  settings,
  onClose,
  onSave,
}: {
  set: DocumentSet;
  settings: AppSettings;
  onClose: () => void;
  onSave: (patch: {
    memoNumber: string;
    issueDate: string;
    controllerId: string;
    signatories: SignatoryMap;
  }) => void;
}) {
  const notify = useToast();
  const staff = getSetStaff(set, settings);
  const shifts = getDocumentShifts(set, settings);
  const [memoNumber, setMemoNumber] = useState(set.memoNumber);
  const [issueDate, setIssueDate] = useState(set.issueDate);
  const [controllerId, setControllerId] = useState(set.controllerId);
  const [signatories, setSignatories] = useState<SignatoryMap>(
    structuredClone(set.signatories),
  );

  const changeController = (id: string) => {
    setControllerId(id);
    const person = staff.find((item) => item.id === id);
    if (person) {
      setSignatories((prev) => ({
        ...prev,
        controller: { name: personFullName(person), position: person.position },
      }));
    }
  };

  const save = () => {
    if (!memoNumber.trim()) {
      notify("กรุณากรอกเลขที่บันทึกข้อความ", "error");
      return;
    }
    if (!issueDate) {
      notify("กรุณาเลือกวันที่บันทึก", "error");
      return;
    }
    onSave({ memoNumber: memoNumber.trim(), issueDate, controllerId, signatories });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="แก้ไขบันทึกขออนุมัติ"
      subtitle={`ข้อมูลจะปรากฏในเอกสารไฟล์ที่ 2 · ${formatDateUi(issueDate)}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button variant="primary" onClick={save}>
            บันทึกและไปไฟล์ที่ 3
          </Button>
        </>
      }
    >
      <div className="form-grid form-grid--2">
        <Field label="เลขที่บันทึกข้อความ" required>
          <input
            className="input"
            value={memoNumber}
            onChange={(event) => setMemoNumber(event.target.value)}
          />
        </Field>
        <Field label="วันที่บันทึก" required>
          <DateInput value={issueDate} onChange={setIssueDate} />
        </Field>
        <Field label="ผู้ควบคุมการปฏิบัติงาน" required>
          <select
            className="input"
            value={controllerId}
            onChange={(event) => changeController(event.target.value)}
          >
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {personFullName(person)} — {person.position}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="editor-section">
        <div className="editor-section__head">
          <h3>ช่วงเวลาที่จะแสดงในบันทึก</h3>
          <p>ดึงจากช่วงเวรที่ตั้งค่าไว้ในระบบ</p>
        </div>
        <div className="shift-preview__list">
          {shifts.map((shift) => (
            <div key={shift.id} className="shift-pill">
              <strong>{shift.name}</strong>
              <span>{formatTimeRangeUi(shift.start, shift.end)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="editor-section">
        <div className="editor-section__head">
          <h3>ผู้ลงนาม</h3>
          <p>แก้ไขเฉพาะชุดเอกสารนี้ได้ โดยไม่กระทบค่าเริ่มต้นในหน้าตั้งค่า</p>
        </div>
        <SignatoryFields
          value={signatories}
          onChange={setSignatories}
          keys={["controller", "groupHead", "director"]}
        />
      </div>
    </Modal>
  );
}
