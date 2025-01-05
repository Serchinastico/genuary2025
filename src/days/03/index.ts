import { prepareCanvas } from "@/common/canvas";
import { Point2D, Vector2D } from "@/common/geometry";
import { getGradient } from "@/common/color";

const CONFIG = {
  HALF_WIDTH: window.innerWidth * 0.5,
  HALF_HEIGHT: window.innerHeight * 0.5,
  WIDTH: window.innerWidth,
  HEIGHT: window.innerHeight,
  LINE_WIDTH: 1,
  NUM_VECTORS: 1000,
};

interface PathAnimation {
  path: Point2D[];
  vector: Vector2D;
  color: string;
}

interface CanvasAnimation {
  frame: number;
  animations: PathAnimation[];
}

const gradient = getGradient("ice");

/**
 * In here, it's the render function that is exactly 42 lines of code, the rest of the code is considered configuration
 */
const render = ({ animation, context }: { animation: CanvasAnimation; context: CanvasRenderingContext2D }) => {
  animation.animations.forEach((vectorAnimation) => {
    const { path, vector, color } = vectorAnimation;
    context.strokeStyle = color;
    context.save();
    context.translate(CONFIG.HALF_WIDTH, CONFIG.HALF_HEIGHT);
    const startingPoint = path[0] ?? { x: 0, y: 0 };
    context.beginPath();
    context.moveTo(startingPoint.x, startingPoint.y);
    for (let i = 1; i < path.length; i++) {
      const previousPoint = path[i - 1];
      const currentPoint = path[i];
      const controlPoint = { x: (previousPoint.x + currentPoint.x) / 2, y: (previousPoint.y + currentPoint.y) / 2 };
      context.quadraticCurveTo(controlPoint.x, controlPoint.y, currentPoint.x, currentPoint.y);
    }
    context.stroke();
    context.restore();
    const lastPoint = path[path.length - 1];
    const deltaAngle = (Math.random() * 40 - 20) * (Math.PI / 180);
    const nextVector = {
      x: vector.x * Math.cos(deltaAngle) - vector.y * Math.sin(deltaAngle),
      y: vector.x * Math.sin(deltaAngle) + vector.y * Math.cos(deltaAngle),
    };
    const nextPoint = { x: lastPoint.x + nextVector.x, y: lastPoint.y + nextVector.y };
    if (
      nextPoint.x < -CONFIG.HALF_WIDTH ||
      nextPoint.x > CONFIG.HALF_WIDTH ||
      nextPoint.y < -CONFIG.HALF_HEIGHT ||
      nextPoint.y > CONFIG.HALF_HEIGHT
    ) {
      vectorAnimation.path = [{ x: 0, y: 0 }];
    } else {
      vectorAnimation.vector = nextVector;
      vectorAnimation.path.push(nextPoint);
    }
    if (vectorAnimation.path.length > 10) {
      vectorAnimation.path.shift();
    }
  });

  animation.frame += 1;
  requestAnimationFrame(() => render({ animation, context }));
};

const main = () => {
  const context = prepareCanvas({ id: "#canvas", height: CONFIG.HEIGHT, width: CONFIG.WIDTH });
  if (!context) return;

  const animations: PathAnimation[] = [];

  for (let i = 0; i < CONFIG.NUM_VECTORS; i++) {
    animations.push({
      path: [
        {
          x: Math.random() * CONFIG.WIDTH - CONFIG.HALF_WIDTH,
          y: Math.random() * CONFIG.HEIGHT - CONFIG.HALF_HEIGHT,
        },
      ],
      vector: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 },
      color: gradient(Math.random()).hex(),
    });
  }

  const animation = { frame: 0, animations } satisfies CanvasAnimation;

  context.lineWidth = CONFIG.LINE_WIDTH;

  requestAnimationFrame(() => render({ animation, context }));
};

main();

export {};
