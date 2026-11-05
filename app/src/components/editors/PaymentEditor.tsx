import { useMemo, useState } from "react";
import { Check, Info, Wallet } from "lucide-react";
import type { AppSettings, DocumentSet, SignatoryMap } from "../../types";
import { Badge, Button, Modal } from "../ui";
import { getForm5Rows, getSetStaff } from "../../lib/selectors";
import { personFullName } from "../../data/defaults";
import { formatBahtUi, formatMonthYearUi, formatNumberUi } from "../../lib/thai";
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
    signatories: SignatoryMap;
  }) => void;
}) {
  const staff = getSetStaff(set, settings);
  const [rates, setRates] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const person of staff) {
      map[person.id] = set.rateOverrides?.[person.id] ?? person.ratePerHour;
    }
    return map;
  });
  const [signatories, setSignatories] = useState<SignatoryMap>(
    structuredClone(set.signatories),
  );

  const rows = useMemo(() => {
    return getForm5Rows(set, settings).map((row, index) => {
      const rate = rates[row.staff.id] ?? row.staff.ratePerHour;
      return {
        ...row,
        key: `${row.staff.id}-${row.isReplacement ? `replacement-${index}` : "normal"}`,
        rate,
        amount: Math.round(row.totalHours * rate * 100) / 100,
      };
    });
  }, [set, settings, rates]);

  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  const save = () => {
    onSave({ rateOverrides: rates, signatories });
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
                <tr key={row.key} className={row.isReplacement ? "is-replacement" : ""}>
                  <td>
                    <strong>
                      {personFullName(row.staff)}
                      {row.isReplacement ? " (แทน)" : ""}
                    </strong>
                  </td>
                  <td>{row.staff.position}</td>
                  <td>
                    {row.isReplacement ? (
                      <span className="payment-rate-readonly">
                        {formatNumberUi(row.rate, 2)}
                      </span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        step={0.25}
                        className="input input--rate"
                        value={rates[row.staff.id] ?? row.staff.ratePerHour}
                        onChange={(event) =>
                          setRates((prev) => ({
                            ...prev,
                            [row.staff.id]: Number(event.target.value),
                          }))
                        }
                      />
                    )}
                  </td>
                  <td className="center">{formatNumberUi(row.totalDays)}</td>
                  <td className="center">{formatNumberUi(row.totalHours, 2)}</td>
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
          <span>วันที่จ่ายเงินในเอกสารจะเว้นว่างไว้ให้การเงินกรอกเอง</span>
        </div>

        <div className="editor-section">
          <div className="editor-section__head">
            <h3>ผู้ลงนามในหลักฐานการจ่ายเงิน</h3>
            <p>ชื่อและตำแหน่งจะแสดงในเอกสารไฟล์ที่ 5</p>
          </div>
          <SignatoryFields
            value={signatories}
            onChange={setSignatories}
            keys={["payer", "director"]}
          />
        </div>
      </div>
    </Modal>
  );
}
