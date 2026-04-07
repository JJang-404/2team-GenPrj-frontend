import html2canvas from 'html2canvas';

export async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll('img'));

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        })
    )
  );
}

export async function captureElementAsDataUrl(root: HTMLElement, scale = 1.5) {
  await waitForImages(root);
  await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));

  const canvas = await html2canvas(root, {
    backgroundColor: null,
    scale,
    useCORS: true,
  });

  return canvas.toDataURL('image/png');
}
