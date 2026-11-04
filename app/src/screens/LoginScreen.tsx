import { useEffect, useRef, useState } from "react";
import { useApp } from "../lib/store";
import { Mascot, type MascotMouth } from "../components/Brand";
import { assetUrl } from "../components/ui";

const PHRASES = [
  "ค่าตอบแทน ตรวจสอบได้",
  "เอกสารครบ 5 ไฟล์ในที่เดียว",
  "เริ่มสร้างชุดเอกสารกันเลย",
  "เดี๋ยวช่วยจัดการให้นะคะ",
  "ทำงานนอกเวลา ให้ราบรื่นทุกขั้นตอน",
];

export function LoginScreen() {
  const { login } = useApp();
  const [blinking, setBlinking] = useState(false);
  const [mouth, setMouth] = useState<MascotMouth>("smile");
  const [bubbleText, setBubbleText] = useState(PHRASES[0]);
  const [typedText, setTypedText] = useState("");
  const phraseRef = useRef(1);

  useEffect(() => {
    // Warm the frame cache so the mouth/eye changes never flash.
    [
      "mascot.svg",
      "mascot-blink.svg",
      "mascot-talk.svg",
      "mascot-talk-blink.svg",
      "mascot-grin.svg",
      "mascot-grin-blink.svg",
    ].forEach((name) => {
      const image = new Image();
      image.src = assetUrl(name);
    });
  }, []);

  useEffect(() => {
    if (!bubbleText) return;
    setTypedText("");

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedText(bubbleText.slice(0, index));
      if (index >= bubbleText.length) window.clearInterval(timer);
    }, 70);

    return () => window.clearInterval(timer);
  }, [bubbleText]);

  useEffect(() => {
    let cancelled = false;
    const timers = new Set<number>();

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          resolve();
        }, ms);
        timers.add(timer);
      });

    const blinkLoop = async () => {
      while (!cancelled) {
        await wait(2600 + Math.random() * 2400);
        if (cancelled) return;
        setBlinking(true);
        await wait(110);
        if (cancelled) return;
        setBlinking(false);

        // Occasionally a quick double blink, like a real person.
        if (Math.random() < 0.28) {
          await wait(170);
          if (cancelled) return;
          setBlinking(true);
          await wait(100);
          if (cancelled) return;
          setBlinking(false);
        }
      }
    };

    const speak = async (phrase: string) => {
      const typingMs = phrase.length * 70;
      const burstEnd = Date.now() + Math.max(2600, typingMs + 500);
      const shapes: MascotMouth[] = ["talk", "talk", "talk", "grin", "smile"];

      while (!cancelled && Date.now() < burstEnd) {
        setMouth(shapes[Math.floor(Math.random() * shapes.length)]);
        await wait(150 + Math.random() * 100);
      }

      if (cancelled) return;
      setMouth("smile");
    };

    const talkLoop = async () => {
      await wait(700);
      if (cancelled) return;
      await speak(PHRASES[0]);

      while (!cancelled) {
        await wait(5000 + Math.random() * 3000);
        if (cancelled) return;

        const phrase = PHRASES[phraseRef.current % PHRASES.length];
        phraseRef.current += 1;
        setBubbleText(phrase);
        await speak(phrase);
      }
    };

    void blinkLoop();
    void talkLoop();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const handleEnter = () => {
    login();
  };

  return (
    <div className="login-toy">
      <div className="toy-sky" aria-hidden="true">
        <span className="toy-sun" />
        <span className="toy-cloud toy-cloud--1" />
        <span className="toy-cloud toy-cloud--2" />
        <span className="toy-cloud toy-cloud--3" />
        <span className="toy-cloud toy-cloud--4" />
        <span className="toy-cloud toy-cloud--5" />
        <span className="toy-star toy-star--1">✦</span>
        <span className="toy-star toy-star--2">✦</span>
        <span className="toy-star toy-star--3">✦</span>
        <span className="toy-star toy-star--4">✦</span>
        <span className="toy-star toy-star--5">✦</span>

        <span className="toy-float toy-float--crown">
          <img src={assetUrl("toy-crown.svg")} alt="" />
        </span>
        <span className="toy-float toy-float--cash">
          <img src={assetUrl("toy-cash.svg")} alt="" />
        </span>
        <span className="toy-float toy-float--coin">
          <img src={assetUrl("toy-coin.svg")} alt="" />
        </span>
        <span className="toy-float toy-float--diamond">
          <img src={assetUrl("toy-diamond.svg")} alt="" />
        </span>
        <span className="toy-float toy-float--goldbar">
          <img src={assetUrl("toy-goldbar.svg")} alt="" />
        </span>
        <span className="toy-float toy-float--necklace">
          <img src={assetUrl("toy-necklace.svg")} alt="" />
        </span>
      </div>

      <div className="toy-scene">
        <header className="toy-brand">
          <span className="toy-wordmark" role="img" aria-label="OT-Form">
            <span className="toy-wordmark__top" aria-hidden="true">
              OT
            </span>
            <span className="toy-wordmark__banner" aria-hidden="true">
              FORM
            </span>
          </span>
        </header>

        <div className="toy-chat-slot">
          <span className="toy-chat" aria-hidden="true">
            {typedText}
            {typedText.length < bubbleText.length && (
              <span className="toy-chat__caret" />
            )}
          </span>
        </div>

        <button
          type="button"
          className="toy-mascot toy-mascot--enter"
          onClick={handleEnter}
          aria-label="เข้าใช้งาน"
        >
          <span className="toy-cloud-platform" />
          <Mascot
            size={320}
            className="toy-mascot__img"
            blink={blinking}
            mouth={mouth}
          />
        </button>

        <p className="toy-foot">© 2026 OT-Form</p>
      </div>
    </div>
  );
}
