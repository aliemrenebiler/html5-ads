# HTML5 Ads

This project contains fixed-size HTML5 banner ads for three campaigns: Åhléns, Spotify, and Volvo. Each brand is organized the same way, with size-specific ads, shared styles, brand assets, a preview page, and a brand-local build script.

## Animations

### Åhléns

- The `-30% off` offer pops in on load, then gently pulses every few seconds.
- The `250x250` lotion bottle appears with an upward entrance and keeps a small floating motion.
- Text and CTA areas use simple fade or slide-in entrance animations.

### Spotify

- The disc spins continuously.
- Hovering the disc slows it down and pauses it at its current rotation.
- The equalizer bars animate down to their smallest height when the disc pauses.
- When hover ends, the disc and equalizer start moving again.

### Volvo

- The car enters from the right, stops around the middle, then drives out to the left.
- After a short pause, the car re-enters and repeats the sequence.
- Text, logo, and CTA use subtle fade or slide-in entrance animations.

## HTML5 Ad Considerations

HTML5 ads usually run inside strict ad platform limits, so the files need to be
small, self-contained, and predictable.

Common limitations to keep in mind:

- Ad platforms often have strict zip/file size limits.
- Fixed-size placements should render at exact dimensions like `728x90`, `250x250`, and `160x600`.
- External network requests are often restricted, so required assets should be included in the zip.
- SVG is preferred for logos and simple illustrations because it stays sharp and is usually much smaller than raster images.
- PNG is used only when the visual needs raster detail, like the Volvo car.
- CSS animations are preferred for simple motion because they are lightweight.
- JavaScript is kept focused on interactions or dynamic animation timing.
- Each zip includes only the files used by that specific ad to keep output small.

## How To Build?

Run builds from the project root:

```sh
node ahlens/build.js
node spotify/build.js
node volvo/build.js
```

Each command creates three zip files in that brand's own `dist` folder.

### How Build Works?

The shared build helper is `build-brand.js`. Each brand's `build.js` passes its own folder as a parameter.

The builder reads each size's `index.html`, collects referenced `link`, `script`, and `img` files, scans copied CSS for local `url(...)` assets, copies only those dependencies, rewrites their paths to flat filenames, and zips the result.
