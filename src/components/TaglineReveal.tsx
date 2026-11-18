import { useEffect, useRef, useState } from 'react';

export function TaglineReveal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    let rafId: number;
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const start = windowHeight * 0.85;
      const end = windowHeight * 0.35;
      const progress = Math.min(Math.max((start - rect.top) / (start - end), 0), 1);
      setScrollProgress(progress);
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [reducedMotion]);

  const statement =
    "Every keystroke commits locally before touching the network. We believe developer tools must work reliably without asking for cloud permission.";
  const words = statement.split(' ');

  return (
    <section className="w-full py-16 md:py-24 px-4 md:px-8 flex justify-center">
      <div ref={containerRef} className="max-w-[680px] mx-auto text-center">
        <p className="heading-5 md:heading-4 font-semibold leading-relaxed [text-wrap:balance]">
          {words.map((word, idx) => {
            if (reducedMotion) {
              return (
                <span key={idx} className="text-[var(--text-primary)] inline-block mr-2">
                  {word}
                </span>
              );
            }
            const threshold = idx / words.length;
            const wordProgress = Math.min(Math.max((scrollProgress - threshold) / (1 / words.length), 0), 1);
            const ease = 1 - Math.pow(1 - wordProgress, 3);
            const opacity = 0.3 + 0.7 * ease;

            return (
              <span
                key={idx}
                style={{
                  opacity,
                  transition: 'opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
                }}
                className="text-[var(--text-primary)] inline-block mr-2"
              >
                {word}
              </span>
            );
          })}
        </p>
      </div>
    </section>
  );
}
