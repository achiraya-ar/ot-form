import { useState } from "react";
import type { AppSettings, DocumentSet, SignatoryMap } from "../../types";
import { Button, Field, Modal, DateInput, useToast } from "../ui";
import { personFullName } from "../../data/defaults";
import { getSetStaff } from "../../lib/selectors";
import { formatDateUi, toArabicDigits } from "../../lib/thai";

export function OrderEditor({
  set,
  settings,
  onClose,
  onSave,
}: {
  set: DocumentSet;
  settings: AppSettings;
  onClose: () => void;
  onSave: (patch: {
    orderNumber: string;
    issueDate: string;
    controllerId: string;
    signatories: SignatoryMap;
  }) => void;
}) {
  const notify = useToast();
  const staff = getSetStaff(set, settings);
  const initialPrefix =
    toArabicDigits(set.orderNumber).replace(/\/\s*\d{4}\s*$/, "") || ".......";
  const [orderPrefix, setOrderPrefix] = useState(initialPrefix);
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
    if (!issueDate) {
      notify("กรุณาเลือกวันที่ออกคำสั่ง", "error");
      return;
    }
    onSave({
      orderNumber: `${orderPrefix.trim() || "......."}/${set.year}`,
      issueDate,
      controllerId,
      signatories,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="แก้ไขคำสั่งแต่งตั้ง"
      subtitle={`ข้อมูลจะปรากฏในเอกสารไฟล์ที่ 1 · ${formatDateUi(issueDate)}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button variant="primary" onClick={save}>
            บันทึกและไปไฟล์ที่ 2
          </Button>
        </>
      }
    >
      <div className="form-grid form-grid--2">
        <Field
          label="เลขที่คำสั่ง"
          hint="ปี พ.ศ. ต่อท้ายอัตโนมัติ เลขด้านหน้าสามารถกรอกภายหลังได้"
          required
        >
          <div className="order-number-field">
            <input
              className="input"
              value={orderPrefix}
              onChange={(event) => setOrderPrefix(event.target.value)}
              placeholder="......."
            />
            <span>/{set.year}</span>
          </div>
        </Field>
        <Field label="วันที่ออกคำสั่ง" required>
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
          <h3>ผู้ลงนามในคำสั่ง</h3>
          <p>ชื่อและตำแหน่งจะแสดงท้ายเอกสาร</p>
        </div>
        <div className="form-grid form-grid--2">
          <Field label="ชื่อผู้อำนวยการ">
            <input
              className="input"
              value={signatories.director.name}
              onChange={(event) =>
                setSignatories({
                  ...signatories,
                  director: { ...signatories.director, name: event.target.value },
                })
              }
            />
          </Field>
          <Field label="ตำแหน่งผู้อำนวยการ" hint="ขึ้นบรรทัดใหม่ได้">
            <textarea
              className="input textarea"
              rows={2}
              value={signatories.director.position}
              onChange={(event) =>
                setSignatories({
                  ...signatories,
                  director: { ...signatories.director, position: event.target.value },
                })
              }
            />
          </Field>
        </div>
      </div>

      <div className="editor-note">
        ตารางรายชื่อและช่วงเวลาในคำสั่งจะดึงจาก “ตารางเวร” ในขั้นที่ 3
        หากยังไม่มีข้อมูล ตารางจะแสดงข้อความแจ้งเตือน
      </div>
    </Modal>
  );
}
