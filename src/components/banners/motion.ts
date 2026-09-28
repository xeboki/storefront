import css from './motion.module.css';

/**
 * The class for what the picture does while its banner is up.
 *
 * A name the server serves that is not here yields nothing, which is a still
 * picture — the safe answer for an animation nobody has written yet.
 */
const MOTION: Record<string, string> = {
  ambient: css.ambient,
  push: css.push,
  pan: css.pan,
};

export function imageMotionClass(name: string): string {
  return MOTION[name] ?? '';
}

/** Implemented here. A test compares this to what the server serves. */
export const IMPLEMENTED_IMAGE_MOTION = ['none', ...Object.keys(MOTION)];
