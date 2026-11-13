/**
 * Passes a file on: on the iPad via the share menu (AirDrop, Files, …),
 * where that is not possible as a download.
 */
export function canShareFile(file: File): boolean {
  try {
    return typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] }) === true;
  } catch {
    return false;
  }
}

/** Must be called directly from a tap: browsers only allow sharing right after a touch. */
export async function shareOrDownload(file: File): Promise<void> {
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return; // closed by the user
      // Sharing failed for another reason: download instead.
    }
  }
  download(file);
}

function download(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
