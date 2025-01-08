import { prepareCanvas } from "@/common/canvas";
import chroma from "chroma-js";

const CONFIG = {
  HALF_WIDTH: window.innerWidth * 0.5,
  HALF_HEIGHT: window.innerHeight * 0.5,
  WIDTH: window.innerWidth,
  HEIGHT: window.innerHeight,
  PULSE_TIME_FRAMES: 100,
  ROTATION_ANIMATION_FRAMES: 50,
};

type Orientation = "in" | "out";

interface Hexagon {
  orientation: Orientation;
  previousOrientation: Orientation;
}

interface CanvasAnimation {
  frame: number;
  hexagons: Hexagon[][];
}

const gradient = chroma.scale(["#348AC7", "#F865B0"]);

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

const interpolate = {
  linear: (t: number): number => t,
  quadratic: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  bounce: (t: number): number => {
    if (t < 0.3636) return 7.5625 * t * t;
    if (t < 0.7272) {
      t -= 0.5454; // Bounce #2
      return 7.5625 * t * t + 0.75;
    }
    if (t < 0.909) {
      t -= 0.81818; // Bounce #3
      return 7.5625 * t * t + 0.9375;
    }
    t -= 0.9545; // Bounce #4
    return 7.5625 * t * t + 0.984375;
  },
};

const createHexagonMatrix = (rows: number, cols: number): Hexagon[][] => {
  const matrix: Hexagon[][] = [];

  for (let row = 0; row < rows; row++) {
    const matrixRow: Hexagon[] = [];
    for (let col = 0; col < cols; col++) {
      matrixRow.push({
        orientation: Math.random() > 0.5 ? "out" : "in",
        previousOrientation: Math.random() > 0.5 ? "out" : "in",
      });
    }
    matrix.push(matrixRow);
  }

  return matrix;
};

const getHexagonVertices = (radius: number) => {
  const vertices = [];

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    vertices.push({ x, y });
  }

  return vertices;
};

const drawHexagon = ({
  context,
  radius,
}: {
  context: CanvasRenderingContext2D;
  radius: number;
  orientation: Orientation;
}) => {
  context.beginPath();

  const vertices = getHexagonVertices(radius);
  vertices.forEach(({ x, y }, index) => {
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });

  context.closePath();
  context.fill();
  context.stroke();
};

const drawHexagonShade = ({
  context,
  radius,
  orientation,
}: {
  context: CanvasRenderingContext2D;
  radius: number;
  orientation: Orientation;
}) => {
  const vertices = getHexagonVertices(radius);
  const vertexIndices = orientation === "in" ? [2, 3, 4] : [1, 2, 3];

  context.beginPath();
  context.fillStyle = "#00000066";
  context.moveTo(0, 0);
  vertexIndices.forEach((index) => {
    context.lineTo(vertices[index].x, vertices[index].y);
  });
  context.lineTo(0, 0);
  context.closePath();
  context.fill();
};

const drawHexagonDimensions = ({
  context,
  radius,
  orientation,
}: {
  context: CanvasRenderingContext2D;
  radius: number;
  orientation: Orientation;
}) => {
  const vertices = getHexagonVertices(radius);

  const vertexIndices = orientation === "in" ? [0, 2, 4] : [1, 3, 5];

  context.beginPath();
  vertexIndices.forEach((index) => {
    context.moveTo(vertices[index].x, vertices[index].y);
    context.lineTo(0, 0);
  });
  context.closePath();
  context.stroke();
};

const render = ({ animation, context }: { animation: CanvasAnimation; context: CanvasRenderingContext2D }) => {
  context.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  const hexRadius = 50;
  const hexHorizontalSpacing = Math.sqrt(3) * hexRadius;
  const hexVerticalSpacing = hexRadius * (3 / 2);

  animation.hexagons.forEach((hexagonRow, row) => {
    const y = row * hexVerticalSpacing;
    const offsetX = row % 2 === 0 ? 0 : 0.5 * hexHorizontalSpacing;

    hexagonRow.forEach((hexagon, col) => {
      const x = col * hexHorizontalSpacing + offsetX;

      context.save();
      context.translate(x, y);

      if (hexagon.orientation !== hexagon.previousOrientation) {
        const rawProgress = (animation.frame % CONFIG.PULSE_TIME_FRAMES) / CONFIG.ROTATION_ANIMATION_FRAMES;
        const rotationProgress = clamp(rawProgress, 0, 1);

        const interpolatedProgress = interpolate.bounce(rotationProgress);

        const startAngle = hexagon.previousOrientation === "in" ? (2.0 / 3) * Math.PI : 0;
        const endAngle = hexagon.orientation === "in" ? (2.0 / 3) * Math.PI : 0;
        const rotationAngle = startAngle + interpolatedProgress * (endAngle - startAngle);

        context.fillStyle = gradient(
          hexagon.orientation === "in" ? interpolatedProgress : 1 - interpolatedProgress
        ).hex();

        context.rotate(rotationAngle);
      } else if (hexagon.orientation === "in") {
        context.rotate((2.0 / 3) * Math.PI);
        context.fillStyle = "#F865B0";
      } else {
        context.rotate(0);
        context.fillStyle = "#348AC7";
      }

      drawHexagon({ context, radius: hexRadius, orientation: hexagon.orientation });
      drawHexagonShade({ context, radius: hexRadius, orientation: hexagon.orientation });
      drawHexagonDimensions({ context, radius: hexRadius, orientation: hexagon.orientation });

      context.restore();
    });
  });

  if (animation.frame % CONFIG.PULSE_TIME_FRAMES === 0) {
    animation.hexagons.forEach((hexagonRow) => {
      hexagonRow.forEach((hexagon) => {
        hexagon.previousOrientation = hexagon.orientation;
        hexagon.orientation = Math.random() > 0.5 ? "out" : "in";
      });
    });
  }

  animation.frame += 1;
  requestAnimationFrame(() => render({ animation, context }));
};

const main = () => {
  const context = prepareCanvas({ id: "#canvas", height: CONFIG.HEIGHT, width: CONFIG.WIDTH });
  if (!context) return;

  const hexagons = createHexagonMatrix(22, 20);
  const animation = { frame: 0, hexagons } satisfies CanvasAnimation;

  context.fillStyle = "#F2FDFA";
  context.strokeStyle = "#000000";
  requestAnimationFrame(() => render({ animation, context }));
};

main();

export {};
