export const prepareCanvas = ({ id, width, height }: { id: string; width: number; height: number }) => {
  const canvas = document.querySelector<HTMLCanvasElement>(id);
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext("2d");
};
