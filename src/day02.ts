import { getGradient } from "./common/color";

const CONFIG = {
  HALF_WIDTH: window.innerWidth * 0.5,
  HALF_HEIGHT: window.innerHeight * 0.5,
  WIDTH: window.innerWidth,
  HEIGHT: window.innerHeight,
  NUMBER_OF_LINES: 10,
  NUMBER_OF_LAYERS: 100,
  SQUARE_WIDTH: window.innerWidth * 0.3,
  SQUARE_HEIGHT: window.innerWidth * 0.3,
  LINE_WIDTH: 0.5,
};

const LINE_GAP = CONFIG.SQUARE_WIDTH / CONFIG.NUMBER_OF_LINES;
const gradient = getGradient("fire");

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

  for (let layer = 0; layer < CONFIG.NUMBER_OF_LAYERS; layer++) {
    context.strokeStyle = gradient(layer / CONFIG.NUMBER_OF_LAYERS).hex();

    const rotation = (layer / CONFIG.NUMBER_OF_LINES) * 2 * Math.PI + animation.frame * layer * 0.0002;
    context.save();
    context.translate(CONFIG.HALF_WIDTH, CONFIG.HALF_HEIGHT);
    context.rotate(rotation);
    context.translate(-CONFIG.SQUARE_WIDTH / 2, -CONFIG.SQUARE_HEIGHT / 2);

    for (let i = 0; i < CONFIG.NUMBER_OF_LINES; i++) {
      const x = i * LINE_GAP;

      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, CONFIG.SQUARE_HEIGHT);
      context.stroke();
      context.closePath();
    }

    context.restore();
  }

  animation.frame += 1;
  requestAnimationFrame(() => render({ animation, context }));
};

const main = () => {
  const context = prepareCanvas({ id: "#canvas" });
  const animation = { frame: 0 } satisfies CanvasAnimation;

  requestAnimationFrame(() => render({ animation, context }));
};

main();

export {};
