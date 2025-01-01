const CONFIG = {
  HALF_WIDTH: window.innerWidth * 0.5,
  HALF_HEIGHT: window.innerHeight * 0.5,
  WIDTH: window.innerWidth,
  HEIGHT: window.innerHeight,
};

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

  context.lineWidth = 1;
  context.strokeStyle = "#FA0F22";

  context.save();
  context.translate(CONFIG.HALF_WIDTH, CONFIG.HALF_HEIGHT);
  context.beginPath();
  context.arc(0, 0, 100, 0, 2 * Math.PI);
  context.stroke();
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
