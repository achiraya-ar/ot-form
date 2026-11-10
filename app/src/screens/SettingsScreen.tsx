import { useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Building2,
  Clock,
  Download,
  FileArchive,
  FileText,
  Hash,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import type { AppSettings, ExchangeSettings, Person, Shift } from "../types";
import { mergeSettings, renderNumberPattern, useApp } from "../lib/store";
import { PageHeader } from "../components/AppShell";
import {
  Badge,
  Button,
  Card,
  Field,
  IconButton,
  TimeInput,
  useToast,
} from "../components/ui";
import { newId } from "../data/defaults";
import { saveBlob } from "../lib/export/save";
import {
  formatNumberUi,
  formatTimeRangeUi,
  shiftHours,
} from "../lib/thai";
import { SignatoryFields } from "../components/editors/SignatoryFields";

type Tab = "org" | "signatories" | "staff" | "shifts" | "numbering" | "exchange" | "backup";

const TABS: {
  id: Tab;
  label: string;
  description: string;
  group: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "org",
    label: "หน่วยงาน",
    description: "ชื่อโรงพยาบาล จังหวัด และกลุ่มงาน",
    group: "ข้อมูลหลัก",
    icon: <Building2 size={16} />,
  },
  {
    id: "signatories",
    label: "ผู้ลงนาม",
    description: "ผู้อำนวยการ ผู้ควบคุม และผู้จ่ายเงิน",
    group: "ข้อมูลหลัก",
    icon: <ShieldCheck size={16} />,
  },
  {
    id: "staff",
    label: "พนักงาน",
    description: "รายชื่อและอัตราค่าตอบแทน",
    group: "ข้อมูลหลัก",
    icon: <Users size={16} />,
  },
  {
    id: "shifts",
    label: "เวรและเวลา",
    description: "ช่วงเวลาปฏิบัติงานนอกเวลา",
    group: "ข้อมูลหลัก",
    icon: <Clock size={16} />,
  },
  {
    id: "numbering",
    label: "เลขเอกสาร",
    description: "รูปแบบเลขที่และลำดับอัตโนมัติ",
    group: "เอกสาร",
    icon: <Hash size={16} />,
  },
  {
    id: "exchange",
    label: "ใบแลกเปลี่ยนเวร",
    description: "ผู้อนุมัติและข้อความอนุมัติ",
    group: "เอกสาร",
    icon: <ArrowLeftRight size={16} />,
  },
  {
    id: "backup",
    label: "สำรองข้อมูล",
    description: "สำรองข้อมูลและไฟล์ตั้งค่า",
    group: "ระบบ",
    icon: <FileArchive size={16} />,
  },
];

const TAB_GROUPS = ["ข้อมูลหลัก", "เอกสาร", "ระบบ"];

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { settings, sets, updateSettings, exportBackup, importBackup } = useApp();
  const notify = useToast();
  const [tab, setTab] = useState<Tab>("org");
  const [draft, setDraft] = useState<AppSettings>(() => structuredClone(settings));
  const fileRef = useRef<HTMLInputElement>(null);
  const settingsFileRef = useRef<HTMLInputElement>(null);
  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(settings),
    [draft, settings],
  );

  const handleBack = () => {
    if (
      isDirty &&
      !window.confirm("มีการแก้ไขที่ยังไม่บันทึก ต้องการออกจากหน้าตั้งค่าหรือไม่?")
    ) {
      return;
    }
    onBack();
  };

  const discardChanges = () => {
    setDraft(structuredClone(settings));
    notify("คืนค่าการแก้ไขที่ยังไม่บันทึกแล้ว", "info");
  };

  const save = () => {
    if (!draft.org.hospitalName.trim()) {
      setTab("org");
      notify("กรุณากรอกชื่อโรงพยาบาล", "error");
      return;
    }
    if (!draft.org.province.trim()) {
      setTab("org");
      notify("กรุณากรอกจังหวัด", "error");
      return;
    }
    if (draft.staff.length === 0) {
      setTab("staff");
      notify("ต้องมีพนักงานอย่างน้อย 1 คน", "error");
      return;
    }
    if (!draft.shifts.some((shift) => shift.active)) {
      setTab("shifts");
      notify("ต้องมีช่วงเวรที่เปิดใช้งานอย่างน้อย 1 ช่วง", "error");
      return;
    }
    if (
      draft.shifts.some(
        (shift) => shift.active && (!shift.start || !shift.end || shift.name.trim() === ""),
      )
    ) {
      setTab("shifts");
      notify("กรุณากรอกชื่อและเวลาเริ่ม–สิ้นสุดของช่วงเวรให้ครบ", "error");
      return;
    }
    if (
      draft.staff.some(
        (person) => person.firstName.trim() === "" || person.lastName.trim() === "",
      )
    ) {
      setTab("staff");
      notify("กรุณากรอกชื่อและนามสกุลพนักงานให้ครบ", "error");
      return;
    }
    updateSettings(() => structuredClone(draft));
    notify("บันทึกการตั้งค่าแล้ว");
  };

  const updateExchange = (patch: Partial<ExchangeSettings>) => {
    setDraft((prev) => ({
      ...prev,
      exchange: { ...prev.exchange, ...patch },
    }));
  };

  const exchangeApprover =
    draft.signatories[draft.exchange.approverKey] ?? draft.signatories.groupHead;

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

  const handleExportSettings = async () => {
    const payload = {
      app: "ot-form",
      kind: "settings",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: structuredClone(draft),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    try {
      await saveBlob(
        blob,
        `ot-form-settings-${new Date().toISOString().slice(0, 10)}.json`,
      );
      notify("ส่งออกการตั้งค่าแล้ว");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "ส่งออกการตั้งค่าไม่สำเร็จ",
        "error",
      );
    }
  };

  const handleSettingsImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        app?: string;
        settings?: Partial<AppSettings>;
      } & Partial<AppSettings>;
      if (parsed.app && parsed.app !== "ot-form") {
        throw new Error("ไฟล์นี้ไม่ใช่ไฟล์ของ OT-Form");
      }
      const input = parsed.settings ?? (parsed as Partial<AppSettings>);
      if (
        !input ||
        typeof input !== "object" ||
        !input.org ||
        !Array.isArray(input.staff) ||
        !Array.isArray(input.shifts) ||
        !input.signatories
      ) {
        throw new Error("ไม่พบข้อมูลการตั้งค่าที่ถูกต้องในไฟล์");
      }
      setDraft(mergeSettings(input));
      setTab("org");
      notify("นำเข้าการตั้งค่าแล้ว ตรวจสอบข้อมูลและกดบันทึกการตั้งค่า");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "นำเข้าการตั้งค่าไม่สำเร็จ",
        "error",
      );
    }
  };

  return (
    <div className="page page--settings">
      <PageHeader
        back={{ label: "กลับหน้าหลัก", onClick: handleBack }}
        eyebrow="ตั้งค่าระบบ"
        title="ตั้งค่าข้อมูลหลัก"
        description="จัดการข้อมูลหน่วยงาน ผู้ลงนาม พนักงาน และค่าเริ่มต้นของเอกสาร"
        actions={
          <>
            {isDirty && <Badge tone="gold">ยังไม่บันทึก</Badge>}
            {isDirty && (
              <Button variant="secondary" onClick={discardChanges}>
                <RotateCcw size={16} /> คืนค่า
              </Button>
            )}
            <Button variant="primary" onClick={save}>
              <Save size={16} /> บันทึกการตั้งค่า
            </Button>
          </>
        }
      />

      <div className="settings-layout">
        <aside className="settings-nav" role="tablist" aria-label="หมวดการตั้งค่า">
          {TAB_GROUPS.map((group) => (
            <div key={group} className="settings-nav__group">
              <span className="settings-nav__label">{group}</span>
              {TABS.filter((item) => item.group === group).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={`settings-nav__item ${tab === item.id ? "is-active" : ""}`}
                  onClick={() => setTab(item.id)}
                >
                  <span className="settings-nav__icon">{item.icon}</span>
                  <span className="settings-nav__text">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                </button>
              ))}
            </div>
          ))}
          <div className="settings-nav__note">
            <strong>การนำไปใช้</strong>
            <span>
              ใช้เป็นค่าเริ่มต้นของชุดใหม่ ชุดเดิมแก้ไขได้ที่ “ข้อมูลชุด”
              หรือหน้าของแต่ละเอกสาร โดยไม่ถูกเปลี่ยนย้อนหลัง
            </span>
          </div>
        </aside>

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
              <Field
                label="ชื่องานแบบสั้น"
                hint="ใช้ในคำสั่งแต่งตั้งและหัวใบลงเวลา"
              >
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
              keys={["director", "groupHead", "controller", "payer"]}
              value={draft.signatories}
              onChange={(signatories) => setDraft({ ...draft, signatories })}
            />
            <p className="settings-hint">
              ผู้อนุมัติใบแลกเปลี่ยนเวรเลือกได้ที่แท็บ “ใบแลกเปลี่ยนเวร”
              โดยใช้ชื่อและตำแหน่งจากผู้อำนวยการหรือหัวหน้ากลุ่มงาน
            </p>
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
                <p>
                  ใช้ token {"{run}"}, {"{year}"}, {"{month}"} หรือ {"{monthName}"} ·
                  ลำดับถัดไปจะใช้เมื่อรูปแบบมี {"{run}"}
                </p>
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
              {draft.numbering.orderPattern.includes("{run}") && (
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
              )}
              {draft.numbering.memoPattern.includes("{run}") && (
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
              )}
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

        {tab === "exchange" && (
          <>
            <Card className="settings-card">
              <div className="settings-card__head">
                <div>
                  <span className="eyebrow">ใบแลกเปลี่ยนเวร</span>
                  <h2>ผู้อนุมัติและข้อความอนุมัติ</h2>
                  <p>
                    ใช้เป็นค่าเริ่มต้นของชุดใหม่
                    แก้ไขเฉพาะชุดได้ที่หน้า “ข้อมูลชุด” ของแต่ละชุด
                  </p>
                </div>
                <Badge tone="sky">ค่าเริ่มต้น</Badge>
              </div>
              <div className="form-grid form-grid--2">
                <Field label="ผู้อนุมัติ" hint="ชื่อและตำแหน่งดึงจากแท็บผู้ลงนาม">
                  <select
                    className="input"
                    value={draft.exchange.approverKey}
                    onChange={(event) =>
                      updateExchange({
                        approverKey: event.target.value as ExchangeSettings["approverKey"],
                      })
                    }
                  >
                    <option value="groupHead">หัวหน้ากลุ่มงาน</option>
                    <option value="director">ผู้อำนวยการ</option>
                  </select>
                </Field>
                <Field label="ข้อความอนุมัติ" hint="ข้อความที่แสดงเหนือช่องลงชื่อผู้อนุมัติ">
                  <input
                    className="input"
                    value={draft.exchange.approvalText}
                    placeholder="อนุญาต"
                    onChange={(event) =>
                      updateExchange({ approvalText: event.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="exchange-approver">
                <div>
                  <span>ผู้ลงนามที่จะแสดงในใบ</span>
                  <strong>{exchangeApprover.name || "ยังไม่ได้ระบุชื่อ"}</strong>
                  <p>
                    {exchangeApprover.position.split("\n").join(" ") ||
                      "ยังไม่ได้ระบุตำแหน่ง"}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setTab("signatories")}
                >
                  <ShieldCheck size={14} /> แก้ไขผู้ลงนาม
                </Button>
              </div>
            </Card>

            <Card className="settings-card">
              <div className="settings-card__head">
                <div>
                  <span className="eyebrow">ตัวอย่างข้อความ</span>
                  <h2>ส่วนท้ายของใบแลกเปลี่ยนเวร</h2>
                  <p>
                    ข้อมูลผู้ขอ วันที่ เวร และผู้ปฏิบัติงานแทน
                    จะกรอกเมื่อสร้างใบแต่ละครั้ง
                  </p>
                </div>
                <FileText size={24} />
              </div>
              <div className="exchange-settings-preview">
                <p>
                  <span>เรียน</span> ผู้อำนวยการ
                  {draft.org.hospitalName || "................................"}
                </p>
                <p>
                  <span>เรื่อง</span> ขอแลกเปลี่ยนเวรปฏิบัติงาน
                </p>
                <div className="exchange-settings-preview__approval">
                  <strong>{draft.exchange.approvalText.trim() || "อนุญาต"}</strong>
                  <p>ลงชื่อ ........................................</p>
                  <em>({exchangeApprover.name || "........................................"})</em>
                  {exchangeApprover.position
                    .split("\n")
                    .filter(Boolean)
                    .map((line) => (
                      <small key={line}>{line}</small>
                    ))}
                </div>
              </div>
              <p className="settings-hint">
                สร้างใบแลกเปลี่ยนเวรได้ที่หน้า “บันทึกการเข้างาน” → แท็บ
                “ใบแลกเปลี่ยนเวร”
              </p>
            </Card>
          </>
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
                  <span className="eyebrow">เฉพาะการตั้งค่า</span>
                  <h2>นำเข้า/ส่งออกการตั้งค่า</h2>
                  <p>
                    คัดลอกหน่วยงาน ผู้ลงนาม พนักงาน เวร เลขเอกสาร
                    และค่าใบแลกเปลี่ยนเวร โดยไม่รวมชุดเอกสาร
                  </p>
                </div>
                <FileText size={24} />
              </div>
              <div className="backup-stats">
                <div>
                  <span>พนักงาน</span>
                  <strong>{formatNumberUi(draft.staff.length)} คน</strong>
                </div>
                <div>
                  <span>ช่วงเวร</span>
                  <strong>{formatNumberUi(draft.shifts.length)} ช่วง</strong>
                </div>
                <div>
                  <span>ผู้ลงนาม</span>
                  <strong>{formatNumberUi(Object.keys(draft.signatories).length)} คน</strong>
                </div>
              </div>
              <div className="backup-actions">
                <Button variant="primary" onClick={handleExportSettings}>
                  <Download size={16} /> ส่งออกการตั้งค่า
                </Button>
                <input
                  ref={settingsFileRef}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(event) => {
                    void handleSettingsImport(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={() => settingsFileRef.current?.click()}
                >
                  <Upload size={16} /> นำเข้าการตั้งค่า
                </Button>
              </div>
              <p className="settings-hint">
                ส่งออกค่าตามที่แสดงอยู่ในหน้าตั้งค่า รวมการแก้ไขที่ยังไม่บันทึก
              </p>
              <div className="backup-warning is-info">
                การนำเข้าจะแสดงค่าในหน้าตั้งค่าให้ตรวจสอบก่อน
                ยังไม่บันทึกจนกว่าจะกด “บันทึกการตั้งค่า”
                และมีผลกับชุดใหม่เท่านั้น ชุดเดิมจะไม่ถูกเปลี่ยนย้อนหลัง
              </div>
            </Card>
          </div>
        )}
        </div>
      </div>

    </div>
  );
}
