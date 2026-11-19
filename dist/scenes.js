"use strict";

function initHeader() {
  const nav = siteHeader.querySelector(".main-nav");
  const links = Array.from(nav.querySelectorAll("a"));
  const destinations = [
    ["#work", "#work"],
    ["#video", "#video"],
    ["#design", "#work"],
    ["#about", "#about"],
  ].map(([section, link]) => [document.querySelector(section), links.find((item) => item.hash === link)]);
  let active = null;
  let previousY = Math.max(0, window.scrollY);
  let turnY = previousY;
  let direction = 0;
  let headerHidden = false;

  const update = onFrame(() => {
    const y = Math.max(0, window.scrollY);
    const height = siteHeader.offsetHeight;
    const step = Math.sign(y - previousY);
    if (step && step !== direction) {
      turnY = previousY;
      direction = step;
    }
    if (y <= 28 || (direction < 0 && turnY - y >= 10)) headerHidden = false;
    else if (direction > 0 && y > height + 16 && y - turnY >= 18) headerHidden = true;
    previousY = y;
    const fullScroll = document.documentElement.scrollHeight - window.innerHeight;
    siteHeader.classList.toggle("site-header--hidden", headerHidden);
    siteHeader.classList.toggle("site-header--scrolled", y > 24);
    siteHeader.style.setProperty("--reading-progress", String(fullScroll > 0 ? clamp(y / fullScroll, 0, 1) : 0));

    let current = links[0];
    for (const [section, link] of destinations) {
      if (section.getBoundingClientRect().top <= height + 44) current = link;
    }
    if (current !== active) {
      active?.removeAttribute("aria-current");
      current.setAttribute("aria-current", "location");
      active = current;
    }

    nav.style.setProperty("--nav-pill-width", `${current.offsetWidth}px`);
    nav.style.setProperty("--nav-pill-left", `${current.offsetLeft}px`);
    nav.classList.add("main-nav--ready");
  });

  window.addEventListener("scroll", update, { passive: true });
  new ResizeObserver(update).observe(nav);
  update();
}

function initRain() {
  const canvas = document.querySelector(".hero-rain");
  const hero = canvas.closest(".hero");
  const context = canvas.getContext("2d");
  if (!context) return;

  let width = 1;
  let height = 1;
  let frame = 0;
  let lastTime = 0;
  let visible = false;
  let drops = [];

  function canAnimate() {
    return visible && !document.hidden && !reducedMotion.matches && !hero.hasAttribute("data-motion-paused")
      && !projectDialog.open && !videoDialog.open;
  }

  function draw(now) {
    frame = 0;
    if (!canAnimate()) {
      lastTime = 0;
      return;
    }
    const elapsed = lastTime ? Math.min((now - lastTime) / 1000, .04) : 0;
    lastTime = now;
    context.clearRect(0, 0, width, height);

    for (const drop of drops) {
      drop.x -= drop.speed * elapsed * .24;
      drop.y += drop.speed * elapsed;
      if (drop.y > height + drop.length || drop.x < -12) {
        drop.x = Math.random() * (width + height * .25);
        drop.y = -drop.length;
      }
      context.beginPath();
      context.strokeStyle = `rgba(220, 198, 255, ${drop.alpha})`;
      context.lineWidth = drop.thickness;
      context.moveTo(drop.x, drop.y);
      context.lineTo(drop.x + drop.length * .24, drop.y - drop.length);
      context.stroke();
    }
    requestDraw();
  }

  function requestDraw() {
    if (!frame && canAnimate()) {
      frame = requestAnimationFrame(draw);
    }
  }

  new ResizeObserver(() => {
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width < 1 || bounds.height < 1) return;

    width = bounds.width;
    height = bounds.height;
    const density = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    context.setTransform(density, 0, 0, density, 0, 0);
    drops = Array.from({ length: Math.round(clamp(width / 15, 24, 102)) }, () => ({
      x: Math.random() * (width + height * .22),
      y: Math.random() * height,
      length: 25 + Math.random() * 45,
      speed: 260 + Math.random() * 445,
      alpha: .046 + Math.random() * .145,
      thickness: .4 + Math.random() * .53,
    }));
    requestDraw();
  }).observe(canvas);

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    requestDraw();
  }).observe(canvas);

  document.addEventListener("visibilitychange", requestDraw);
  reducedMotion.addEventListener("change", requestDraw);
  projectDialog.addEventListener("close", requestDraw);
  videoDialog.addEventListener("close", requestDraw);
  new MutationObserver(requestDraw).observe(hero, { attributes: true, attributeFilter: ["data-motion-paused"] });
}

function initScreeningRoom() {
  const screening = document.querySelector(".screening-room");
  const monitor = screening.querySelector(".screen-monitor");
  const image = monitor.querySelector("img");
  const title = monitor.querySelector(".screen-caption strong");
  const channel = monitor.querySelector(".screen-caption span");
  const status = screening.querySelector("#screen-status");
  const choices = Array.from(screening.querySelectorAll(".edit-choice"));
  let selection = null;

  function select(choice) {
    if (choice === selection) return;

    const details = choice.querySelector(".edit-details");
    const previous = selection;
    selection = choice;
    previous?.setAttribute("aria-pressed", "false");
    choice.setAttribute("aria-pressed", "true");
    title.textContent = details.querySelector("strong").textContent;
    channel.textContent = details.querySelector("span").textContent;
    image.src = `./assets/video/${choice.dataset.edit}-wide.jpg`;
    monitor.href = choice.href;
    monitor.dataset.video = choice.dataset.edit;
    monitor.dataset.title = title.textContent;
    monitor.setAttribute("aria-label", `Play ${title.textContent}`);

    if (previous) {
      status.textContent = `Selected ${title.textContent}`;
      if (!reducedMotion.matches) {
        monitor.classList.remove("screen-flash");
        void monitor.offsetWidth;
        monitor.classList.add("screen-flash");
      }
    }
  }

  for (const choice of choices) {
    choice.setAttribute("role", "button");
    choice.setAttribute("aria-pressed", "false");
    choice.addEventListener("click", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

      event.preventDefault();
      select(choice);
    });
    choice.addEventListener("keydown", (event) => {
      if (event.key !== " ") return;

      event.preventDefault();
      select(choice);
    });
  }

  select(choices[0]);
}

function initShortsCarousel() {
  const section = document.querySelector("[data-short-carousel]");
  const rail = section.querySelector(".shorts-rail");
  const slides = Array.from(rail.querySelectorAll(".short-card"));
  const caption = section.querySelector(".shorts-caption");
  const toolbar = section.querySelector(".shorts-toolbar");
  const title = caption.querySelector(".shorts-current-title");
  const channel = caption.querySelector(".shorts-current-channel");
  const position = toolbar.querySelector(".shorts-position");
  const previous = toolbar.querySelector('[data-video-step="-1"]');
  const next = toolbar.querySelector('[data-video-step="1"]');
  let active = Math.min(1, slides.length - 1);
  let lastActive = -1;

  function centerOf(slide) {
    return slide.offsetLeft + slide.offsetWidth / 2;
  }

  function centerSlide(index, behavior) {
    const left = centerOf(slides[index]) - rail.clientWidth / 2;
    rail.scrollTo({ left, behavior });
  }

  const update = onFrame(() => {
    const mid = rail.scrollLeft + rail.clientWidth / 2;
    const stride = centerOf(slides[1]) - centerOf(slides[0]);
    let nearest = Infinity;

    slides.forEach((slide, index) => {
      const offset = (centerOf(slide) - mid) / stride;
      const distance = Math.abs(offset);
      if (distance < nearest) {
        nearest = distance;
        active = index;
      }
      slide.style.setProperty("--short-turn", `${clamp(offset * -24, -48, 48)}deg`);
      slide.style.setProperty("--short-scale", String(1 - Math.min(distance * .165, .36)));
      slide.style.setProperty("--short-lift", `${Math.min(distance * 11, 23)}px`);
      slide.style.setProperty("--short-brightness", String(1 - Math.min(distance * .17, .43)));
    });

    if (active !== lastActive) {
      slides[lastActive]?.removeAttribute("aria-current");
      const slide = slides[active];
      slide.setAttribute("aria-current", "true");
      title.textContent = slide.querySelector(".short-title").textContent;
      channel.textContent = slide.querySelector(".short-channel").textContent;
      position.textContent = `${active + 1} / ${slides.length}`;
      lastActive = active;
    }
    updateRailControls(rail, previous, next);
  });

  caption.hidden = false;
  toolbar.hidden = false;
  centerSlide(active, "instant");
  rail.addEventListener("scroll", update, { passive: true });
  new ResizeObserver(() => {
    centerSlide(active, "instant");
    update();
  }).observe(rail);

  wireRailControls(rail, previous, next, (direction) => {
    const destination = clamp(active + direction, 0, slides.length - 1);
    if (destination !== active) centerSlide(destination, reducedMotion.matches ? "instant" : "smooth");
  });

  update();
}

function initSceneDepth() {
  const surfaces = Array.from(document.querySelectorAll("[data-depth]"));
  const update = onFrame(() => {
    const viewport = window.innerHeight;
    const still = reducedMotion.matches;
    for (const surface of surfaces) {
      const bounds = surface.getBoundingClientRect();
      if (!still && (bounds.bottom < -50 || bounds.top > viewport + 50)) continue;

      const depth = still ? 0 : clamp((viewport - bounds.top * 2 - bounds.height) / (viewport + bounds.height), -1, 1);
      surface.style.setProperty("--depth", depth.toFixed(3));
    }
  });

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  reducedMotion.addEventListener("change", update);
  update();
}

initHeader();
initRain();
initScreeningRoom();
initShortsCarousel();
initSceneDepth();
