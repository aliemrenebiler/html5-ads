const tweenFrames = new WeakMap();
const equalizerTweens = new WeakMap();

const getEqualizer = (disc) => disc.closest(".ad")?.querySelector(".eq");

const cancelEqualizerTweens = (equalizer) => {
  const animations = equalizerTweens.get(equalizer);

  if (animations) {
    animations.forEach((animation) => animation.cancel());
    equalizerTweens.delete(equalizer);
  }
};

const resumeEqualizer = (disc) => {
  const equalizer = getEqualizer(disc);

  if (!equalizer) return;

  cancelEqualizerTweens(equalizer);
  equalizer.classList.add("is-stopped");
  equalizer.querySelectorAll(".eq-bar").forEach((bar) => {
    bar.style.animation = "";
    bar.style.height = "";
  });

  // Force the stopped 6px state before starting a fresh CSS animation from 0%.
  equalizer.offsetWidth;
  equalizer.classList.remove("is-stopped");
};

const collapseEqualizer = (disc) => {
  const equalizer = getEqualizer(disc);

  if (!equalizer) return;

  cancelEqualizerTweens(equalizer);
  equalizer.classList.remove("is-stopped");

  const bars = [...equalizer.querySelectorAll(".eq-bar")];
  const animations = bars.map((bar) => {
    const currentHeight = getComputedStyle(bar).height;

    bar.style.height = currentHeight;
    bar.style.animation = "none";

    return bar.animate(
      [{ height: currentHeight }, { height: "6px" }],
      {
        duration: 500,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      },
    );
  });

  equalizerTweens.set(equalizer, animations);

  Promise.all(animations.map((animation) => animation.finished.catch(() => {}))).then(
    () => {
      if (equalizerTweens.get(equalizer) !== animations) return;

      equalizer.classList.add("is-stopped");
      bars.forEach((bar) => {
        bar.style.animation = "";
        bar.style.height = "";
      });
      animations.forEach((animation) => animation.cancel());
      equalizerTweens.delete(equalizer);
    },
  );
};

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

  if (shouldPause) {
    collapseEqualizer(disc);
  } else {
    resumeEqualizer(disc);
  }

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
