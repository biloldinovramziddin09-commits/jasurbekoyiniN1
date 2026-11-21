export interface InputSnapshot {
  moveX: number; // -1 left, +1 right
  moveY: number; // +1 forward/up, -1 backward/down
  jump: boolean;
  action: boolean; // kick / shoot / handbrake / interact
  sprint: boolean; // boost / 4wd / sprint / descend
  auxPressed: boolean; // E key / toggle vehicle
  pointerDown: boolean;
  pointerDeltaX: number;
  pointerDeltaY: number;
}

export class UnifiedInputManager {
  private keys = new Set<string>();
  private joyX = 0;
  private joyY = 0;
  private touchAction = false;
  private touchJump = false;
  private touchSprint = false;
  private auxQueue = false;
  private pointerDown = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private deltaX = 0;
  private deltaY = 0;
  private targetEl: HTMLElement;

  constructor(targetEl: HTMLElement) {
    this.targetEl = targetEl;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    targetEl.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointermove', this.onPointerMove);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const code = e.code;
    if (
      [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Space',
      ].includes(code)
    ) {
      e.preventDefault();
    }
    if (code === 'KeyE' && !this.keys.has(code)) {
      this.auxQueue = true;
    }
    this.keys.add(code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.button === 0) {
      this.pointerDown = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    }
  };

  private onPointerUp = () => {
    this.pointerDown = false;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.pointerDown) return;
    this.deltaX += e.clientX - this.lastPointerX;
    this.deltaY += e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  public setJoystick(x: number, y: number) {
    this.joyX = Math.max(-1, Math.min(1, x));
    this.joyY = Math.max(-1, Math.min(1, y));
  }

  public pulseAction(kind: 'primary' | 'secondary' | 'aux') {
    if (kind === 'primary') {
      this.touchAction = true;
      window.setTimeout(() => {
        this.touchAction = false;
      }, 180);
    } else if (kind === 'secondary') {
      this.touchJump = true;
      window.setTimeout(() => {
        this.touchJump = false;
      }, 180);
    } else if (kind === 'aux') {
      this.auxQueue = true;
    }
  }

  public setTouchSprint(active: boolean) {
    this.touchSprint = active;
  }

  public consumeAux(): boolean {
    const val = this.auxQueue;
    this.auxQueue = false;
    return val;
  }

  public isKeyPressed(code: string): boolean {
    return this.keys.has(code);
  }

  public getSnapshot(): InputSnapshot {
    let kbX = 0;
    let kbY = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) kbX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) kbX += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) kbY += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) kbY -= 1;

    const moveX = Math.abs(this.joyX) > 0.08 ? this.joyX : kbX;
    const moveY = Math.abs(this.joyY) > 0.08 ? this.joyY : kbY;

    const dx = this.deltaX;
    const dy = this.deltaY;
    this.deltaX = 0;
    this.deltaY = 0;

    return {
      moveX,
      moveY,
      jump: this.keys.has('Space') || this.touchJump,
      action: this.keys.has('Space') || this.touchAction || this.pointerDown,
      sprint:
        this.keys.has('ShiftLeft') ||
        this.keys.has('ShiftRight') ||
        this.touchSprint,
      auxPressed: this.consumeAux(),
      pointerDown: this.pointerDown,
      pointerDeltaX: dx,
      pointerDeltaY: dy,
    };
  }

  public dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.targetEl.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointermove', this.onPointerMove);
  }
}
