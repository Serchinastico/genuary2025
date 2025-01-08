import { prepareCanvas } from "@/common/canvas";

const CONFIG = {
  HALF_WIDTH: window.innerWidth * 0.5,
  HALF_HEIGHT: window.innerHeight * 0.5,
  WIDTH: window.innerWidth,
  HEIGHT: window.innerHeight,
  PULSE_TIME_FRAMES: 100,
  ROTATION_ANIMATION_FRAMES: 50,
};

interface CanvasAnimation {
  frame: number;
}

const render = ({ animation, context }: { animation: CanvasAnimation; context: CanvasRenderingContext2D }) => {
  context.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  animation.frame += 1;
  requestAnimationFrame(() => render({ animation, context }));
};

const main = () => {
  const context = prepareCanvas({ id: "#canvas", height: CONFIG.HEIGHT, width: CONFIG.WIDTH });
  if (!context) return;

  const animation = { frame: 0 } satisfies CanvasAnimation;

  context.fillStyle = "#F2FDFA";
  context.strokeStyle = "#000000";
  requestAnimationFrame(() => render({ animation, context }));
};

main();

export {};
