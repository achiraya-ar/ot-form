import { useState } from "react";
import type {
  AppSettings,
  DocumentSet,
  ExchangeSettings,
  OrgInfo,
  Person,
  Shift,
} from "../../types";
import { Button, Field, Modal, DateInput, TimeInput, useToast } from "../ui";
import { getSetExchangeSettings, getSetShiftPool, getSetStaff } from "../../lib/selectors";
import { personFullName } from "../../data/defaults";
import {
  formatMonthYearUi,
  formatNumberUi,
  shiftHours,
  toArabicDigits,
} from "../../lib/thai";

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
    exchange: ExchangeSettings;
    staff: Person[];
    shifts: Shift[];
  }) => void;
}) {
  const notify = useToast();
  const [title, setTitle] = useState(set.title);
  const [issueDate, setIssueDate] = useState(set.issueDate);
  const [orderNumber, setOrderNumber] = useState(toArabicDigits(set.orderNumber));
  const [memoNumber, setMemoNumber] = useState(toArabicDigits(set.memoNumber));
  const [controllerId, setControllerId] = useState(set.controllerId);
  const [org, setOrg] = useState<OrgInfo>({ ...set.org });
  const [exchange, setExchange] = useState<ExchangeSettings>(() =>
    getSetExchangeSettings(set, settings),
  );
  const [staffRows, setStaffRows] = useState<Person[]>(() =>
    getSetStaff(set, settings).map((person) => ({ ...person })),
  );
  const [shiftRows, setShiftRows] = useState<Shift[]>(() =>
    getSetShiftPool(set, settings).map((shift) => ({ ...shift })),
  );

  const updateStaffRow = (id: string, patch: Partial<Person>) => {
    setStaffRows((prev) =>
      prev.map((person) => (person.id === id ? { ...person, ...patch } : person)),
    );
  };

  const updateShiftRow = (id: string, patch: Partial<Shift>) => {
    setShiftRows((prev) =>
      prev.map((shift) => (shift.id === id ? { ...shift, ...patch } : shift)),
    );
  };

  const save = () => {
    if (!title.trim() || !orderNumber.trim() || !memoNumber.trim()) {
      notify("กรุณากรอกชื่อชุด เลขที่คำสั่ง และเลขที่บันทึกให้ครบ", "error");
      return;
    }
    if (!issueDate) {
      notify("กรุณาเลือกวันที่ออกเอกสาร", "error");
      return;
    }
    if (!org.hospitalName.trim() || !org.province.trim()) {
      notify("กรุณากรอกชื่อโรงพยาบาลและจังหวัด", "error");
      return;
    }
    if (
      staffRows.some(
        (person) => !person.firstName.trim() || !person.lastName.trim(),
      )
    ) {
      notify("กรุณากรอกชื่อและนามสกุลพนักงานให้ครบ", "error");
      return;
    }
    if (
      shiftRows.some(
        (shift) => !shift.name.trim() || !shift.start || !shift.end,
      )
    ) {
      notify("กรุณากรอกชื่อและเวลาเวรให้ครบ", "error");
      return;
    }
    onSave({
      title: title.trim(),
      issueDate,
      orderNumber: orderNumber.trim(),
      memoNumber: memoNumber.trim(),
      controllerId,
      org,
      exchange,
      staff: staffRows,
      shifts: shiftRows,
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
            {staffRows.map((person) => (
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
        <Field
          label="ชื่องานแบบสั้น"
          hint="ใช้ในคำสั่งแต่งตั้งและหัวใบลงเวลา"
        >
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
          <p>
            ใช้ในคำสั่งแต่งตั้งและบันทึกข้อความ แก้เลขที่หนังสือ วันที่
            และชื่อเรื่องอ้างอิงได้เมื่อมีการเปลี่ยนแปลง
          </p>
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

      <div className="editor-section">
        <div className="editor-section__head">
          <h3>พนักงานในชุดนี้</h3>
          <p>แก้ไขชื่อและตำแหน่งเฉพาะชุดนี้ ไม่กระทบค่าเริ่มต้นในหน้าตั้งค่า</p>
        </div>
        <div className="set-staff-edit">
          <div className="set-staff-edit__head">
            <span>คำนำหน้า</span>
            <span>ชื่อ</span>
            <span>นามสกุล</span>
            <span>ตำแหน่ง</span>
          </div>
          {staffRows.map((person) => (
            <div key={person.id} className="set-staff-edit__row">
              <select
                className="input"
                value={person.prefix}
                onChange={(event) =>
                  updateStaffRow(person.id, { prefix: event.target.value })
                }
              >
                <option>นาย</option>
                <option>นาง</option>
                <option>นางสาว</option>
                <option>น.ส.</option>
              </select>
              <input
                className="input"
                value={person.firstName}
                onChange={(event) =>
                  updateStaffRow(person.id, { firstName: event.target.value })
                }
              />
              <input
                className="input"
                value={person.lastName}
                onChange={(event) =>
                  updateStaffRow(person.id, { lastName: event.target.value })
                }
              />
              <input
                className="input"
                value={person.position}
                onChange={(event) =>
                  updateStaffRow(person.id, { position: event.target.value })
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="editor-section">
        <div className="editor-section__head">
          <h3>เวลาเวรของชุดนี้</h3>
          <p>แก้ไขชื่อและเวลาเวรเฉพาะชุดนี้ ไม่กระทบค่าเริ่มต้นในหน้าตั้งค่า</p>
        </div>
        <div className="set-shift-edit">
          <div className="set-shift-edit__head">
            <span>ชื่อเวร</span>
            <span>เวลาเริ่ม</span>
            <span>เวลาสิ้นสุด</span>
            <span>ชั่วโมง</span>
          </div>
          {shiftRows.map((shift) => (
            <div key={shift.id} className="set-shift-edit__row">
              <input
                className="input"
                value={shift.name}
                onChange={(event) =>
                  updateShiftRow(shift.id, { name: event.target.value })
                }
              />
              <TimeInput
                value={shift.start}
                onChange={(value) => updateShiftRow(shift.id, { start: value })}
              />
              <TimeInput
                value={shift.end}
                onChange={(value) => updateShiftRow(shift.id, { end: value })}
              />
              <span className="set-shift-edit__hours">
                {formatNumberUi(shiftHours(shift.start, shift.end))} ชม.
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="editor-section">
        <div className="editor-section__head">
          <h3>ใบแลกเปลี่ยนเวร</h3>
          <p>ค่าส่วนนี้ใช้เฉพาะใบแลกเปลี่ยนเวรของชุดนี้เท่านั้น</p>
        </div>
        <div className="form-grid form-grid--2">
          <Field label="ผู้อนุมัติ">
            <select
              className="input"
              value={exchange.approverKey}
              onChange={(event) =>
                setExchange({
                  ...exchange,
                  approverKey: event.target.value as ExchangeSettings["approverKey"],
                })
              }
            >
              <option value="groupHead">หัวหน้ากลุ่มงาน</option>
              <option value="director">ผู้อำนวยการ</option>
            </select>
          </Field>
          <Field label="ข้อความอนุมัติ">
            <input
              className="input"
              value={exchange.approvalText}
              placeholder="อนุญาต"
              onChange={(event) =>
                setExchange({ ...exchange, approvalText: event.target.value })
              }
            />
          </Field>
        </div>
      </div>

      <div className="editor-note">
        ต้องการเปลี่ยนเดือนหรือวันที่ปฏิบัติงาน ควรสร้างชุดใหม่เพื่อไม่ให้วันที่และตารางเวรเดิมขัดกัน
      </div>
    </Modal>
  );
}
