import { useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Clock,
  FileArchive,
  FileText,
  Hash,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import type { AppSettings, Person, Shift } from "../types";
import { renderNumberPattern, useApp } from "../lib/store";
import { PageHeader } from "../components/AppShell";
import {
  Badge,
  Button,
  Card,
  Field,
  IconButton,
  Modal,
  TimeInput,
  useToast,
} from "../components/ui";
import { SETTINGS_DEFAULT, newId } from "../data/defaults";
import {
  formatNumberUi,
  formatTimeRangeUi,
  shiftHours,
} from "../lib/thai";
import { SignatoryFields } from "../components/editors/SignatoryFields";

type Tab = "org" | "signatories" | "staff" | "shifts" | "numbering" | "backup";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "org", label: "หน่วยงาน", icon: <Building2 size={15} /> },
  { id: "signatories", label: "ผู้ลงนาม", icon: <ShieldCheck size={15} /> },
  { id: "staff", label: "พนักงาน", icon: <Users size={15} /> },
  { id: "shifts", label: "เวรและเวลา", icon: <Clock size={15} /> },
  { id: "numbering", label: "เลขเอกสาร", icon: <Hash size={15} /> },
  { id: "backup", label: "สำรองข้อมูล", icon: <FileArchive size={15} /> },
];

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const {
    settings,
    sets,
    updateSettings,
    resetSettings,
    exportBackup,
    importBackup,
  } = useApp();
  const notify = useToast();
  const [tab, setTab] = useState<Tab>("org");
  const [draft, setDraft] = useState<AppSettings>(() => structuredClone(settings));
  const [resetOpen, setResetOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = () => {
    if (!draft.org.hospitalName.trim()) {
      notify("กรุณากรอกชื่อโรงพยาบาล", "error");
      return;
    }
    if (draft.staff.length === 0) {
      notify("ต้องมีพนักงานอย่างน้อย 1 คน", "error");
      return;
    }
    if (!draft.shifts.some((shift) => shift.active)) {
      notify("ต้องมีช่วงเวรที่เปิดใช้งานอย่างน้อย 1 ช่วง", "error");
      return;
    }
    if (
      draft.shifts.some(
        (shift) => shift.active && (!shift.start || !shift.end || shift.name.trim() === ""),
      )
    ) {
      notify("กรุณากรอกชื่อและเวลาเริ่ม–สิ้นสุดของช่วงเวรให้ครบ", "error");
      return;
    }
    if (
      draft.staff.some(
        (person) => person.firstName.trim() === "" || person.lastName.trim() === "",
      )
    ) {
      notify("กรุณากรอกชื่อและนามสกุลพนักงานให้ครบ", "error");
      return;
    }
    updateSettings(() => structuredClone(draft));
    notify("บันทึกการตั้งค่าแล้ว");
  };

  const updateStaff = (id: string, patch: Partial<Person>) => {
    setDraft((prev) => ({
      ...prev,
      staff: prev.staff.map((person) =>
        person.id === id ? { ...person, ...patch } : person,
      ),
    }));
  };

  const addStaff = () => {
    setDraft((prev) => ({
      ...prev,
      staff: [
        ...prev.staff,
        {
          id: newId(),
          prefix: "น.ส.",
          firstName: "",
          lastName: "",
          position: "",
          ratePerHour: 0,
          active: true,
        },
      ],
    }));
  };

  const removeStaff = (id: string) => {
    const used = sets.some(
      (set) =>
        set.staffIds.includes(id) ||
        set.assignments.some((assignment) => assignment.staffId === id),
    );
    if (used) {
      updateStaff(id, { active: false });
      notify("พนักงานนี้ถูกใช้ในชุดเอกสารแล้ว จึงปิดใช้งานแทนการลบ", "info");
      return;
    }
    setDraft((prev) => ({ ...prev, staff: prev.staff.filter((person) => person.id !== id) }));
  };

  const updateShift = (id: string, patch: Partial<Shift>) => {
    setDraft((prev) => ({
      ...prev,
      shifts: prev.shifts.map((shift) =>
        shift.id === id ? { ...shift, ...patch } : shift,
      ),
    }));
  };

  const addShift = () => {
    setDraft((prev) => ({
      ...prev,
      shifts: [
        ...prev.shifts,
        {
          id: newId(),
          name: "เวรใหม่",
          start: "08:00",
          end: "16:00",
          active: true,
        },
      ],
    }));
  };

  const removeShift = (id: string) => {
    const used = sets.some((set) =>
      set.assignments.some((assignment) => assignment.shiftId === id),
    );
    if (used) {
      updateShift(id, { active: false });
      notify("ช่วงเวรนี้ถูกใช้ในชุดเอกสารแล้ว จึงปิดใช้งานแทนการลบ", "info");
      return;
    }
    setDraft((prev) => ({ ...prev, shifts: prev.shifts.filter((shift) => shift.id !== id) }));
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      await importBackup(file);
      notify("นำเข้าข้อมูลแล้ว กำลังโหลดใหม่…");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      notify(error instanceof Error ? error.message : "นำเข้าไม่สำเร็จ", "error");
    }
  };

  return (
    <div className="page page--settings">
      <PageHeader
        back={{ label: "กลับหน้าหลัก", onClick: onBack }}
        eyebrow="ตั้งค่าระบบ"
        title="ตั้งค่าข้อมูลหลักของ OT-Form"
        description="ค่าที่นี่ใช้เป็นค่าเริ่มต้นของชุดเอกสารใหม่ และแก้ไขเฉพาะชุดได้ในหน้าเอกสาร"
        actions={
          <>
            <Button variant="secondary" onClick={onBack}>
              <ArrowLeft size={16} /> ยกเลิก
            </Button>
            <Button variant="primary" onClick={save}>
              <Save size={16} /> บันทึกการตั้งค่า
            </Button>
          </>
        }
      />

      <div className="settings-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`settings-tab ${tab === item.id ? "is-active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      <div className="settings-body">
        {tab === "org" && (
          <Card className="settings-card">
            <div className="settings-card__head">
              <div>
                <span className="eyebrow">ข้อมูลหน่วยงาน</span>
                <h2>หัวเอกสารทั้ง 5 ไฟล์</h2>
                <p>ชื่อโรงพยาบาล จังหวัด งาน และกลุ่มงาน</p>
              </div>
              <Badge tone="sky">ค่าเริ่มต้น</Badge>
            </div>
            <div className="form-grid form-grid--2">
              <Field label="ชื่อโรงพยาบาล" required>
                <input
                  className="input"
                  value={draft.org.hospitalName}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      org: { ...draft.org, hospitalName: event.target.value },
                    })
                  }
                />
              </Field>
              <Field label="จังหวัด" required>
                <input
                  className="input"
                  value={draft.org.province}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      org: { ...draft.org, province: event.target.value },
                    })
                  }
                />
              </Field>
              <Field label="งาน / ฝ่าย" required>
                <input
                  className="input"
                  value={draft.org.department}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      org: { ...draft.org, department: event.target.value },
                    })
                  }
                />
              </Field>
              <Field label="ชื่องานแบบสั้น" hint="ใช้ในหัวใบลงเวลา">
                <input
                  className="input"
                  value={draft.org.departmentShort}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      org: { ...draft.org, departmentShort: event.target.value },
                    })
                  }
                />
              </Field>
              <Field label="กลุ่มงาน" required>
                <input
                  className="input"
                  value={draft.org.groupName}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      org: { ...draft.org, groupName: event.target.value },
                    })
                  }
                />
              </Field>
            </div>
            <Field label="อ้างอิงคำสั่งกระทรวงสาธารณสุข">
              <textarea
                className="input textarea"
                rows={3}
                value={draft.org.ministryRef}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    org: { ...draft.org, ministryRef: event.target.value },
                  })
                }
              />
            </Field>
            <Field label="อ้างอิงข้อบังคับการจ่ายเงิน">
              <textarea
                className="input textarea"
                rows={3}
                value={draft.org.lawRef}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    org: { ...draft.org, lawRef: event.target.value },
                  })
                }
              />
            </Field>
          </Card>
        )}

        {tab === "signatories" && (
          <Card className="settings-card">
            <div className="settings-card__head">
              <div>
                <span className="eyebrow">ผู้ลงนาม</span>
                <h2>รายชื่อและตำแหน่งผู้ลงนาม</h2>
                <p>ใช้เป็นค่าเริ่มต้นในชุดใหม่ และแก้ไขเฉพาะชุดได้</p>
              </div>
            </div>
            <SignatoryFields
              value={draft.signatories}
              onChange={(signatories) => setDraft({ ...draft, signatories })}
            />
          </Card>
        )}

        {tab === "staff" && (
          <Card className="settings-card">
            <div className="settings-card__head">
              <div>
                <span className="eyebrow">พนักงาน</span>
                <h2>รายชื่อและอัตราค่าตอบแทนรายคน</h2>
                <p>อัตราต่อชั่วโมง ใช้คำนวณในหลักฐานการจ่ายเงิน</p>
              </div>
              <Button size="sm" variant="soft" onClick={addStaff}>
                <Plus size={14} /> เพิ่มพนักงาน
              </Button>
            </div>
            <div className="staff-settings">
              <div className="staff-settings__head">
                <span>คำนำหน้า</span>
                <span>ชื่อ</span>
                <span>นามสกุล</span>
                <span>ตำแหน่ง</span>
                <span>บาท/ชม.</span>
                <span>ใช้งาน</span>
                <span />
              </div>
              {draft.staff.map((person) => (
                <div key={person.id} className="staff-settings__row">
                  <select
                    className="input"
                    value={person.prefix}
                    onChange={(event) =>
                      updateStaff(person.id, { prefix: event.target.value })
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
                      updateStaff(person.id, { firstName: event.target.value })
                    }
                  />
                  <input
                    className="input"
                    value={person.lastName}
                    onChange={(event) =>
                      updateStaff(person.id, { lastName: event.target.value })
                    }
                  />
                  <input
                    className="input"
                    value={person.position}
                    onChange={(event) =>
                      updateStaff(person.id, { position: event.target.value })
                    }
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    className="input"
                    value={person.ratePerHour}
                    onChange={(event) =>
                      updateStaff(person.id, {
                        ratePerHour: Number(event.target.value),
                      })
                    }
                  />
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={person.active}
                      onChange={(event) =>
                        updateStaff(person.id, { active: event.target.checked })
                      }
                    />
                    <span />
                  </label>
                  <IconButton label="ลบพนักงาน" onClick={() => removeStaff(person.id)}>
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              ))}
            </div>
            <p className="settings-hint">
              พนักงานที่ถูกใช้ในชุดเอกสารแล้วจะถูกปิดใช้งานแทนการลบ เพื่อรักษาข้อมูลเอกสารย้อนหลัง
            </p>
          </Card>
        )}

        {tab === "shifts" && (
          <Card className="settings-card">
            <div className="settings-card__head">
              <div>
                <span className="eyebrow">เวรและเวลา</span>
                <h2>ช่วงเวลาปฏิบัติงานนอกเวลา</h2>
                <p>เพิ่มได้หลายช่วง ระบบคำนวณชั่วโมงจากเวลาเริ่ม–สิ้นสุด</p>
              </div>
              <Button size="sm" variant="soft" onClick={addShift}>
                <Plus size={14} /> เพิ่มช่วงเวร
              </Button>
            </div>
            <div className="shift-settings">
              <div className="shift-settings__head">
                <span>ชื่อเวร</span>
                <span>เวลาเริ่ม</span>
                <span>เวลาสิ้นสุด</span>
                <span>ชั่วโมง</span>
                <span>ใช้งาน</span>
                <span />
              </div>
              {draft.shifts.map((shift) => (
                <div key={shift.id} className="shift-settings__row">
                  <input
                    className="input"
                    value={shift.name}
                    onChange={(event) =>
                      updateShift(shift.id, { name: event.target.value })
                    }
                  />
                  <TimeInput
                    value={shift.start}
                    onChange={(value) => updateShift(shift.id, { start: value })}
                  />
                  <TimeInput
                    value={shift.end}
                    onChange={(value) => updateShift(shift.id, { end: value })}
                  />
                  <span className="shift-settings__hours">
                    {formatNumberUi(shiftHours(shift.start, shift.end))} ชม.
                  </span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={shift.active}
                      onChange={(event) =>
                        updateShift(shift.id, { active: event.target.checked })
                      }
                    />
                    <span />
                  </label>
                  <IconButton label="ลบช่วงเวร" onClick={() => removeShift(shift.id)}>
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              ))}
            </div>
            <div className="shift-preview">
              <div className="shift-preview__head">
                <span>ตัวอย่างช่วงเวลาที่จะแสดงในเอกสาร</span>
              </div>
              <div className="shift-preview__list">
                {draft.shifts
                  .filter((shift) => shift.active)
                  .map((shift) => (
                    <div key={shift.id} className="shift-pill">
                      <strong>{shift.name}</strong>
                      <span>{formatTimeRangeUi(shift.start, shift.end)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </Card>
        )}

        {tab === "numbering" && (
          <Card className="settings-card">
            <div className="settings-card__head">
              <div>
                <span className="eyebrow">เลขเอกสาร</span>
                <h2>รูปแบบเลขที่และลำดับอัตโนมัติ</h2>
                <p>ใช้ token {"{run}"}, {"{year}"}, {"{month}"} หรือ {"{monthName}"}</p>
              </div>
            </div>
            <div className="form-grid form-grid--2">
              <Field label="รูปแบบเลขที่คำสั่ง" hint="เช่น ......./{year} หรือ {run}/{year}">
                <input
                  className="input"
                  value={draft.numbering.orderPattern}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      numbering: {
                        ...draft.numbering,
                        orderPattern: event.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="รูปแบบเลขที่บันทึก" hint="เช่น ลบ0033.302/{run}/พิเศษ">
                <input
                  className="input"
                  value={draft.numbering.memoPattern}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      numbering: {
                        ...draft.numbering,
                        memoPattern: event.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="ลำดับถัดไปของคำสั่ง">
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={draft.numbering.nextOrder}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      numbering: {
                        ...draft.numbering,
                        nextOrder: Number(event.target.value),
                      },
                    })
                  }
                />
              </Field>
              <Field label="ลำดับถัดไปของบันทึก">
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={draft.numbering.nextMemo}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      numbering: {
                        ...draft.numbering,
                        nextMemo: Number(event.target.value),
                      },
                    })
                  }
                />
              </Field>
            </div>
            <div className="number-preview">
              <div>
                <span>ตัวอย่างเลขที่คำสั่ง</span>
                <strong>
                  {renderNumberPattern(draft.numbering.orderPattern, {
                    run: draft.numbering.nextOrder,
                    year: new Date().getFullYear() + 543,
                    month: new Date().getMonth() + 1,
                  })}
                </strong>
              </div>
              <div>
                <span>ตัวอย่างเลขที่บันทึก</span>
                <strong>
                  {renderNumberPattern(draft.numbering.memoPattern, {
                    run: draft.numbering.nextMemo,
                    year: new Date().getFullYear() + 543,
                    month: new Date().getMonth() + 1,
                  })}
                </strong>
              </div>
            </div>
          </Card>
        )}

        {tab === "backup" && (
          <div className="backup-grid">
            <Card className="settings-card">
              <div className="settings-card__head">
                <div>
                  <span className="eyebrow">สำรองข้อมูล</span>
                  <h2>ไฟล์ JSON เดียวเก็บทุกชุด</h2>
                  <p>ใช้ย้ายเครื่องหรือกู้คืนเมื่อเปลี่ยนอุปกรณ์</p>
                </div>
                <FileArchive size={24} />
              </div>
              <div className="backup-stats">
                <div>
                  <span>ชุดเอกสาร</span>
                  <strong>{formatNumberUi(sets.length)} ชุด</strong>
                </div>
                <div>
                  <span>พนักงาน</span>
                  <strong>{formatNumberUi(draft.staff.length)} คน</strong>
                </div>
                <div>
                  <span>ช่วงเวร</span>
                  <strong>{formatNumberUi(draft.shifts.length)} ช่วง</strong>
                </div>
              </div>
              <div className="backup-actions">
                <Button variant="primary" onClick={exportBackup}>
                  <FileArchive size={16} /> ดาวน์โหลดไฟล์สำรอง
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(event) => {
                    void handleImport(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                  <FileText size={16} /> นำเข้าไฟล์สำรอง
                </Button>
              </div>
              <div className="backup-warning">
                การนำเข้าไฟล์สำรองจะแทนที่ชุดเอกสารและค่าตั้งค่าทั้งหมดในเครื่องนี้
              </div>
            </Card>

            <Card className="settings-card">
              <div className="settings-card__head">
                <div>
                  <span className="eyebrow">รีเซ็ต</span>
                  <h2>คืนค่าเริ่มต้นของระบบ</h2>
                  <p>ล้างค่าตั้งค่า แต่ไม่ลบชุดเอกสารที่บันทึกไว้</p>
                </div>
                <RotateCcw size={24} />
              </div>
              <p className="settings-hint">
                ใช้เมื่อต้องการเริ่มต้นรายชื่อพนักงาน เวร ผู้ลงนาม และเลขเอกสารใหม่
                จากค่าตัวอย่างของโรงพยาบาล
              </p>
              <Button variant="danger" onClick={() => setResetOpen(true)}>
                <RotateCcw size={16} /> คืนค่าเริ่มต้น
              </Button>
            </Card>

            <Card className="settings-card about-card">
              <div className="settings-card__head">
                <div>
                  <span className="eyebrow">เกี่ยวกับโปรแกรม</span>
                  <h2>OT-Form</h2>
                  <p>เวอร์ชัน 0.1.0 · เอกสารค่าตอบแทนนอกเวลาราชการ</p>
                </div>
              </div>
              <p>
                ออกแบบให้ทำงานในเครื่อง ไม่เชื่อมต่อ HOSxP และไม่เก็บข้อมูลผู้ป่วย
                เหมาะสำหรับงานเอกสารของกลุ่มงานการแพทย์แผนไทย
              </p>
            </Card>
          </div>
        )}
      </div>

      <div className="settings-savebar">
        <span>แก้ไขล่าสุดในหน้าตั้งค่า · อย่าลืมกดบันทึก</span>
        <Button variant="primary" onClick={save}>
          <Save size={16} /> บันทึกการตั้งค่า
        </Button>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="คืนค่าเริ่มต้นการตั้งค่า?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetSettings();
                setDraft(structuredClone(SETTINGS_DEFAULT));
                setResetOpen(false);
                notify("คืนค่าเริ่มต้นการตั้งค่าแล้ว", "info");
              }}
            >
              คืนค่าเริ่มต้น
            </Button>
          </>
        }
      >
        <p className="modal-copy">
          รายชื่อพนักงาน เวร ผู้ลงนาม เลขเอกสาร และผู้ใช้งาน จะกลับไปเป็นค่าตัวอย่าง
          ชุดเอกสารที่บันทึกไว้จะยังอยู่ แต่หากชุดเดิมใช้พนักงานหรือช่วงเวรที่กำหนดเอง
          เอกสารอาจแสดงข้อมูลไม่ครบ แนะนำให้สำรองข้อมูลก่อน
        </p>
      </Modal>
    </div>
  );
}
