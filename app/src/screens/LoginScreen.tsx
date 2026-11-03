import {
  ArrowRight,
  FileCheck2,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { useApp } from "../lib/store";
import { BrandMark } from "../components/Brand";
import { Button } from "../components/ui";

export function LoginScreen() {
  const { login } = useApp();
  const handleEnter = () => {
    login();
  };

  return (
    <div className="login login--mascot login--aurora">
      <div className="auth-sky" aria-hidden="true">
        <span className="auth-orb auth-orb--1" />
        <span className="auth-orb auth-orb--2" />
        <span className="auth-orb auth-orb--3" />
        <span className="auth-cloud auth-cloud--1" />
        <span className="auth-cloud auth-cloud--2" />
        <span className="auth-cloud auth-cloud--3" />
        <span className="auth-spark auth-spark--1">✦</span>
        <span className="auth-spark auth-spark--2">✦</span>
        <span className="auth-spark auth-spark--3">✦</span>
        <span className="auth-spark auth-spark--4">✦</span>
        <span className="auth-spark auth-spark--5">✦</span>
      </div>

      <div className="auth-shell">
        <section className="auth-hero">
          <div className="auth-brand">
            <BrandMark size={58} className="auth-brand__mark" />
            <div className="auth-brand__text">
              <strong>OT-Form</strong>
              <span>ระบบเอกสารค่าตอบแทนนอกเวลาราชการ</span>
            </div>
          </div>

          <div className="auth-mascot">
            <span className="auth-mascot__halo" />
            <span className="auth-mascot__ring" />
            <div className="auth-mascot__float">
              <BrandMark size={330} className="auth-mascot__img" />
            </div>
            <span className="auth-bubble">
              <Sparkles size={14} /> เอกสารครบ 5 ไฟล์ในชุดเดียว
            </span>
          </div>

          <div className="auth-status">
            <span className="dot dot--green" /> ข้อมูลเก็บในเครื่องนี้ · ไม่เชื่อมต่ออินเทอร์เน็ต
          </div>
        </section>

        <section className="auth-card">
          <span className="auth-card__eyebrow">
            <Sparkles size={14} /> ยินดีต้อนรับ
          </span>

          <h1>
            บันทึกค่าตอบแทน
            <br />
            <em>นอกเวลาราชการ</em>
          </h1>

          <p className="auth-card__lead">
            ทำคำสั่ง บันทึกขออนุมัติ ตารางเวร ใบลงเวลา และหลักฐานการจ่ายเงิน
            ให้เสร็จในที่เดียว
          </p>

          <ul className="auth-points">
            <li>
              <span className="auth-points__icon">
                <FileCheck2 size={18} />
              </span>
              <div>
                <strong>ครบ 5 เอกสาร</strong>
                <small>คำสั่ง · บันทึก · ตารางเวร · ลงเวลา · จ่ายเงิน</small>
              </div>
            </li>
            <li>
              <span className="auth-points__icon">
                <WalletCards size={18} />
              </span>
              <div>
                <strong>คำนวณค่าตอบแทนอัตโนมัติ</strong>
                <small>คิดชั่วโมงและยอดจ่ายจากตารางเวรจริง</small>
              </div>
            </li>
            <li>
              <span className="auth-points__icon">
                <ShieldCheck size={18} />
              </span>
              <div>
                <strong>ปลอดภัยในเครื่อง</strong>
                <small>ไม่ต้องใช้รหัสผ่าน และไม่ส่งข้อมูลออกนอกเครื่อง</small>
              </div>
            </li>
          </ul>

          <Button size="lg" variant="primary" className="auth-enter" onClick={handleEnter}>
            เข้าใช้งาน <ArrowRight size={18} />
          </Button>
          <span className="auth-hint">เข้าใช้งานได้ทันที · ไม่ต้องใช้รหัสผ่าน</span>
        </section>
      </div>
    </div>
  );
}
