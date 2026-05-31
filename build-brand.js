const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const DEFAULT_SIZES = ["728x90", "250x250", "160x600"];

const isLocalReference = (reference) => !/^(https?:|data:|#)/.test(reference);

const collectReferencedFiles = (html) => {
  const references = [];
  const patterns = [
    /<link\b[^>]*href="([^"]+)"/g,
    /<script\b[^>]*src="([^"]+)"/g,
    /<img\b[^>]*src="([^"]+)"/g,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      references.push(match[1]);
    }
  }

  return references.filter(isLocalReference);
};

const rewriteReference = (html, original, flatName) =>
  html.replaceAll(`"${original}"`, `"${flatName}"`);

const buildBrand = ({ brandDir, sizes = DEFAULT_SIZES }) => {
  const distDir = path.join(brandDir, "dist");
  const workDir = path.join(distDir, ".build");

  const assertBrandFile = (sourcePath, size, reference) => {
    const relativePath = path.relative(brandDir, sourcePath);

    if (
      relativePath.startsWith("..") ||
      path.isAbsolute(relativePath) ||
      !fs.existsSync(sourcePath)
    ) {
      throw new Error(`Missing build dependency for ${size}: ${reference}`);
    }
  };

  const copyDependency = (sourcePath, packageDir, usedNames, size) => {
    const fileName = path.basename(sourcePath);

    if (usedNames.has(fileName) && usedNames.get(fileName) !== sourcePath) {
      throw new Error(`Duplicate build file name found: ${fileName}`);
    }

    if (usedNames.has(fileName)) {
      return fileName;
    }

    usedNames.set(fileName, sourcePath);

    if (path.extname(sourcePath) === ".css") {
      const sourceDir = path.dirname(sourcePath);
      let css = fs.readFileSync(sourcePath, "utf8");

      css = css.replace(
        /url\((["']?)([^"')]+)\1\)/g,
        (match, quote, reference) => {
          if (!isLocalReference(reference)) {
            return match;
          }

          const assetPath = path.resolve(sourceDir, reference);
          assertBrandFile(assetPath, size, reference);

          const flatAssetName = copyDependency(
            assetPath,
            packageDir,
            usedNames,
            size,
          );

          return `url(${quote}${flatAssetName}${quote})`;
        },
      );

      fs.writeFileSync(path.join(packageDir, fileName), css);
    } else {
      fs.copyFileSync(sourcePath, path.join(packageDir, fileName));
    }

    return fileName;
  };

  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });

  for (const size of sizes) {
    const adDir = path.join(brandDir, size);
    const packageDir = path.join(workDir, size);
    const sourceHtmlPath = path.join(adDir, "index.html");
    const zipPath = path.join(distDir, `${size}.zip`);
    const usedNames = new Map();

    fs.mkdirSync(packageDir, { recursive: true });

    let html = fs.readFileSync(sourceHtmlPath, "utf8");
    const references = collectReferencedFiles(html);

    for (const reference of references) {
      const sourcePath = path.resolve(adDir, reference);

      assertBrandFile(sourcePath, size, reference);

      const flatName = copyDependency(sourcePath, packageDir, usedNames, size);
      html = rewriteReference(html, reference, flatName);
    }

    fs.writeFileSync(path.join(packageDir, "index.html"), html);
    execFileSync("zip", ["-qr", zipPath, "."], { cwd: packageDir });

    console.log(`Built ${path.relative(brandDir, zipPath)}`);
  }

  fs.rmSync(workDir, { recursive: true, force: true });
};

module.exports = buildBrand;
