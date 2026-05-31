const getSpeedChangeFrames = (from, to, mode, startOffset, endOffset) => {
  const steps = 60;
  const distance = to - from;

  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const progress = mode === "accelerate" ? t * t : 1 - (1 - t) * (1 - t);
    const x = from + distance * progress;
    const offset = startOffset + (endOffset - startOffset) * t;

    return {
      offset,
      transform: `translateX(${x}px)`,
      opacity: 1,
    };
  });
};

const getDuration = (distance, speed) => (distance / speed) * 1000;

const getOffset = (time, totalDuration) => time / totalDuration;

const frame = (x, offset, opacity = 1) => ({
  offset,
  opacity,
  transform: `translateX(${x}px)`,
});

const waitForImage = async (image) => {
  if (image.complete && image.naturalWidth > 0) return;

  if (image.decode) {
    try {
      await image.decode();
      return;
    } catch {
      // Fall back to load/error listeners below.
    }
  }

  await new Promise((resolve) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
  });
};

const driveCar = async (stage, car) => {
  await waitForImage(car);

  const styles = getComputedStyle(stage.closest(".ad"));
  const speed = parseFloat(styles.getPropertyValue("--car-speed")) || 120;
  const speedDuration =
    parseFloat(styles.getPropertyValue("--car-speed-duration")) || 1000;
  const edgeBuffer =
    parseFloat(styles.getPropertyValue("--car-edge-buffer")) || 24;
  const stopX = parseFloat(styles.getPropertyValue("--car-stop-x")) || 0;
  const stopDuration =
    parseFloat(styles.getPropertyValue("--car-stop-duration")) || 1000;
  const reentryDelay =
    parseFloat(styles.getPropertyValue("--car-reentry-delay")) || 3000;

  const stageWidth = stage.getBoundingClientRect().width;
  const carWidth = car.getBoundingClientRect().width || car.naturalWidth;
  const startX = stageWidth / 2 + edgeBuffer;
  const endX = (stageWidth / 2 + carWidth + edgeBuffer) * -1;
  const speedChangeDistance = (speed * speedDuration) / 2000;

  const enterDistance = Math.abs(startX - stopX);
  const enterEaseDistance = Math.min(speedChangeDistance, enterDistance);
  const enterCruiseDistance = enterDistance - enterEaseDistance;
  const enterCruiseDuration = getDuration(enterCruiseDistance, speed);
  const enterEaseDuration =
    speedChangeDistance > 0
      ? (enterEaseDistance / speedChangeDistance) * speedDuration
      : 0;
  const enterEaseStartX = stopX + enterEaseDistance;

  const exitDistance = Math.abs(stopX - endX);
  const exitEaseDistance = Math.min(speedChangeDistance, exitDistance);
  const exitCruiseDistance = exitDistance - exitEaseDistance;
  const exitCruiseDuration = getDuration(exitCruiseDistance, speed);
  const exitEaseDuration =
    speedChangeDistance > 0
      ? (exitEaseDistance / speedChangeDistance) * speedDuration
      : 0;
  const exitEaseEndX = stopX - exitEaseDistance;

  const totalDuration =
    enterCruiseDuration +
    enterEaseDuration +
    stopDuration +
    exitEaseDuration +
    exitCruiseDuration +
    reentryDelay;

  const enterCruiseEnd = enterCruiseDuration;
  const enterEaseEnd = enterCruiseEnd + enterEaseDuration;
  const stopEnd = enterEaseEnd + stopDuration;
  const exitEaseEnd = stopEnd + exitEaseDuration;
  const exitCruiseEnd = exitEaseEnd + exitCruiseDuration;

  const frames = [
    frame(startX, 0),
    frame(enterEaseStartX, getOffset(enterCruiseEnd, totalDuration)),
    ...getSpeedChangeFrames(
      enterEaseStartX,
      stopX,
      "decelerate",
      getOffset(enterCruiseEnd, totalDuration),
      getOffset(enterEaseEnd, totalDuration),
    ).slice(1),
    frame(stopX, getOffset(stopEnd, totalDuration)),
    ...getSpeedChangeFrames(
      stopX,
      exitEaseEndX,
      "accelerate",
      getOffset(stopEnd, totalDuration),
      getOffset(exitEaseEnd, totalDuration),
    ).slice(1),
    frame(endX, getOffset(exitCruiseEnd, totalDuration)),
    frame(endX, getOffset(exitCruiseEnd, totalDuration), 0),
    frame(endX, 1, 0),
  ];

  car.style.opacity = "0";
  car.style.transform = `translateX(${startX}px)`;
  car.animate(frames, {
    duration: totalDuration,
    easing: "linear",
    fill: "both",
    iterations: Infinity,
  });
};

document.querySelectorAll(".car-stage").forEach((stage) => {
  const car = stage.querySelector(".car-image");

  if (!car) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    driveCar(stage, car);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      driveCar(stage, car);
      observer.disconnect();
    }
  });

  observer.observe(stage);
});
