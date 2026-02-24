import type { ParticleType } from '@/types/contracts';

/** A single particle with position, velocity, and lifetime. */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  color: string;
  size: number;
}

/** Particle configuration per effect type */
const PARTICLE_CONFIG: Record<ParticleType, { count: number; color: string; sizeMin: number; sizeMax: number; speedMin: number; speedMax: number }> = {
  pinHit: { count: 6, color: '#ffffff', sizeMin: 1.5, sizeMax: 3, speedMin: 20, speedMax: 40 },
  bucketLand: { count: 15, color: '#ffd700', sizeMin: 2, sizeMax: 5, speedMin: 30, speedMax: 60 },
  shove: { count: 10, color: '#ff6b6b', sizeMin: 2, sizeMax: 4, speedMin: 25, speedMax: 50 },
};

/**
 * Lightweight particle system for visual effects.
 * Particles are emitted at world coordinates and rendered on canvas.
 */
export class ParticleSystem {
  private particles: Particle[] = [];

  /** Emit particles at the given world position for the given effect type. */
  emit(x: number, y: number, type: ParticleType): void {
    const config = PARTICLE_CONFIG[type];
    for (let i = 0; i < config.count; i++) {
      const angle = (Math.PI * 2 * i) / config.count + (Math.random() - 0.5) * 0.5;
      const speed = config.speedMin + Math.random() * (config.speedMax - config.speedMin);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.02,
        color: config.color,
        size: config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin),
      });
    }
  }

  /** Update particle positions and remove dead particles. Returns remaining count. */
  update(dt: number): number {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 50 * dt; // gravity on particles
      p.life -= p.decay;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
    return this.particles.length;
  }

  /** Get all active particles for rendering. */
  getParticles(): readonly Particle[] {
    return this.particles;
  }

  /** Clear all particles. */
  clear(): void {
    this.particles.length = 0;
  }
}
