"use strict";

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const siteHeader = document.querySelector(".site-header");

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function onFrame(callback) {
  let frame = 0;
  return () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      callback();
    });
  };
}

function scrollRange(rail) {
  return rail.scrollWidth - rail.clientWidth;
}

function stepTarget(rail, slides, direction) {
  const increment = slides[1]?.offsetLeft - slides[0]?.offsetLeft;
  if (!increment) return 0;

  const position = (rail.scrollLeft + direction * 3) / increment;
  const current = direction > 0 ? Math.floor(position) : Math.ceil(position);
  return clamp((current + direction) * increment, 0, scrollRange(rail));
}

function wireRailControls(rail, previous, next, step) {
  previous.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));
  rail.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    step(event.key === "ArrowLeft" ? -1 : 1);
  });
}

function updateRailControls(rail, previous, next) {
  // Keep focus on the controls when a slide reaches the end of the rail.
  previous.setAttribute("aria-disabled", String(rail.scrollLeft < 2));
  next.setAttribute("aria-disabled", String(rail.scrollLeft > scrollRange(rail) - 2));
}

function initHeroCarousel() {
  const hero = document.querySelector(".hero");
  const stage = hero.querySelector(".hero-stage");
  const orbit = hero.querySelector(".hero-orbit");
  const rail = hero.querySelector(".orbit-rail");
  const controls = hero.querySelector(".orbit-controls");
  const playback = controls.querySelector(".orbit-toggle");
  const posters = [
    "./assets/video/t0rKk86SXGA.jpg",
    "./assets/video/7fCeLRqW8MA.jpg",
    "./assets/video/7-uVSZu4LMw.jpg",
  ];
  const sources = featuredProjects.flatMap((project, index) => {
    const tile = { src: projectPath(project, true), light: project.light, shadow: project.shadow };
    const poster = index % 2 === 0 ? posters[index / 2] : null;
    return poster ? [tile, { src: poster, poster: true }] : [tile];
  });
  if (sources.length < 2) return;

  const tiles = sources.map((source) => {
    const tile = document.createElement("div");
    const image = document.createElement("img");
    tile.className = source.poster ? "orbit-tile orbit-tile--poster" : "orbit-tile";
    if (source.light) tile.style.setProperty("--tile-light", source.light);
    if (source.shadow) tile.style.setProperty("--tile-shadow", source.shadow);
    image.src = source.src;
    image.alt = "";
    image.decoding = "async";
    image.draggable = false;
    tile.append(image);
    return tile;
  });
  rail.append(...tiles);
  controls.hidden = false;

  let phase = .35;
  let target = null;
  let frame = 0;
  let lastTime = 0;
  let orbitWidth = orbit.clientWidth;
  let scrollProgress = 0;
  let inView = true;
  let playing = true;
  let dragging = null;

  function spacing() {
    return orbitWidth * (orbitWidth < 660 ? .34 : .208);
  }

  function shouldRotate() {
    return playing && inView && !document.hidden && !reducedMotion.matches
      && !dragging && !projectDialog.open && !videoDialog.open;
  }

  function paint() {
    const length = tiles.length;
    const shift = phase + scrollProgress * 2.6;
    const center = ((shift % length) + length) % length;
    const gap = spacing() * (1 + scrollProgress * .22);

    tiles.forEach((tile, index) => {
      const relative = (index - center + length * 1.5) % length - length / 2;
      const distance = Math.abs(relative);
      const curve = Math.min(distance / 3.1, 1.25);
      const rise = -Math.pow(curve, 1.45) * Math.min(orbitWidth * .066, 101);
      const scale = .77 + Math.min(curve, 1) * .23;
      const twist = clamp(relative * -15, -52, 52);
      const bank = clamp(relative * 2.5, -10, 10);
      tile.style.transform = `translate3d(${relative * gap}px, ${rise}px, 0) translate(-50%, -50%) rotateY(${twist}deg) rotateZ(${bank}deg) scale(${scale})`;
      tile.style.opacity = String(clamp((3.55 - distance) * 1.9, 0, 1));
      tile.style.zIndex = String(Math.round(distance * 10));
    });
  }

  function requestDraw() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function draw(now) {
    frame = 0;
    const elapsed = lastTime ? Math.min(now - lastTime, 45) : 16;
    lastTime = now;

    if (target !== null) {
      phase += (target - phase) * (1 - Math.exp(-elapsed / 124));
      if (Math.abs(target - phase) < .006) {
        phase = target;
        target = null;
      }
    } else if (shouldRotate()) {
      phase += elapsed / 4300;
    }

    paint();
    if (target !== null || shouldRotate()) requestDraw();
    else lastTime = 0;
  }

  function updatePlayback() {
    const label = playing ? "Pause hero motion" : "Play hero motion";
    hero.toggleAttribute("data-motion-paused", !playing);
    playback.setAttribute("aria-label", label);
    playback.title = label;
    playback.classList.toggle("orbit-toggle--paused", !playing);
    playback.hidden = reducedMotion.matches;
    requestDraw();
  }

  function step(direction) {
    if (reducedMotion.matches) {
      phase += direction;
      paint();
    } else {
      target = (target ?? phase) + direction;
      requestDraw();
    }
  }

  controls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-orbit-step]");
    if (button) step(Number(button.dataset.orbitStep));
  });
  playback.addEventListener("click", () => {
    playing = !playing;
    updatePlayback();
  });
  document.addEventListener("visibilitychange", requestDraw);
  projectDialog.addEventListener("close", requestDraw);
  videoDialog.addEventListener("close", requestDraw);

  orbit.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;

    target = null;
    dragging = { pointer: event.pointerId, x: event.clientX, phase };
    orbit.setPointerCapture(event.pointerId);
    orbit.classList.add("orbit--dragging");
  });
  orbit.addEventListener("pointermove", (event) => {
    if (dragging?.pointer !== event.pointerId) return;

    phase = dragging.phase + (dragging.x - event.clientX) / spacing();
    requestDraw();
  });
  function finishDrag(event) {
    if (dragging?.pointer !== event.pointerId) return;

    if (Math.abs(phase - dragging.phase) > .12 && !reducedMotion.matches) {
      target = Math.round(phase);
    }
    dragging = null;
    orbit.classList.remove("orbit--dragging");
    requestDraw();
  }
  orbit.addEventListener("pointerup", finishDrag);
  orbit.addEventListener("pointercancel", finishDrag);
  orbit.addEventListener("lostpointercapture", finishDrag);

  const updateScroll = onFrame(() => {
    const bounds = hero.getBoundingClientRect();
    scrollProgress = reducedMotion.matches ? 0 : clamp(-bounds.top / bounds.height, 0, 1);
    stage.style.setProperty("--hero-progress", String(scrollProgress));
    if (inView) requestDraw();
  });

  const measure = onFrame(() => {
    orbitWidth = orbit.clientWidth;
    updateScroll();
    requestDraw();
  });

  new ResizeObserver(measure).observe(orbit);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) updateScroll();
    requestDraw();
  }).observe(hero);
  window.addEventListener("scroll", updateScroll, { passive: true });

  reducedMotion.addEventListener("change", () => {
    target = null;
    updateScroll();
    updatePlayback();
  });

  updatePlayback();
  updateScroll();
}

function initFeaturedCarousel() {
  const section = document.querySelector(".work-section");
  const pin = section.querySelector(".work-pin");
  const rail = section.querySelector(".work-window");
  const slides = Array.from(workTrack.children);
  const footer = section.querySelector(".work-footer");
  const previous = footer.querySelector('[data-work-step="-1"]');
  const next = footer.querySelector('[data-work-step="1"]');
  const position = footer.querySelector(".work-position");
  const meter = footer.querySelector(".work-meter span");
  const desktop = matchMedia("(min-width: 54rem) and (min-height: 36rem)");
  if (slides.length === 0) return;

  let pinned = false;
  let distance = 0;
  let runway = 0;
  let lastIndex = -1;
  footer.hidden = false;

  function start() {
    return window.scrollY + section.getBoundingClientRect().top - siteHeader.offsetHeight;
  }

  function updateProgress() {
    const left = rail.scrollLeft;
    const progress = distance > 0 ? clamp(left / distance, 0, 1) : 0;
    const increment = (slides[1]?.offsetLeft ?? 0) - slides[0].offsetLeft;
    const index = progress > .998 ? slides.length - 1
      : Math.min(slides.length - 1, Math.round(left / (increment || 1)));

    meter.style.transform = `scaleX(${progress})`;
    if (index !== lastIndex) {
      position.textContent = `${index + 1} of ${slides.length}`;
      lastIndex = index;
    }
    updateRailControls(rail, previous, next);
  }

  const syncScroll = onFrame(() => {
    if (!pinned) return;

    const progress = clamp((siteHeader.offsetHeight - section.getBoundingClientRect().top) / runway, 0, 1);
    rail.scrollLeft = distance * progress;
    updateProgress();
  });

  const measure = onFrame(() => {
    distance = Math.max(0, scrollRange(rail));
    pinned = desktop.matches && !reducedMotion.matches && distance > 4;
    section.classList.toggle("work--pinned", pinned);
    runway = pinned ? Math.ceil(distance * .65) : 0;
    if (pinned) {
      section.style.setProperty("--work-runway", `${runway}px`);
      section.style.setProperty("--work-pin-height", `${pin.offsetHeight}px`);
      syncScroll();
    }
    updateProgress();
  });

  function moveTo(offset, behavior) {
    if (pinned && distance > 0) {
      window.scrollTo({ top: start() + runway * offset / distance, behavior });
    } else {
      rail.scrollTo({ left: offset, behavior });
    }
  }

  wireRailControls(rail, previous, next, (direction) => {
    const offset = stepTarget(rail, slides, direction);
    if (Math.abs(offset - rail.scrollLeft) < 2) return;
    moveTo(offset, reducedMotion.matches ? "instant" : "smooth");
  });

  rail.addEventListener("focusin", (event) => {
    const card = event.target.closest(".feature-card");
    if (!card || !pinned || !event.target.matches(":focus-visible")) return;

    const viewport = rail.getBoundingClientRect();
    const cardBounds = card.getBoundingClientRect();
    if (cardBounds.left < viewport.left + 4 || cardBounds.right > viewport.right - 4) {
      moveTo(clamp(card.offsetLeft - slides[0].offsetLeft, 0, distance), "instant");
    }
  });

  rail.addEventListener("scroll", onFrame(updateProgress), { passive: true });
  window.addEventListener("scroll", syncScroll, { passive: true });
  desktop.addEventListener("change", measure);
  reducedMotion.addEventListener("change", measure);
  const resize = new ResizeObserver(measure);
  resize.observe(rail);
  resize.observe(pin);
  measure();
}

function initScrollReveals() {
  const reveal = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting && entry.boundingClientRect.top > 0) continue;
      if (!reducedMotion.matches) entry.target.classList.add("reveal-in");
      observer.unobserve(entry.target);
    }
  }, { threshold: .09 });

  function observeCards(cards) {
    cards.forEach((card, index) => {
      card.style.setProperty("--reveal-delay", `${(index % 3) * .06}s`);
      reveal.observe(card);
    });
  }

  document.querySelectorAll("[data-reveal]:not(.design-card)").forEach((element) => reveal.observe(element));
  const grid = document.querySelector("#design-grid");
  observeCards(Array.from(grid.children));
  new MutationObserver((changes) => {
    observeCards(changes.flatMap((change) => Array.from(change.addedNodes).filter((node) => node instanceof HTMLElement)));
  }).observe(grid, { childList: true });
}

initHeroCarousel();
initFeaturedCarousel();
initScrollReveals();
