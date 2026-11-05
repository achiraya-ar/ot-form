import type { AppSettings, DocumentSet, ShiftExchange } from "../../types";
import { personFullName } from "../../data/defaults";
import { formatDateDoc } from "../../lib/thai";
import { Button, Modal } from "../ui";
import { ExchangeRequestDocument } from "../../forms/ExchangeRequestDocument";
import { PaperStage } from "../PaperStage";

export function ExchangeRequestModal({
  set,
  settings,
  exchange,
  onClose,
}: {
  set: DocumentSet;
  settings: AppSettings;
  exchange: ShiftExchange;
  onClose: () => void;
}) {
  const original = settings.staff.find((person) => person.id === exchange.staffId);
  return (
    <Modal
      open
      onClose={onClose}
      title="ใบขอแลกเปลี่ยนเวร"
      subtitle={`${formatDateDoc(exchange.date)} · ${
        original ? personFullName(original) : "-"
      }`}
      size="xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          ปิด
        </Button>
      }
    >
      <PaperStage
        title="ใบขอแลกเปลี่ยนเวรปฏิบัติงาน"
        orientation="portrait"
        filename={`ใบขอแลกเปลี่ยนเวร_${
          original ? personFullName(original) : "employee"
        }_${exchange.date}`}
      >
        <ExchangeRequestDocument set={set} settings={settings} exchange={exchange} />
      </PaperStage>
    </Modal>
  );
}
