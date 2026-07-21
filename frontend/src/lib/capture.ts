export const SIGNATURE_CLASS = "cric-capturing";

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export async function renderCardImage<T>(
  node: HTMLElement,
  capture: (target: HTMLElement) => Promise<T>,
  opts: { transparent?: boolean } = {},
): Promise<T> {
  const clone = node.cloneNode(true) as HTMLElement;
  clone.classList.add(SIGNATURE_CLASS);
  clone.style.width = `${node.offsetWidth}px`;
  clone.style.margin = "0";

  if (opts.transparent) {
    clone.querySelectorAll<HTMLElement>(".cric-card-frame").forEach((el) => {
      el.style.filter = "none";
    });
  }

  const holder = document.createElement("div");
  holder.style.cssText =
    "position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;z-index:-1;pointer-events:none;";
  holder.appendChild(clone);
  document.body.appendChild(holder);

  try {
    await document.fonts.ready;
    await Promise.all(
      Array.from(clone.querySelectorAll("img")).map((img) =>
        img.decode ? img.decode().catch(() => {}) : Promise.resolve(),
      ),
    );
    await nextFrame();
    await nextFrame();
    if (opts.transparent) await capture(clone).catch(() => {});
    return await capture(clone);
  } finally {
    holder.remove();
  }
}
