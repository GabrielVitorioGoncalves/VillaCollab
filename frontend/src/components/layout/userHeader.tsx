import { Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface NavbarProps {
  onMenuClick?: () => void;
}

const SCROLL_THRESHOLD = 20;

export function Header({ onMenuClick }: NavbarProps) {
  const [visible, setVisible] = useState(true);

  const lastScrollY = useRef(0);
  const accumulatedScroll = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const difference = currentScrollY - lastScrollY.current;

      // Sempre visível no topo
      if (currentScrollY <= 0) {
        setVisible(true);
        accumulatedScroll.current = 0;
        lastScrollY.current = currentScrollY;
        return;
      }

      // Descendo
      if (difference > 0) {
        accumulatedScroll.current += difference;

        if (accumulatedScroll.current >= SCROLL_THRESHOLD) {
          setVisible(false);
          accumulatedScroll.current = 0;
        }
      }

      // Subindo
      else if (difference < 0) {
        accumulatedScroll.current += Math.abs(difference);

        if (accumulatedScroll.current >= SCROLL_THRESHOLD) {
          setVisible(true);
          accumulatedScroll.current = 0;
        }
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={`
        fixed
        left-0
        top-0
        z-50
        h-[70px]
        w-full
        bg-white
        transition-transform
        duration-300
        ease-in-out
        ${visible ? "translate-y-0" : "-translate-y-full"}
      `}
    >
      <div className="flex h-full items-center justify-between px-6">
        <span className="text-xl font-extrabold text-text">
          A Villa
        </span>

        <button
          type="button"
          aria-label="Abrir menu"
          onClick={onMenuClick}
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            text-text
            transition-opacity
            hover:opacity-60
          "
        >
          <Menu size={28} />
        </button>
      </div>
    </header>
  );
}