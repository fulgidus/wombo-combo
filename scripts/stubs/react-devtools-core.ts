/**
 * Build-time stand-in for `react-devtools-core`.
 *
 * Ink imports react-devtools-core from its DEV-only devtools module. Bun hoists
 * that import to the top level of the bundle, so the real package (a UMD bundle
 * that reads the browser global `self`) would be evaluated on every start, even
 * without DEV=true, and crash Node. The shipped CLI never needs devtools, so the
 * build aliases the package to this no-op module instead.
 */
const devtools = {
  initialize(): void {},
  connectToDevTools(): void {},
};

export default devtools;
