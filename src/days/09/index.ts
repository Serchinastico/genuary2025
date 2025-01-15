import { prepareCanvas } from "@/common/canvas";
import { Point2D } from "@/common/geometry";
import { randomBool, randomInt } from "@/common/math";
import chroma from "chroma-js";

const CONFIG = {
  WIDTH: window.innerWidth,
  HEIGHT: window.innerHeight,
  TARGET_NUMBER_OF_PARTICLES: 500,
  PARTICLES_DECAY_TIME: 50,
  PARTICLES_DEATH_TIME: 100,
  PARTICLE_WIDTH: 3,
  SUBPARTICLE_WIDTH: 1,
};

type Subparticle = {
  ageOfBirth: number;
} & Omit<Particle, "subparticles">;

interface Particle {
  startingPosition: Point2D;
  velocity: Point2D;
  frictionFactor: number;
  age: number;
  isClockwise: boolean;
  subparticles: Subparticle[];
  color: chroma.Color;
}

interface CanvasAnimation {
  frame: number;
  particles: Particle[];
}

const color = chroma.scale(["#E3C654", "#D89703"]).mode("lch");

const createSubparticles = ({ parent }: { parent: Particle }) => {
  const particles: Subparticle[] = [];

  let position = { ...parent.startingPosition };
  let velocity = { ...parent.velocity };
  for (let i = 0; i < parent.age; i++) {
    position = { x: position.x + parent.velocity.x, y: position.y + parent.velocity.y };
    const angle = (parent.isClockwise ? 1 : -1) * (Math.PI / 180);
    const rotatedX = velocity.x * Math.cos(angle) - velocity.y * Math.sin(angle);
    const rotatedY = velocity.x * Math.sin(angle) + velocity.y * Math.cos(angle);
    velocity = { x: rotatedX * parent.frictionFactor, y: rotatedY * parent.frictionFactor };
  }

  if (Math.random() < 0.5) {
    const angle = Math.random() * (parent.isClockwise ? 1 : -1) * (Math.PI / 180);
    const rotatedVelocity = {
      x: velocity.x * Math.cos(angle) - velocity.y * Math.sin(angle),
      y: velocity.x * Math.sin(angle) + velocity.y * Math.cos(angle),
    };
    particles.push({
      startingPosition: position,
      velocity: rotatedVelocity,
      frictionFactor: 0.999,
      age: 0,
      isClockwise: parent.isClockwise,
      ageOfBirth: parent.age,
      color: color(Math.random()),
    });
  }

  return particles;
};

const createNewParticles = ({ numberOfParticles }: { numberOfParticles: number }) => {
  // The fewer particles there are, the more possibilities there are that we create a new one
  const particles: Particle[] = [];
  let canCreatedParticle = true;

  while (canCreatedParticle) {
    const particleCreationFactor =
      (CONFIG.TARGET_NUMBER_OF_PARTICLES - (numberOfParticles + particles.length)) / CONFIG.TARGET_NUMBER_OF_PARTICLES;
    const rnd = Math.random();

    if (rnd < particleCreationFactor) {
      particles.push({
        startingPosition: { x: randomInt({ min: 0, max: CONFIG.WIDTH }), y: randomInt({ min: 0, max: CONFIG.HEIGHT }) },
        velocity: { x: randomInt({ min: -1, max: 1 }) * 10, y: randomInt({ min: -1, max: 1 }) * 10 },
        frictionFactor: 0.99,
        age: 0,
        isClockwise: randomBool(),
        subparticles: [],
        color: color(Math.random()),
      });
    } else {
      canCreatedParticle = false;
    }
  }

  return particles;
};

const render = ({ animation, context }: { animation: CanvasAnimation; context: CanvasRenderingContext2D }) => {
  context.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  animation.particles.forEach((particle) => {
    context.beginPath();

    context.lineWidth = CONFIG.PARTICLE_WIDTH;
    context.strokeStyle = particle.color
      .alpha(
        particle.age > CONFIG.PARTICLES_DECAY_TIME
          ? Math.max(0, 1 - (particle.age - CONFIG.PARTICLES_DECAY_TIME) / CONFIG.PARTICLES_DECAY_TIME)
          : 1
      )
      .hex();
    context.moveTo(particle.startingPosition.x, particle.startingPosition.y);

    let position = particle.startingPosition;
    let velocity = particle.velocity;

    for (let i = 0; i < particle.age; i++) {
      position = { x: position.x + velocity.x, y: position.y + velocity.y };
      const angle = (particle.isClockwise ? 1 : -1) * (Math.PI / 180);
      const rotatedX = velocity.x * Math.cos(angle) - velocity.y * Math.sin(angle);
      const rotatedY = velocity.x * Math.sin(angle) + velocity.y * Math.cos(angle);
      velocity = { x: rotatedX * particle.frictionFactor, y: rotatedY * particle.frictionFactor };

      context.lineTo(position.x, position.y);
    }

    context.stroke();
    context.closePath();
    particle.age += 1;

    context.lineWidth = CONFIG.SUBPARTICLE_WIDTH;
    particle.subparticles.forEach((subparticle) => {
      let position = subparticle.startingPosition;
      let velocity = subparticle.velocity;

      for (let i = subparticle.ageOfBirth; i < particle.age; i++) {
        position = { x: position.x + velocity.x, y: position.y + velocity.y };
        const angle = (subparticle.isClockwise ? 1 : -1) * (Math.PI / 180);
        const rotatedX = velocity.x * Math.cos(angle) - velocity.y * Math.sin(angle);
        const rotatedY = velocity.x * Math.sin(angle) + velocity.y * Math.cos(angle);
        velocity = { x: rotatedX * subparticle.frictionFactor, y: rotatedY * subparticle.frictionFactor };

        if (i === subparticle.ageOfBirth) {
          context.beginPath();
          context.moveTo(position.x, position.y);
        } else if (i > subparticle.ageOfBirth) {
          context.lineTo(position.x, position.y);
        }
      }

      context.stroke();
      context.closePath();
    });
  });

  animation.particles = animation.particles.filter((particle) => particle.age < CONFIG.PARTICLES_DEATH_TIME);
  animation.particles.push(...createNewParticles({ numberOfParticles: animation.particles.length }));
  animation.particles.forEach((particle) => {
    particle.subparticles.push(...createSubparticles({ parent: particle }));
  });

  animation.frame += 1;
  requestAnimationFrame(() => render({ animation, context }));
};

const main = () => {
  const context = prepareCanvas({ id: "#canvas", height: CONFIG.HEIGHT, width: CONFIG.WIDTH });
  if (!context) return;

  const animation = { frame: 0, particles: [] as Particle[] } satisfies CanvasAnimation;

  context.fillStyle = "#F2FDFA";
  context.strokeStyle = "#E3C654";
  context.lineWidth = 3;
  requestAnimationFrame(() => render({ animation, context }));
};

main();

export {};
