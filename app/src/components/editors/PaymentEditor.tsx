import { useMemo, useState } from "react";
import { Check, Info, Wallet } from "lucide-react";
import type { AppSettings, DocumentSet, SignatoryMap } from "../../types";
import { Badge, Button, Field, Modal, DateInput, useToast } from "../ui";
import { getSetStaff, staffPayment, totalPayment } from "../../lib/selectors";
import { personFullName } from "../../data/defaults";
import {
  formatBahtUi,
  formatDateUi,
  formatMonthYearUi,
  formatNumberUi,
} from "../../lib/thai";
import { SignatoryFields } from "./SignatoryFields";

export function PaymentEditor({
  set,
  settings,
  onClose,
  onSave,
}: {
  set: DocumentSet;
  settings: AppSettings;
  onClose: () => void;
  onSave: (patch: {
    rateOverrides: Record<string, number>;
    paymentDate: string;
    signatories: SignatoryMap;
  }) => void;
}) {
  const notify = useToast();
  const staff = getSetStaff(set, settings);
  const [rates, setRates] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const person of staff) {
      map[person.id] = set.rateOverrides?.[person.id] ?? person.ratePerHour;
    }
    return map;
  });
  const [paymentDate, setPaymentDate] = useState(set.paymentDate ?? "");
  const [signatories, setSignatories] = useState<SignatoryMap>(
    structuredClone(set.signatories),
  );

  const rows = useMemo(() => {
    return staff.map((person) => {
      const base = staffPayment(set, settings, person.id);
      const rate = rates[person.id] ?? person.ratePerHour;
      const amount = Math.round(base.hours * rate * 100) / 100;
      return { person, ...base, rate, amount };
    });
  }, [staff, set, settings, rates]);

  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  const save = () => {
    if (!paymentDate) {
      notify("กรุณาเลือกวันที่จ่ายเงิน", "error");
      return;
    }
    onSave({ rateOverrides: rates, paymentDate, signatories });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="ตรวจสอบและบันทึกหลักฐานการจ่ายเงิน"
      subtitle={`${formatMonthYearUi(set.month, set.year)} · ยอดรวม ฿ ${formatBahtUi(total)}`}
      size="xl"
      footer={
        <div className="schedule-footer">
          <div className="schedule-footer__summary">
            <span>
              รวมทั้งสิ้น{" "}
              <strong>฿ {formatBahtUi(total)}</strong>
            </span>
                      </div>
          <div className="schedule-footer__actions">
            <Button variant="secondary" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button variant="primary" onClick={save}>
              <Check size={16} /> บันทึกและจบชุดเอกสาร
            </Button>
          </div>
        </div>
      }
    >
      <div className="payment-editor">
        <div className="payment-editor__head">
          <div>
            <Badge tone="green">
              <Wallet size={13} /> คำนวณจากใบลงเวลาล่าสุด
            </Badge>
            <h3>ตรวจสอบอัตราและยอดจ่ายรายคน</h3>
            <p>แก้ไขอัตราเฉพาะชุดนี้ได้ โดยไม่กระทบอัตราเริ่มต้นของพนักงาน</p>
          </div>
          <Field label="วันที่จ่ายเงิน" className="payment-date-field">
            <DateInput value={paymentDate} onChange={setPaymentDate} />
          </Field>
        </div>

        <div className="payment-table-wrap">
          <table className="payment-table">
            <thead>
              <tr>
                <th>พนักงาน</th>
                <th>ตำแหน่ง</th>
                <th>อัตรา/ชม.</th>
                <th>วัน</th>
                <th>ชั่วโมง</th>
                <th>จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.person.id}>
                  <td>
                    <strong>{personFullName(row.person)}</strong>
                  </td>
                  <td>{row.person.position}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step={0.25}
                      className="input input--rate"
                      value={rates[row.person.id] ?? row.person.ratePerHour}
                      onChange={(event) =>
                        setRates((prev) => ({
                          ...prev,
                          [row.person.id]: Number(event.target.value),
                        }))
                      }
                    />
                  </td>
                  <td className="center">{formatNumberUi(row.days)}</td>
                  <td className="center">{formatNumberUi(row.hours, 2)}</td>
                  <td className="right amount-strong">
                    {formatNumberUi(row.amount, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="right">
                  รวมจ่ายทั้งสิ้น
                </td>
                <td className="right amount-strong">{formatNumberUi(total, 2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="payment-summary-line">
          <Info size={15} />
          <span>
            วันที่จ่าย {paymentDate ? formatDateUi(paymentDate) : "ยังไม่ระบุ"}
          </span>
        </div>

        <div className="editor-section">
          <div className="editor-section__head">
            <h3>ผู้ลงนามในหลักฐานการจ่ายเงิน</h3>
            <p>ชื่อและตำแหน่งจะแสดงในเอกสารไฟล์ที่ 5</p>
          </div>
          <SignatoryFields
            value={signatories}
            onChange={setSignatories}
            keys={["controller", "payer", "financeOfficer", "director", "nursingHead", "auditor"]}
          />
        </div>
      </div>
    </Modal>
  );
}
