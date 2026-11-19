"use strict";

const projectTypes = {
  jersey: { label: "Jersey", filter: "jerseys" },
  tee: { label: "T-shirt", filter: "shirts" },
  polo: { label: "Polo", filter: "shirts" },
  "long-sleeve": { label: "Long sleeve", filter: "layers" },
  hoodie: { label: "Hoodie", filter: "layers" },
  cap: { label: "Cap", filter: "caps" },
  set: { label: "Apparel set", filter: "sets" },
  logo: { label: "Logo & icon", filter: "marks" },
  embroidery: { label: "Embroidery", filter: "marks" },
};

const projects = designProjects.map(([title, type, key]) => ({
  title,
  key,
  ...projectTypes[type],
}));

const projectsByKey = new Map(projects.map((project) => [project.key, project]));
const featuredProjects = featuredDesigns.flatMap(([key, light, shadow]) => {
  const project = projectsByKey.get(key);
  return project ? [{ ...project, light, shadow }] : [];
});

const workTrack = document.querySelector(".work-track");
const featureTemplate = document.querySelector("#feature-card-template");

const projectDialog = document.querySelector("#project-dialog");
const projectType = document.querySelector("#project-type");
const projectTitle = document.querySelector("#project-title");
const projectImage = document.querySelector("#project-image");
const projectPosition = document.querySelector("#project-position");
const previousProject = document.querySelector("#previous-project");
const nextProject = document.querySelector("#next-project");

const videoDialog = document.querySelector("#video-dialog");
const playerMedia = document.querySelector("#player-media");
const playerTitle = document.querySelector("#player-title");
const youtubeLink = document.querySelector("#youtube-link");

let viewerProjects = [];
let activeProjectIndex = 0;
let projectArrival = null;

function projectPath(project, thumbnail = false) {
  return `./assets/work/${project.key}${thumbnail ? "-card" : ""}.webp`;
}

function renderFeaturedProjects() {
  const cards = document.createDocumentFragment();

  for (const project of featuredProjects) {
    const card = featureTemplate.content.cloneNode(true);
    const visual = card.querySelector(".feature-visual");
    card.querySelector(".feature-open").dataset.project = project.key;
    card.querySelector(".feature-name").textContent = project.title;
    card.querySelector(".feature-type").textContent = project.label;
    visual.style.setProperty("--tile-light", project.light);
    visual.style.setProperty("--tile-shadow", project.shadow);
    visual.querySelector("img").src = projectPath(project, true);
    cards.append(card);
  }

  workTrack.append(cards);
}

function showProject() {
  projectArrival?.cancel();
  const project = viewerProjects[activeProjectIndex];
  projectType.textContent = project.label;
  projectTitle.textContent = project.title;
  projectImage.alt = `${project.title} ${project.label.toLowerCase()} artwork`;
  projectImage.src = projectPath(project);
  projectImage.parentElement.classList.toggle("dialog-image--marks", project.filter === "marks");
  projectPosition.textContent = `${activeProjectIndex + 1} of ${viewerProjects.length}`;
  previousProject.disabled = nextProject.disabled = viewerProjects.length < 2;
}

function openProject(key, candidates, origin = null) {
  const index = candidates.findIndex((project) => project.key === key);
  if (index < 0 || projectDialog.open || videoDialog.open) return false;

  viewerProjects = candidates;
  activeProjectIndex = index;
  showProject();
  const movesFromTile = Boolean(origin?.width && !reducedMotion.matches);
  projectDialog.classList.toggle("lightbox--from-globe", movesFromTile);
  projectDialog.showModal();

  if (movesFromTile) {
    const artwork = projectImage.parentElement;
    const target = artwork.getBoundingClientRect();
    const x = origin.left + origin.width / 2 - target.left - target.width / 2;
    const y = origin.top + origin.height / 2 - target.top - target.height / 2;
    projectArrival = artwork.animate([
      { transform: `translate(${x}px, ${y}px) scale(${origin.width / target.width}, ${origin.height / target.height})`, opacity: .7 },
      { transform: "none", opacity: 1 },
    ], { duration: 310, easing: "cubic-bezier(.2, .83, .26, 1)" });
  }

  return true;
}

function changeProject(direction) {
  const count = viewerProjects.length;
  if (count < 2) return;

  activeProjectIndex = (activeProjectIndex + direction + count) % count;
  showProject();
}

workTrack.addEventListener("click", (event) => {
  const trigger = event.target.closest("button[data-project]");
  if (trigger) openProject(trigger.dataset.project, featuredProjects);
});
projectDialog.addEventListener("close", () => projectArrival?.cancel());

previousProject.addEventListener("click", () => changeProject(-1));
nextProject.addEventListener("click", () => changeProject(1));

projectDialog.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;

  event.preventDefault();
  changeProject(event.key === "ArrowLeft" ? -1 : 1);
});

for (const link of document.querySelectorAll("a[data-video]")) {
  link.target = "_blank";
  link.rel = "noopener";
  // YouTube embeds require an HTTP referrer. The direct watch link works from disk.
  if (location.protocol === "file:") continue;

  link.setAttribute("aria-haspopup", "dialog");
  link.addEventListener("click", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

    event.preventDefault();
    const { title, video } = link.dataset;
    videoDialog.classList.toggle("video-dialog--short", link.hasAttribute("data-short"));
    playerTitle.textContent = title;
    youtubeLink.href = link.href;

    const player = document.createElement("iframe");
    player.title = `${title} — YouTube player`;
    player.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    player.allowFullscreen = true;
    player.referrerPolicy = "strict-origin-when-cross-origin";
    player.src = `https://www.youtube-nocookie.com/embed/${video}?autoplay=1&rel=0&playsinline=1`;
    playerMedia.replaceChildren(player);
    videoDialog.showModal();
  });
}

videoDialog.addEventListener("close", () => playerMedia.replaceChildren());

for (const dialog of [projectDialog, videoDialog]) {
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;

    const { left, right, top, bottom } = dialog.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) {
      dialog.close();
    }
  });
}

renderFeaturedProjects();
