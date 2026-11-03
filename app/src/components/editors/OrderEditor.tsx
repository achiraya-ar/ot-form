import { useState } from "react";
import type { AppSettings, DocumentSet, SignatoryMap } from "../../types";
import { Button, Field, Modal, DateInput, useToast } from "../ui";
import { personFullName } from "../../data/defaults";
import { getSetStaff, orderBodyText, orderClosingText } from "../../lib/selectors";
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
    orderBody: string;
    orderClosing: string;
    signatories: SignatoryMap;
  }) => void;
}) {
  const notify = useToast();
  const staff = getSetStaff(set, settings);
  const autoBody = orderBodyText(set);
  const initialPrefix =
    toArabicDigits(set.orderNumber).replace(/\/\s*\d{4}\s*$/, "") || ".......";
  const [orderPrefix, setOrderPrefix] = useState(initialPrefix);
  const [issueDate, setIssueDate] = useState(set.issueDate);
  const [controllerId, setControllerId] = useState(set.controllerId);
  const [orderBody, setOrderBody] = useState(
    set.orderBody?.trim() ? set.orderBody : autoBody,
  );
  const [orderClosing, setOrderClosing] = useState(
    set.orderClosing?.trim() ? set.orderClosing : orderClosingText(set),
  );
  const [bodyEdited, setBodyEdited] = useState(Boolean(set.orderBody?.trim()));
  const [closingEdited, setClosingEdited] = useState(Boolean(set.orderClosing?.trim()));
  const [signatories, setSignatories] = useState<SignatoryMap>(
    structuredClone(set.signatories),
  );

  const changeController = (id: string) => {
    setControllerId(id);
    const person = staff.find((item) => item.id === id);
    if (person) {
      const controller = {
        name: personFullName(person),
        position: person.position,
      };
      setSignatories((prev) => ({ ...prev, controller }));
      if (!closingEdited) setOrderClosing(orderClosingText(set, controller.name));
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
      orderBody: bodyEdited ? orderBody.trim() : "",
      orderClosing: closingEdited ? orderClosing.trim() : "",
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
          <h3>ข้อความในคำสั่ง</h3>
          <p>
            แก้ไขเพิ่มเติมได้ เช่น ชื่อโครงการ — หากแก้ไข
            ระบบจะใช้ข้อความนี้แทนข้อความอัตโนมัติ
          </p>
        </div>
        <Field label="เนื้อความคำสั่ง">
          <textarea
            className="input textarea"
            rows={6}
            value={orderBody}
            onChange={(event) => {
              setOrderBody(event.target.value);
              setBodyEdited(true);
            }}
          />
        </Field>
        <div className="editor-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setOrderBody(autoBody);
              setBodyEdited(false);
            }}
          >
            ใช้ข้อความอัตโนมัติ
          </Button>
        </div>
        <Field label="ข้อความท้ายตาราง">
          <textarea
            className="input textarea"
            rows={4}
            value={orderClosing}
            onChange={(event) => {
              setOrderClosing(event.target.value);
              setClosingEdited(true);
            }}
          />
        </Field>
        <div className="editor-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setOrderClosing(orderClosingText(set, signatories.controller.name));
              setClosingEdited(false);
            }}
          >
            ใช้ข้อความอัตโนมัติ
          </Button>
        </div>
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
