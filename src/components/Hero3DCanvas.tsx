import { useEffect, useRef } from 'react';

export function Hero3DCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    let time = 0;

    const render = () => {
      time += 0.015;

      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      const isMobile = width < 768;
      const cols = isMobile ? 16 : 28;
      const rows = isMobile ? 12 : 18;
      const spacing = isMobile ? 48 : 44;

      ctx.clearRect(0, 0, width, height);

      // Subtle ambient pointer lighting in Indigo and Cyan tones
      const radGrad = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        20,
        mouse.x,
        mouse.y,
        isMobile ? width * 0.6 : width * 0.45
      );
      radGrad.addColorStop(0, 'rgba(99, 102, 241, 0.22)');
      radGrad.addColorStop(0.4, 'rgba(6, 182, 212, 0.09)');
      radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, width, height);

      const mouseNormX = (mouse.x - width / 2) / (width / 2);
      const mouseNormY = (mouse.y - height / 2) / (height / 2);

      const focalLength = 320;
      const cameraY = -100 + mouseNormY * 40;
      const cameraAngleX = 0.58 + mouseNormY * 0.1;
      const cameraAngleY = mouseNormX * 0.18;

      const cosX = Math.cos(cameraAngleX);
      const sinX = Math.sin(cameraAngleX);
      const cosY = Math.cos(cameraAngleY);
      const sinY = Math.sin(cameraAngleY);

      const project = (x: number, y: number, z: number) => {
        const rx = x * cosY - z * sinY;
        const rz = z * cosY + x * sinY;
        const ry = (y - cameraY) * cosX - rz * sinX;
        const finalZ = rz * cosX + (y - cameraY) * sinX;

        const scale = focalLength / (focalLength + finalZ + 260);
        return {
          px: rx * scale + width / 2,
          py: ry * scale + height * 0.55,
          scale,
          visible: scale > 0 && finalZ + 260 > 0,
        };
      };

      const gridPoints: Array<Array<{ px: number; py: number; scale: number; visible: boolean }>> = [];

      for (let r = 0; r < rows; r++) {
        const rowArr = [];
        for (let c = 0; c < cols; c++) {
          const worldX = (c - cols / 2) * spacing;
          const worldZ = r * spacing;

          const distToMouse = Math.hypot(worldX - mouseNormX * 200, worldZ - (r * spacing * 0.4));
          const ripple = Math.sin(distToMouse * 0.035 - time * 1.8) * 18;
          const wave = Math.sin(c * 0.3 + time * 1.2) * 20 + Math.cos(r * 0.35 + time * 0.8) * 18;
          const elevation = wave + ripple;

          const proj = project(worldX, elevation, worldZ);
          rowArr.push(proj);
        }
        gridPoints.push(rowArr);
      }

      ctx.lineWidth = 1;

      // Crisp Cyan horizontal grid lines
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols - 1; c++) {
          const p1 = gridPoints[r][c];
          const p2 = gridPoints[r][c + 1];

          if (p1.visible && p2.visible) {
            const alpha = Math.max(0, (1 - r / rows) * 0.38 * Math.min(p1.scale, p2.scale));
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.stroke();
          }
        }
      }

      // Crisp Indigo vertical grid lines
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows - 1; r++) {
          const p1 = gridPoints[r][c];
          const p2 = gridPoints[r + 1][c];

          if (p1.visible && p2.visible) {
            const alpha = Math.max(0, (1 - r / rows) * 0.38 * Math.min(p1.scale, p2.scale));
            ctx.strokeStyle = `rgba(129, 140, 248, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-[100dvh] w-screen opacity-85"
    />
  );
}
