const CONFIG = {
  HALF_WIDTH: window.innerWidth * 0.5,
  HALF_HEIGHT: window.innerHeight * 0.5,
  WIDTH: window.innerWidth,
  HEIGHT: window.innerHeight,
  NUMBER_OF_LINES: 100,
  CANVAS_WIDTH: window.innerWidth * 0.5,
  CANVAS_HEIGHT: window.innerWidth * 0.15,
  LINE_WIDTH: 2,
};

const LINE_GAP = CONFIG.CANVAS_WIDTH / CONFIG.NUMBER_OF_LINES;

interface CanvasAnimation {
  frame: number;
}

const prepareCanvas = ({ id }: { id: string }) => {
  const canvas = document.querySelector<HTMLCanvasElement>(id);
  canvas.width = CONFIG.WIDTH;
  canvas.height = CONFIG.HEIGHT;
  return canvas.getContext("2d");
};

const render = ({ animation, context }: { animation: CanvasAnimation; context: CanvasRenderingContext2D }) => {
  context.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  context.lineWidth = CONFIG.LINE_WIDTH;
  context.strokeStyle = "#FA0F22";

  context.save();
  context.translate(CONFIG.HALF_WIDTH - CONFIG.CANVAS_WIDTH / 2, CONFIG.HALF_HEIGHT);

  for (let i = 0; i < CONFIG.NUMBER_OF_LINES; i++) {
    const x = i * LINE_GAP;

    const yComponent =
      0.01 * CONFIG.CANVAS_HEIGHT * Math.sin(0.5 * (animation.frame + x)) +
      0.14 * CONFIG.CANVAS_HEIGHT * Math.sin(0.1 * (-animation.frame + x)) +
      0.85 * CONFIG.CANVAS_HEIGHT * Math.sin(0.01 * (animation.frame + x));
    context.lineWidth = 2 + 0.01 * (CONFIG.CANVAS_HEIGHT - Math.abs(yComponent)) * CONFIG.LINE_WIDTH;

    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, yComponent);
    context.stroke();
    context.closePath();
  }

  context.restore();

  animation.frame += 1;
  requestAnimationFrame(() => render({ animation, context }));
};

const main = () => {
  const context = prepareCanvas({ id: "#canvas" });
  const animation = { frame: 0 } satisfies CanvasAnimation;

  requestAnimationFrame(() => render({ animation, context }));
};

main();
