/** Hands a generated file to the browser. Nothing leaves the device. */
export function downloadTextFile(
  fileName: string,
  contents: string,
  mimeType = "application/json",
): void {
  const blob = new Blob([contents], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next turn so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("read-failed"));
    reader.readAsText(file);
  });
}
