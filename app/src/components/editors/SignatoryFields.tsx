import type { SignatoryKey, SignatoryMap } from "../../types";
import { Field } from "../ui";

export const SIGNATORY_LABELS: Record<SignatoryKey, string> = {
  director: "ผู้อำนวยการ / ผู้อนุมัติ",
  groupHead: "หัวหน้ากลุ่มงาน",
  controller: "ผู้ควบคุมการปฏิบัติงาน",
  nursingHead: "หัวหน้ากลุ่มการพยาบาล",
  financeOfficer: "เจ้าหน้าที่การเงิน",
  payer: "ผู้จ่ายเงิน",
  auditor: "ผู้ตรวจสอบ",
};

export function SignatoryFields({
  value,
  onChange,
  keys,
  columns = 2,
}: {
  value: SignatoryMap;
  onChange: (next: SignatoryMap) => void;
  keys?: SignatoryKey[];
  columns?: 1 | 2;
}) {
  const list = keys ?? (Object.keys(SIGNATORY_LABELS) as SignatoryKey[]);
  return (
    <div className={`signatory-fields ${columns === 1 ? "is-one-col" : ""}`}>
      {list.map((key) => (
        <div key={key} className="signatory-field">
          <div className="signatory-field__head">
            <span>{SIGNATORY_LABELS[key]}</span>
          </div>
          <Field label="ชื่อ-สกุล">
            <input
              className="input"
              value={value[key].name}
              placeholder="เว้นว่างได้หากยังไม่ระบุ"
              onChange={(event) =>
                onChange({
                  ...value,
                  [key]: { ...value[key], name: event.target.value },
                })
              }
            />
          </Field>
          <Field label="ตำแหน่ง" hint="ขึ้นบรรทัดใหม่ได้">
            <textarea
              className="input textarea"
              rows={2}
              value={value[key].position}
              onChange={(event) =>
                onChange({
                  ...value,
                  [key]: { ...value[key], position: event.target.value },
                })
              }
            />
          </Field>
        </div>
      ))}
    </div>
  );
}
