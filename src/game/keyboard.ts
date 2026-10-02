export type PlayerKeyAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'sprint'
  | 'shoot'
  | 'pass'
  | 'through'
  | 'cross'
  | 'curve'
  | 'power'
  | 'tackle'
  | 'switch';

export interface PlayerKeyBindings {
  up: string;
  down: string;
  left: string;
  right: string;
  sprint: string;
  shoot: string;
  pass: string;
  /** Passaggio filtrante: palla rasoterra in profondità. */
  through: string;
  cross: string;
  curve: string;
  power: string;
  tackle: string;
  switch: string;
}

export interface KeyboardBindings {
  p1: PlayerKeyBindings;
  p2: PlayerKeyBindings;
  pause: string;
}

export const DEFAULT_KEY_BINDINGS: KeyboardBindings = {
  p1: {
    up: 'KeyW',
    down: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    sprint: 'ShiftLeft',
    shoot: 'Space',
    pass: 'KeyC',
    through: 'KeyB',
    cross: 'KeyV',
    curve: 'KeyF',
    power: 'KeyR',
    tackle: 'KeyE',
    switch: 'KeyQ',
  },
  p2: {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    sprint: 'ShiftRight',
    shoot: 'Enter',
    pass: 'Slash',
    through: 'KeyP',
    cross: 'KeyM',
    curve: 'KeyU',
    power: 'KeyO',
    tackle: 'KeyI',
    switch: 'Period',
  },
  pause: 'Escape',
};

export function cloneKeyBindings(bindings: KeyboardBindings = DEFAULT_KEY_BINDINGS): KeyboardBindings {
  return {
    p1: { ...bindings.p1 },
    p2: { ...bindings.p2 },
    pause: bindings.pause,
  };
}

export function formatKeyCode(code: string): string {
  const labels: Record<string, string> = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Space: 'Space',
    Enter: 'Enter',
    NumpadEnter: 'Num Enter',
    Numpad0: 'Num 0',
    NumpadDecimal: 'Num .',
    Slash: '/',
    Period: '.',
    Escape: 'Esc',
    ShiftLeft: 'Left Shift',
    ShiftRight: 'Right Shift',
    Backspace: 'Backspace',
    Tab: 'Tab',
  };
  if (labels[code]) return labels[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return `Num ${code.slice(6)}`;
  return code;
}
