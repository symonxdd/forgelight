import { useEffect, useState, type DragEvent } from "react";
import { attachStartImage, startFromImage } from "../stores/startImage";

function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA)$/.test(target.tagName));
}

function carriesImage(event: DragEvent | globalThis.DragEvent): boolean {
  const types = event.dataTransfer?.types ?? [];
  return types.includes("Files") || types.includes("text/uri-list");
}

/** An image Forgelight itself shows (a result being dragged from the session list), by address. */
function ownImageUrl(event: DragEvent): string | null {
  const url = event.dataTransfer.getData("text/uri-list").split("\n")[0]?.trim() ?? "";
  return url.startsWith("blob:") || url.startsWith(window.location.origin) ? url : null;
}

/**
 * Starting images by dropping and pasting, for the Generate screen.
 *
 * Pasting: an image on the clipboard becomes the starting image, wherever the cursor is.
 * Text pastes are untouched: text in a text field goes where it always went.
 * Dropping: anywhere on the stage (image and prompt card). Elsewhere on the page a dropped
 * file is ignored, instead of the browser opening it and leaving Forgelight.
 */
export function useStartImageInput() {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const data = event.clipboardData;
      const file = data ? [...data.files].find((f) => f.type.startsWith("image/")) : undefined;
      if (!file || (isTextField(event.target) && data?.types.includes("text/plain"))) return;
      event.preventDefault();
      void attachStartImage(file, "Starting image added from the clipboard.");
    };
    const swallow = (event: globalThis.DragEvent) => {
      if (carriesImage(event)) event.preventDefault();
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("dragover", swallow);
    window.addEventListener("drop", swallow);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", swallow);
      window.removeEventListener("drop", swallow);
    };
  }, []);

  const dropTarget = {
    onDragOver: (event: DragEvent) => {
      if (!carriesImage(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setDragging(true);
    },
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop: (event: DragEvent) => {
      setDragging(false);
      if (!carriesImage(event)) return;
      event.preventDefault();
      const file = [...event.dataTransfer.files][0];
      if (file) {
        void attachStartImage(file);
        return;
      }
      const url = ownImageUrl(event);
      if (url) void startFromImage(url);
    },
  };

  return { dragging, dropTarget };
}
