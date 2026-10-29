import { Check, Lock } from "lucide-react";
import type { DocumentSet, StepId } from "../types";
import { isStepUnlocked } from "../lib/store";

const STEPS: { id: StepId; label: string }[] = [
  { id: 1, label: "คำสั่งแต่งตั้ง" },
  { id: 2, label: "บันทึกขออนุมัติ" },
  { id: 3, label: "ตารางเวร" },
  { id: 4, label: "ใบลงเวลา" },
  { id: 5, label: "หลักฐานจ่ายเงิน" },
];

export function StepNav({
  set,
  current,
  onSelect,
}: {
  set: DocumentSet;
  current: StepId;
  onSelect: (step: StepId) => void;
}) {
  const currentStep = STEPS.find((step) => step.id === current) ?? STEPS[0];
  const done = set.completedSteps.length;

  return (
    <div className="stepper">
      <div className="stepper__dots" aria-label="ขั้นตอนเอกสาร">
        {STEPS.map((step, index) => {
          const completed = set.completedSteps.includes(step.id);
          const unlocked = isStepUnlocked(set, step.id);
          const active = current === step.id;
          return (
            <div key={step.id} className="stepper__dot-wrap">
              <button
                type="button"
                className={`stepper__dot ${active ? "is-active" : ""} ${
                  completed ? "is-complete" : ""
                } ${!unlocked ? "is-locked" : ""}`}
                onClick={() => unlocked && onSelect(step.id)}
                disabled={!unlocked}
                title={step.label}
                aria-current={active ? "step" : undefined}
              >
                {completed ? <Check size={13} /> : !unlocked ? <Lock size={11} /> : step.id}
              </button>
              {index < STEPS.length - 1 && <span className="stepper__line" />}
            </div>
          );
        })}
      </div>
      <div className="stepper__label">
        <strong>
          ขั้นที่ {current} จาก {STEPS.length}
        </strong>
        <span>{currentStep.label}</span>
        <small>ทำแล้ว {done} จาก {STEPS.length} ขั้น</small>
      </div>
    </div>
  );
}
