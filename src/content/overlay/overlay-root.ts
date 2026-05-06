import type { Viewport, WeatherAnnotation } from '../../shared/types';
import { latLngToPixel, type ContainerSize } from './projection';
import { createIconElement } from './icons';

/**
 * Manages absolutely-positioned weather icons inside the overlay container.
 * Call update() whenever annotations or the viewport changes.
 */
export class OverlayRoot {
  private container: HTMLElement;
  private iconEls: HTMLElement[] = [];
  private annotations: WeatherAnnotation[] = [];
  private viewport: Viewport | null = null;
  private size: ContainerSize = { w: 0, h: 0 };
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement) {
    this.container = container;
    this.measureContainer();

    this.resizeObserver = new ResizeObserver(() => {
      this.measureContainer();
      this.reproject();
    });
    this.resizeObserver.observe(container);
  }

  setViewport(viewport: Viewport): void {
    this.viewport = viewport;
    this.reproject();
  }

  setAnnotations(annotations: WeatherAnnotation[]): void {
    this.annotations = annotations;
    this.rebuild();
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.clear();
  }

  private measureContainer(): void {
    const rect = this.container.getBoundingClientRect();
    this.size = { w: rect.width || this.container.offsetWidth, h: rect.height || this.container.offsetHeight };
  }

  private rebuild(): void {
    this.clear();
    for (const ann of this.annotations) {
      const el = createIconElement(ann.kind, ann.severity);
      this.container.appendChild(el);
      this.iconEls.push(el);
    }
    this.reproject();
  }

  private reproject(): void {
    if (!this.viewport || this.size.w === 0 || this.size.h === 0) return;

    for (let i = 0; i < this.iconEls.length; i++) {
      const ann = this.annotations[i];
      const el = this.iconEls[i];
      if (!ann || !el) continue;

      const px = latLngToPixel(ann.latLng, this.viewport, this.size);
      el.style.left = `${px.x}px`;
      el.style.top = `${px.y}px`;
    }
  }

  private clear(): void {
    for (const el of this.iconEls) {
      el.remove();
    }
    this.iconEls = [];
  }
}
