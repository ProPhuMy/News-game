/** A real town frame has far more than this; a cleared or failed canvas has one or two. */
export const MIN_DISTINCT_COLORS = 16;

/** Counts colors after dropping the 3 low bits per channel, so antialiasing noise does not inflate the count. */
export function countDistinctColors(data: Uint8ClampedArray, sampleEvery = 4): number {
  const seen = new Set<number>();
  for (let i = 0; i + 3 < data.length; i += 4 * sampleEvery) {
    seen.add(((data[i]! >> 3) << 10) | ((data[i + 1]! >> 3) << 5) | (data[i + 2]! >> 3));
  }
  return seen.size;
}

export function readyVerdict(input: { webgl: boolean; distinctColors: number }):
  { status: 'ready' } | { status: 'error'; error: string } {
  if (!input.webgl) return { status: 'error', error: 'webgl-unavailable' };
  if (input.distinctColors < MIN_DISTINCT_COLORS) {
    return { status: 'error', error: `empty-capture: only ${input.distinctColors} distinct colors` };
  }
  return { status: 'ready' };
}

/** Needs a WebGL canvas created with preserveDrawingBuffer: true. */
export function measureCanvas(source: HTMLCanvasElement): { width: number; height: number; distinctColors: number } {
  const copy = document.createElement('canvas');
  copy.width = source.width;
  copy.height = source.height;
  const context = copy.getContext('2d');
  if (!context || copy.width === 0 || copy.height === 0) return { width: copy.width, height: copy.height, distinctColors: 0 };
  context.drawImage(source, 0, 0);
  const image = context.getImageData(0, 0, copy.width, copy.height);
  return { width: copy.width, height: copy.height, distinctColors: countDistinctColors(image.data) };
}
