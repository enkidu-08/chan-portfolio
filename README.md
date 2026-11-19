# Enkidu Ltd portfolio

A static portfolio for Chan, a video editor and graphic designer. A rain-lit hero leads into a scroll-driven work strip, long-form screening room, Shorts carousel, rotating design globe, and dark contact footer.

The site uses Outfit throughout, with heavier weights for the rounded headlines. The font and Open Font License are included locally.

## Preview

Open `dist/index.html` in a browser. Video buttons open YouTube when viewing the site directly from disk.

For an in-page video player, run `python -m http.server 8080 --bind 127.0.0.1 --directory dist` from this folder, then visit `http://127.0.0.1:8080/`. Every player also has a direct YouTube link.

## GitHub Pages

The [live portfolio](https://jayandradeph.github.io/chan-portfolio/) is hosted on GitHub Pages. The [Publish portfolio workflow](.github/workflows/pages.yml) publishes `dist/` whenever changes are pushed to `main`. It can also be run manually from the repository's Actions tab.

After a portfolio update, check that the workflow succeeded and open the live site to verify the changed content. JavaScript, styles, and artwork paths should stay relative to the project URL.

## Motion and controls

- Drag the hero artwork to turn the carousel. Use Prev or Next to step through it. Pause stops the carousel and rain.
- Scroll down through Selected Work on desktop to move the project strip horizontally. On a narrow screen, swipe to browse. Selected Work and Shorts both support Prev and Next buttons and arrow-key navigation when the strip is focused.
- Select a long-form edit in the playlist and press Play on its large preview. Swipe the Shorts carousel to change the centered video.
- Drag the Design Archive globe or use the arrow keys when it has focus. Click an artwork tile or press Enter to bring it forward and open its full-size image. On a phone, drag sideways to rotate while vertical gestures scroll the page. The category filters apply to both Globe and Grid.
- The header hides as you scroll down and returns when you scroll up. The navigation also appears at the top of the page and when it receives keyboard focus.
- With reduced motion, the globe follows direct movement and opens artwork immediately. The hero uses direct controls, Selected Work uses standard horizontal scrolling, and Shorts stays level as the rail moves.

## Update the portfolio

- Edit design titles, types, and order in `dist/designs.js`. Each entry uses two files in `dist/assets/work/`, a gallery image named `<stem>-card.webp` and a larger viewer image named `<stem>.webp`.
- The `featuredDesigns` list in the same file controls the six selected projects and their lighting colors. These designs also appear in the hero alongside video posters.
- Edit the biography, video samples, channel credits, and contact links in `dist/index.html`. Video poster filenames use the YouTube video ID. The screening room uses the `<video-id>-wide.jpg` posters, and its playlist uses the smaller `<video-id>.jpg` files.
- `dist/` is the complete static site. It requires no build step, package install, or backend.

## Sources

- [Enkidu Ltd Carrd](https://enkidulimited.carrd.co/) supplies the portrait, channel images, editing samples, bio, and contact details.
- Chan supplied the 56 designs in the archive. This repository contains web-sized copies for the globe, grid, and artwork viewer.
- 3D Jack informed the oversized title and moving project strip. Dark Portfolio informed the curved artwork track behind the foreground portrait. [3D Jack Portfolio](https://studio.motionsites.ai/explore/3d-jack-portfolio-hero) · [Dark Portfolio](https://studio.motionsites.ai/explore/dark-portfolio)
- Penthouse Rain informed the floating navigation and glass entrance reveal. Honey Bee informed the heavy, rounded headline lettering. [Penthouse Rain](https://studio.motionsites.ai/explore/penthouse-rain) · [Honey Bee](https://studio.motionsites.ai/explore/honey-bee)
- Orbit Sphere informed the arrangement of artwork tiles around a globe and the transition from a selected tile to a full-size view. [Orbit Sphere](https://studio.motionsites.ai/explore/orbit-sphere)

### Hero portrait

The built-in ImageGen tool made the transparent cutout from the Carrd portrait. The website loads `dist/assets/profile/chan-cutout.webp`, and the source photo is `dist/assets/profile/chan.jpg`.

> Edit the supplied photo for a portfolio website. Remove only the background and export a true transparent PNG cutout of the foreground person. Preserve the original face, expression, gaze, hair silhouette, skin texture, navy T-shirt, folded arm, raised peace-sign hand, and original camera framing and angle. Keep the person in exactly the same pose and location within the square frame. Keep actual hair flyaways and natural edges. Remove the wall, doorway, and blue backdrop, including the spaces between the fingers and around the raised hand. Preserve visible portions of the foreground equipment where held. Keep the lower and right edges of the person cropped the way the source photo is cropped. Match the source color and lighting, with no restyling, beautification, text, canvas border, glow, or shadow. Output real alpha transparency around the figure.

### Rain backdrop

The built-in ImageGen tool created the original background in `dist/assets/profile/hero-atmosphere.webp`. The website grades it in teal and cobalt and draws moving rain over it.

> Generate an original ultra-wide background photograph for an independent video editor and designer’s portfolio hero. Wide 16:9, cinematic night atmosphere seen through rain-streaked windows in a dark creative studio. Focus on the wet glass, with a completely abstract, heavily defocused distant city and luminous reflections below. Deep ink navy at the very top and center, diffused electric cobalt and blue-violet across both sides, wisps of dusty rose and peach reflected near the bottom corners. Rain runs diagonally down the glass, subtle film grain and optical bloom, rich blacks and sophisticated soft light. Central negative space across the middle and upper third, no clear buildings or recognizable landmarks. This is an ambient layer under a real portrait, white typography, and colorful project thumbnails. No people, furniture, text, logos, graphics, watermarks, or readable signage. True portrait photography aesthetic with excellent color grading, no graphic patterns.

## Status

- **Implemented** — Outfit typography, scroll-aware navigation, 3D artwork globe with filters and grid view, and a compact dark footer.
- **Build Verified** — JavaScript syntax, globe layout, and local asset checks passed for 56 designs, six featured cards, nine videos, and the local Outfit font.
- **Runtime Verified** — Browser checks at 1280 px, 390 px, and 320 px covered the layout, desktop rotation on both axes, phone-width drag, keyboard controls, opening and returning from full-size artwork, filtering and all 56 grid entries, scroll-direction navigation, and contact links.
- **Complete** — The updated local site and globe preview are ready for review.
