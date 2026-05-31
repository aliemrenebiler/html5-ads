const tweenFrames = new WeakMap();

const easeDiscSpin = (disc, targetRate) => {
  const [spinAnimation] = disc
    .getAnimations()
    .filter((animation) => animation.animationName === "spin");

  if (!spinAnimation) return;

  if (spinAnimation.playState === "paused") {
    spinAnimation.play();
  }

  const startRate = spinAnimation.playbackRate;
  const shouldPause = targetRate === 0;
  const endRate = shouldPause ? 0.001 : targetRate;
  const duration = 900;
  const startTime = performance.now();

  cancelAnimationFrame(tweenFrames.get(disc));

  const tick = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    spinAnimation.updatePlaybackRate(startRate + (endRate - startRate) * eased);

    if (progress < 1) {
      tweenFrames.set(disc, requestAnimationFrame(tick));
    } else if (shouldPause) {
      spinAnimation.pause();
    }
  };

  tweenFrames.set(disc, requestAnimationFrame(tick));
};

document.querySelectorAll(".disc").forEach((disc) => {
  disc.addEventListener("pointerenter", () => easeDiscSpin(disc, 0));
  disc.addEventListener("pointerleave", () => easeDiscSpin(disc, 1));
});
