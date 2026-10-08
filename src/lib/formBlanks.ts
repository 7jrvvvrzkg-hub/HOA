/**
 * Turns the blanks in a rendered Word form into things a resident can type
 * into. Runs on the DOM that docx-preview produced, in the browser.
 *
 * What counts as a blank (so whoever writes the .docx knows what to type):
 *   - a run of 3 or more underscores:   Name: ______________
 *   - a named blank in double brackets: [[Unit number]]
 *   - an empty checkbox:                [ ]  I agree
 *
 * Each blank becomes a field. Its label (what the board sees next to the
 * answer) is the text that comes before it on the same line, the double
 * bracket name if there is one, or for a checkbox the words after it.
 */

export type FormField = {
  el: HTMLInputElement;
  label: string;
  kind: "text" | "checkbox";
};

const BLANK = /(_{3,})|\[\[([^\]]*)\]\]|\[ ?\]/g;

function cleanLabel(raw: string) {
  return raw
    .replace(/_{2,}/g, " ")
    .replace(/\[\[[^\]]*\]\]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[:\-–—\s]+$/, "")
    .trim()
    .slice(-120);
}

/** Nearest block-level container text, used for finding a label. */
function blockOf(node: Node): HTMLElement | null {
  let el: HTMLElement | null = node.parentElement;
  while (el && !/^(P|TD|TH|LI|DIV)$/.test(el.tagName)) el = el.parentElement;
  return el;
}

function previousTextBefore(block: HTMLElement): string {
  // In a table, the label is usually the cell to the left.
  const cell = block.closest("td,th");
  const prevCell = cell?.previousElementSibling;
  if (prevCell?.textContent?.trim()) return prevCell.textContent;
  // Otherwise the previous paragraph.
  let prev = block.previousElementSibling;
  while (prev) {
    if (prev.textContent?.trim()) return prev.textContent;
    prev = prev.previousElementSibling;
  }
  return "";
}

export function activateBlanks(root: HTMLElement, onChange?: () => void): FormField[] {
  const fields: FormField[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n as Text;
    BLANK.lastIndex = 0;
    if (BLANK.test(text.data)) textNodes.push(text);
  }

  for (const textNode of textNodes) {
    const block = blockOf(textNode);
    const text = textNode.data;
    const frag = document.createDocumentFragment();
    let last = 0;
    BLANK.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = BLANK.exec(text))) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const input = document.createElement("input");
      input.addEventListener("input", () => onChange?.());
      let label = "";
      let kind: FormField["kind"] = "text";

      if (m[0].startsWith("[") && !m[0].startsWith("[[")) {
        kind = "checkbox";
        input.type = "checkbox";
        input.className = "form-blank-check";
        label = cleanLabel(text.slice(m.index + m[0].length)) || cleanLabel(block?.textContent?.replace(/\[ ?\]/g, "") ?? "");
      } else {
        input.type = "text";
        input.className = "form-blank";
        input.maxLength = 500;
        const named = m[2]?.trim();
        const widthChars = named ? 24 : Math.min(Math.max(m[1].length, 10), 60);
        input.style.width = `${widthChars}ch`;
        input.setAttribute("autocomplete", "off");
        // Label: the named blank if given, else text before it on the line,
        // else the cell to the left / the line above.
        const before = text.slice(0, m.index);
        const lineBefore = (() => {
          if (!block) return before;
          const full = block.textContent ?? "";
          const idx = full.indexOf(text);
          return idx >= 0 ? full.slice(0, idx) + before : before;
        })();
        label = named || cleanLabel(lineBefore) || (block ? cleanLabel(previousTextBefore(block)) : "");
        if (named) input.placeholder = named;
      }
      input.setAttribute("aria-label", label || "form field");
      frag.appendChild(input);
      fields.push({ el: input, label: label || `Field ${fields.length + 1}`, kind });
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    textNode.replaceWith(frag);
  }
  return fields;
}

export function collectAnswers(fields: FormField[]) {
  return fields.map((f) => ({
    label: f.label.slice(0, 300),
    value: f.kind === "checkbox" ? (f.el.checked ? "Yes" : "No") : f.el.value.trim().slice(0, 2000),
  }));
}

/** True if the person has typed or ticked anything at all. */
export function hasAnyAnswer(fields: FormField[]) {
  return fields.some((f) => (f.kind === "checkbox" ? f.el.checked : f.el.value.trim() !== ""));
}
