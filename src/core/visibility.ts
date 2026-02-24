/**
 * Tab visibility handler.
 * Pauses physics simulation and turn timer when the tab is hidden,
 * resumes when the tab becomes visible again.
 */

export interface VisibilityHandlerDeps {
  onHidden: () => void;
  onVisible: () => void;
}

export class VisibilityHandler {
  private deps: VisibilityHandlerDeps;
  private handler: () => void;
  private attached = false;

  constructor(deps: VisibilityHandlerDeps) {
    this.deps = deps;
    this.handler = () => {
      if (document.hidden) {
        this.deps.onHidden();
      } else {
        this.deps.onVisible();
      }
    };
  }

  /** Start listening for visibility changes. */
  attach(): void {
    if (this.attached) return;
    document.addEventListener('visibilitychange', this.handler);
    this.attached = true;
  }

  /** Stop listening for visibility changes. */
  detach(): void {
    if (!this.attached) return;
    document.removeEventListener('visibilitychange', this.handler);
    this.attached = false;
  }
}
