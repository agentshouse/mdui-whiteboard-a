import { FONT_FAMILY, VERTICAL_ALIGN, getFontString } from "@excalidraw/common";
import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";
import type { MarkRequired } from "@excalidraw/common/utility-types";

import { newTextElement } from "./newElement";
import { wrapText } from "./textWrapping";
import { isIframeElement } from "./typeChecks";
import type {
  ExcalidrawIframeLikeElement,
  IframeData,
  NonDeletedExcalidrawElement,
} from "./types";

/**
 * Whiteboard supports canvas content, not remote or executable embeds.
 * Keep the donor's nullable metadata contract for restored placeholders and
 * link-editing callers without shipping service parsers or script templates.
 */
export const getEmbedLink = (
  _link: string | null | undefined,
): MarkRequired<IframeData, "sandbox"> | null => null;

export const embeddableURLValidator = (
  _url: string | null | undefined,
  _validateEmbeddable: ExcalidrawProps["validateEmbeddable"],
): boolean => false;

export const createPlaceholderEmbeddableLabel = (
  element: ExcalidrawIframeLikeElement,
): NonDeletedExcalidrawElement => {
  let text: string;
  if (isIframeElement(element)) {
    text = "Embedded content is not supported";
  } else {
    text =
      !element.link || element?.link === "" ? "Embedded content is not supported" : element.link;
  }

  const fontSize = Math.max(
    Math.min(element.width / 2, element.width / text.length),
    element.width / 30,
  );
  const fontFamily = FONT_FAMILY.Helvetica;

  const fontString = getFontString({
    fontSize,
    fontFamily,
  });

  return newTextElement({
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
    strokeColor:
      element.strokeColor !== "transparent" ? element.strokeColor : "black",
    backgroundColor: "transparent",
    fontFamily,
    fontSize,
    text: wrapText(text, fontString, element.width - 20),
    textAlign: "center",
    verticalAlign: VERTICAL_ALIGN.MIDDLE,
    angle: element.angle ?? 0,
  });
};

