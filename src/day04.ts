import { prepareCanvas } from "./common/canvas";
import chroma from "chroma-js";

const CONFIG = {
  HALF_WIDTH: window.innerWidth * 0.5,
  HALF_HEIGHT: window.innerHeight * 0.5,
  WIDTH: window.innerWidth,
  HEIGHT: window.innerHeight,
  NUMBER_OF_LAYERS: 35,
};

interface CanvasAnimation {
  frame: number;
}

const gradient = chroma
  .scale(["#0A0A0A", "#000000"])
  .mode("lch")
  .domain([0, CONFIG.NUMBER_OF_LAYERS])
  .colors(CONFIG.NUMBER_OF_LAYERS);

console.log(gradient);

const drawWigglyCircle = (
  context: CanvasRenderingContext2D,
  frame: number,
  centerX: number,
  centerY: number,
  radius: number,
  waves: number,
  irregularity: number
) => {
  const numberOfPoints = 200;
  const angleStep = (Math.PI * 2) / numberOfPoints;

  context.beginPath();
  for (let i = 0; i <= numberOfPoints - 1; i++) {
    const angle = i * angleStep;
    const offset = Math.sin(angle * waves + frame * 0.1) * irregularity;
    const x = centerX + (radius + offset) * Math.cos(angle);
    const y = centerY + (radius + offset) * Math.sin(angle);

    if (i === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.closePath();
  context.stroke();
  context.fill();
};

const render = ({ animation, context }: { animation: CanvasAnimation; context: CanvasRenderingContext2D }) => {
  context.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  context.save();
  context.translate(CONFIG.HALF_WIDTH, CONFIG.HALF_HEIGHT);
  context.rotate(animation.frame * -0.01);

  for (let i = CONFIG.NUMBER_OF_LAYERS - 1; i >= 0; i--) {
    context.strokeStyle = chroma("white")
      .alpha((CONFIG.NUMBER_OF_LAYERS - i) / CONFIG.NUMBER_OF_LAYERS)
      .hex();
    context.lineWidth = 2;
    context.fillStyle = gradient[i];

    drawWigglyCircle(context, animation.frame, 0, 0, 100 + i * 15, 5 * (1 + Math.sin(0.025 * animation.frame)), 20);
  }
  context.restore();

  animation.frame += 1;
  requestAnimationFrame(() => render({ animation, context }));
};

const main = () => {
  const context = prepareCanvas({ id: "#canvas", height: CONFIG.HEIGHT, width: CONFIG.WIDTH });
  const animation = { frame: 0 } satisfies CanvasAnimation;

  requestAnimationFrame(() => render({ animation, context }));
};

main();

export {};
