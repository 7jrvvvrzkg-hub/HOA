/** Makes rendered Word pages usable on a narrow screen. A Word page is about
 * 816px wide with an inch of margin on every side, which is unreadable (or
 * cut off) on a phone. On narrow screens the pages are turned into a single
 * fluid column (see `.docx-fluid` in globals.css) so text stays full size;
 * on wide screens they're left exactly as Word drew them. Returns a function
 * that removes the resize listener. */
export function fitDocxToWidth(root: HTMLElement, scroller: HTMLElement | null, listen = true): () => void {
  function apply() {
    const wrapper = root.querySelector<HTMLElement>(".docx-preview-wrapper");
    if (!wrapper || !scroller) return;
    const available = scroller.clientWidth;
    if (available === 0) return; // hidden right now; leave it as it was
    wrapper.classList.toggle("docx-fluid", available < 700);
  }
  apply();
  if (!listen) return () => {};
  window.addEventListener("resize", apply);
  return () => window.removeEventListener("resize", apply);
}
