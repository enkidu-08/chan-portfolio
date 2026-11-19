"use strict";

function spherePositions(count) {
  const bandCount = Math.max(1, Math.round(Math.sqrt(count) * .8));
  const tiltLimit = bandCount === 2 ? .66 : 1.12;
  const bands = Array.from({ length: bandCount }, (_, index) => {
    const latitude = bandCount === 1 ? 0 : (index / (bandCount - 1) * 2 - 1) * tiltLimit;
    return { index, latitude, weight: Math.cos(latitude) };
  });

  const totalWeight = bands.reduce((sum, band) => sum + band.weight, 0);
  let remaining = count;
  for (const band of bands) {
    const share = 1 + (count - bandCount) * band.weight / totalWeight;
    band.tiles = Math.floor(share);
    band.remainder = share - band.tiles;
    remaining -= band.tiles;
  }
  const ranked = bands.slice().sort((a, b) => b.remainder - a.remainder);
  for (let index = 0; index < remaining; index++) ranked[index].tiles++;

  return bands.flatMap((band) =>
    Array.from({ length: band.tiles }, (_, index) => {
      const longitude = (index + (band.index % 2) * .5) / band.tiles * Math.PI * 2;
      return { latitude: band.latitude, longitude, depth: band.weight * Math.cos(longitude) };
    })
  ).sort((a, b) => b.depth - a.depth);
}

function initArchiveGlobe(panel) {
  const stage = panel.querySelector(".sphere-stage");
  const world = panel.querySelector(".sphere-world");
  const title = panel.querySelector(".sphere-title");
  const category = panel.querySelector(".sphere-category");
  const position = panel.querySelector(".sphere-position");
  const announcement = panel.querySelector(".sphere-announcement");
  const view = panel.querySelector(".sphere-open");
  const steps = Array.from(panel.querySelectorAll("[data-sphere-step]"));
  const pitchLimit = Math.PI * .47;
  let candidates = [];
  let tiles = [];
  let active = -1;
  let radius = 1;
  let yaw = 0;
  let pitch = 0;
  let frame = 0;
  let lastFrame = 0;
  let drag = null;
  let glide = null;
  let alignment = null;
  let suppressClickUntil = 0;
  let openedHere = false;

  function draw() {
    world.style.transform = `rotateX(${pitch}rad) rotateY(${yaw}rad)`;
    let nearestDepth = -Infinity;
    let nearest = -1;
    const pitchCos = Math.cos(pitch);
    const pitchSin = Math.sin(pitch);

    tiles.forEach((tile, index) => {
      const depth = Math.cos(tile.latitude) * Math.cos(tile.longitude + yaw) * pitchCos + Math.sin(tile.latitude) * pitchSin;
      tile.button.toggleAttribute("data-away", depth <= .225);
      if (depth > nearestDepth) {
        nearestDepth = depth;
        nearest = index;
      }
    });

    if (nearest === active || nearest < 0) return;
    tiles[active]?.button.removeAttribute("aria-current");
    active = nearest;
    tiles[active].button.setAttribute("aria-current", "true");
    const project = candidates[active];
    title.textContent = project.title;
    category.textContent = project.label;
    position.textContent = `${active + 1} of ${tiles.length}`;
  }

  function resize() {
    if (!stage.clientWidth || !stage.clientHeight) return;

    radius = Math.min(stage.clientWidth * .435, stage.clientHeight * .414);
    const tileWidth = radius * clamp(3.53 / Math.sqrt(tiles.length || 1), .43, .88);
    stage.style.setProperty("--sphere-radius", `${radius}px`);
    stage.style.setProperty("--sphere-perspective", `${radius * 4.3}px`);
    stage.style.setProperty("--sphere-tile-width", `${tileWidth}px`);
    stage.style.setProperty("--sphere-tile-height", `${tileWidth * .638}px`);
    draw();
  }

  function animate(timestamp) {
    frame = 0;
    const elapsed = lastFrame ? Math.min(timestamp - lastFrame, 35) : 16;
    lastFrame = timestamp;
    let arrived = null;

    if (alignment) {
      const progress = clamp((timestamp - alignment.start) / 315, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      yaw = alignment.fromYaw + alignment.deltaYaw * eased;
      pitch = alignment.fromPitch + (alignment.pitch - alignment.fromPitch) * eased;
      if (progress === 1) {
        arrived = alignment.arrive;
        alignment = null;
      }
    } else if (glide) {
      yaw += glide.yaw * elapsed;
      pitch = clamp(pitch + glide.pitch * elapsed, -pitchLimit, pitchLimit);
      const decay = Math.exp(-elapsed / 135);
      glide.yaw *= decay;
      glide.pitch *= decay;
      if (Math.hypot(glide.yaw, glide.pitch) < .00016) glide = null;
    }

    draw();
    arrived?.();
    if (alignment || glide) requestDraw();
    else lastFrame = 0;
  }

  function requestDraw() {
    if (!frame) frame = requestAnimationFrame(animate);
  }

  function focusTile(index, arrive = null, immediate = false) {
    const tile = tiles[index];
    if (!tile) return;

    glide = null;
    alignment = null;
    const distance = -tile.longitude - yaw;
    const deltaYaw = Math.atan2(Math.sin(distance), Math.cos(distance));
    if (immediate || reducedMotion.matches || Math.abs(deltaYaw) + Math.abs(tile.latitude - pitch) < .025) {
      yaw += deltaYaw;
      pitch = tile.latitude;
      draw();
      arrive?.();
      return;
    }

    alignment = {
      index, start: performance.now(), fromYaw: yaw, fromPitch: pitch, deltaYaw, pitch: tile.latitude, arrive,
    };
    requestDraw();
  }

  function announceFocus() {
    announcement.textContent = `${candidates[active].title}, ${candidates[active].label}`;
  }

  function launch(index) {
    focusTile(index, () => {
      const tile = tiles[index];
      openedHere = openProject(candidates[index].key, candidates, tile.button.getBoundingClientRect());
    });
  }

  function setProjects(selection) {
    candidates = selection;
    active = -1;
    announcement.textContent = "";
    glide = alignment = null;
    yaw = pitch = 0;
    const positions = spherePositions(selection.length);
    tiles = selection.map((project, index) => {
      const button = document.createElement("button");
      const image = document.createElement("img");
      const { latitude, longitude } = positions[index];
      button.type = "button";
      button.className = "sphere-tile";
      button.tabIndex = -1;
      button.dataset.sphereIndex = String(index);
      button.dataset.tone = project.filter;
      button.setAttribute("aria-label", `View ${project.title}, ${project.label}`);
      button.setAttribute("aria-haspopup", "dialog");
      button.style.setProperty("--tile-yaw", `${longitude}rad`);
      button.style.setProperty("--tile-pitch", `${-latitude}rad`);
      image.src = projectPath(project, true);
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.draggable = false;
      button.append(image);
      return { button, latitude, longitude };
    });
    world.replaceChildren(...tiles.map((tile) => tile.button));
    view.disabled = tiles.length === 0;
    for (const step of steps) step.disabled = tiles.length < 2;
    if (tiles.length) focusTile(0, null, true);
    else {
      title.textContent = "No designs";
      category.textContent = position.textContent = "";
    }
    resize();
  }

  stage.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;

    glide = alignment = null;
    drag = {
      pointer: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX,
      lastY: event.clientY, time: performance.now(), moved: false, yawSpeed: 0, pitchSpeed: 0,
    };
  });
  stage.addEventListener("pointermove", (event) => {
    if (drag?.pointer !== event.pointerId) return;
    if (!drag.moved) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;

      drag.moved = true;
      stage.setPointerCapture(event.pointerId);
      stage.classList.add("sphere-stage--dragging");
      stage.focus({ preventScroll: true });
    }

    const time = performance.now();
    const elapsed = Math.max(8, time - drag.time);
    const turn = (event.clientX - drag.lastX) / radius;
    const lift = (drag.lastY - event.clientY) / radius;
    yaw += turn;
    pitch = clamp(pitch + lift, -pitchLimit, pitchLimit);
    drag.yawSpeed = clamp(turn / elapsed, -.009, .009);
    drag.pitchSpeed = clamp(lift / elapsed, -.007, .007);
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.time = time;
    requestDraw();
  });

  function finishDrag(event) {
    if (drag?.pointer !== event.pointerId) return;

    const time = performance.now();
    if (drag.moved) {
      suppressClickUntil = time + 250;
      if (!reducedMotion.matches && event.type === "pointerup" && time - drag.time < 90) {
        glide = { yaw: drag.yawSpeed, pitch: drag.pitchSpeed };
        requestDraw();
      }
    }
    stage.classList.remove("sphere-stage--dragging");
    drag = null;
  }
  stage.addEventListener("pointerup", finishDrag);
  stage.addEventListener("pointercancel", finishDrag);
  stage.addEventListener("lostpointercapture", finishDrag);
  stage.addEventListener("click", (event) => {
    const button = event.target.closest("[data-sphere-index]");
    if (button && performance.now() >= suppressClickUntil) launch(Number(button.dataset.sphereIndex));
  });
  stage.addEventListener("keydown", (event) => {
    if (event.target !== stage || active < 0) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      launch(active);
    } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      glide = alignment = null;
      if (event.key === "ArrowLeft") yaw -= .29;
      if (event.key === "ArrowRight") yaw += .29;
      if (event.key === "ArrowUp") pitch = Math.min(pitch + .25, pitchLimit);
      if (event.key === "ArrowDown") pitch = Math.max(pitch - .25, -pitchLimit);
      draw();
      announceFocus();
    }
  });

  for (const step of steps) {
    step.addEventListener("click", () => {
      const from = alignment?.index ?? active;
      const target = (from + Number(step.dataset.sphereStep) + tiles.length) % tiles.length;
      focusTile(target, announceFocus);
    });
  }
  view.addEventListener("click", () => launch(active));
  projectDialog.addEventListener("close", () => {
    if (!openedHere) return;

    openedHere = false;
    if (document.activeElement?.closest("[data-sphere-index]")) stage.focus({ preventScroll: true });
    const key = viewerProjects[activeProjectIndex]?.key;
    const index = candidates.findIndex((candidate) => candidate.key === key);
    focusTile(index);
  });
  reducedMotion.addEventListener("change", () => {
    if (!reducedMotion.matches) return;

    glide = null;
    if (alignment) focusTile(alignment.index, alignment.arrive, true);
  });
  new ResizeObserver(resize).observe(stage);

  return {
    setProjects,
    stop() {
      glide = alignment = null;
    },
  };
}

function initArchive() {
  const toolbar = document.querySelector(".archive-toolbar");
  const filters = toolbar.querySelector(".gallery-controls");
  const modes = toolbar.querySelector(".archive-modes");
  const globePanel = document.querySelector("#archive-globe");
  const gridPanel = document.querySelector("#archive-grid");
  const grid = gridPanel.querySelector("#design-grid");
  const template = document.querySelector("#design-card-template");
  const status = document.querySelector("#gallery-status");
  const more = document.querySelector("#more-designs");
  const globe = initArchiveGlobe(globePanel);
  const batchSize = 9;
  let selection = projects;
  let displayed = 0;
  let mode = "globe";

  function appendProjects() {
    const slice = selection.slice(displayed, displayed + batchSize);
    const cards = document.createDocumentFragment();

    slice.forEach((project, index) => {
      const card = template.content.cloneNode(true);
      const cover = card.querySelector(".design-cover");
      card.querySelector(".design-card").classList.toggle("design-card--lead", displayed + index === 0);
      card.querySelector(".design-open").dataset.project = project.key;
      card.querySelector(".design-name").textContent = project.title;
      card.querySelector(".design-type").textContent = project.label;
      cover.dataset.tone = project.filter;
      cover.classList.toggle("design-cover--marks", project.filter === "marks");
      card.querySelector("img").src = projectPath(project, true);
      cards.append(card);
    });

    const firstNewCard = cards.querySelector("button");
    grid.append(cards);
    displayed += slice.length;
    more.parentElement.hidden = displayed >= selection.length;
    status.textContent = `Showing ${displayed} of ${selection.length} designs.`;
    return firstNewCard;
  }

  function showCurrentMode() {
    globePanel.hidden = mode !== "globe";
    gridPanel.hidden = mode !== "grid";

    if (mode === "grid") {
      globe.stop();
      if (!displayed) appendProjects();
      else status.textContent = `Showing ${displayed} of ${selection.length} designs.`;
    } else {
      status.textContent = `${selection.length} designs`;
    }
  }

  filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button || button.getAttribute("aria-pressed") === "true") return;

    filters.querySelector("[aria-pressed='true']").setAttribute("aria-pressed", "false");
    button.setAttribute("aria-pressed", "true");
    selection = button.dataset.filter === "all" ? projects : projects.filter((project) => project.filter === button.dataset.filter);
    displayed = 0;
    grid.replaceChildren();
    globe.setProjects(selection);
    showCurrentMode();
  });
  modes.addEventListener("click", (event) => {
    const button = event.target.closest("[data-archive-mode]");
    if (!button || button.dataset.archiveMode === mode) return;

    modes.querySelector("[aria-pressed='true']").setAttribute("aria-pressed", "false");
    button.setAttribute("aria-pressed", "true");
    mode = button.dataset.archiveMode;
    showCurrentMode();
  });
  more.addEventListener("click", () => appendProjects()?.focus());
  grid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-project]");
    if (button) openProject(button.dataset.project, selection);
  });

  toolbar.hidden = false;
  showCurrentMode();
  globe.setProjects(selection);
}

initArchive();
