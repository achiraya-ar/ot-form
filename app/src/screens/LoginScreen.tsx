import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useApp } from "../lib/store";
import { BrandMark } from "../components/Brand";
import { Badge, Button } from "../components/ui";

export function LoginScreen() {
  const { settings, login } = useApp();
  const handleEnter = () => {
    login(settings.profiles[0]?.id ?? "default");
  };

  return (
    <div className="login login--mascot login--wealth">
      <div className="login__sky" aria-hidden="true">
        <span className="star star--1">✦</span>
        <span className="star star--2">✦</span>
        <span className="star star--3">✦</span>
        <span className="star star--4">✦</span>
        <span className="star star--5">✦</span>
        <span className="cloud cloud--1" />
        <span className="cloud cloud--2" />
        <span className="cloud cloud--3" />
        <span className="planet planet--1" />
        <span className="planet planet--2" />
      </div>

      <div className="login__landing">
        <section className="login__mascot-stage">
          <div className="login__mascot-halo" aria-hidden="true" />
          <div className="login__cloud-platform" aria-hidden="true" />

          <div className="money-note money-note--1" aria-hidden="true">
            <span>$</span>
            <small>100</small>
          </div>
          <div className="money-note money-note--2" aria-hidden="true">
            <span>$</span>
            <small>500</small>
          </div>
          <div className="money-note money-note--3" aria-hidden="true">
            <span>$</span>
            <small>1000</small>
          </div>
          <div className="gold-coin gold-coin--1" aria-hidden="true">
            $
          </div>
          <div className="gold-coin gold-coin--2" aria-hidden="true">
            $
          </div>
          <div className="gold-bar" aria-hidden="true">
            <span>999.9</span>
          </div>

          <div className="login__mascot-float">
            <BrandMark size={320} className="login__mascot" />
          </div>

          <span className="login__spark login__spark--1">✦</span>
          <span className="login__spark login__spark--2">✦</span>
          <span className="login__spark login__spark--3">✦</span>
          <span className="login__spark login__spark--4">✦</span>
        </section>

        <section className="login__landing-card">
          <div className="login__product">
            <span className="login__product-name">OT-Form</span>
            <span>ระบบเอกสารค่าตอบแทน</span>
          </div>

          <Badge tone="gold">
            <Sparkles size={13} /> เอกสารครบ ๕ ไฟล์ในชุดเดียว
          </Badge>

          <h1>
            บันทึกค่าตอบแทน
            <br />
            <span>นอกเวลาราชการ</span>
          </h1>

          <p>
            ทำคำสั่ง บันทึกขออนุมัติ ตารางเวร ใบลงเวลา
            และหลักฐานการจ่ายเงินให้เสร็จในที่เดียว
          </p>

          <div className="login__checks">
            <span>
              <Check size={14} /> ใช้งานได้ทันที
            </span>
            <span>
              <Check size={14} /> ไม่ต้องใช้รหัสผ่าน
            </span>
            <span>
              <Check size={14} /> ข้อมูลเก็บในเครื่องนี้
            </span>
          </div>

          <Button size="lg" variant="gold" className="login__enter" onClick={handleEnter}>
            เข้าใช้งาน <ArrowRight size={18} />
          </Button>
        </section>
      </div>
    </div>
  );
}
