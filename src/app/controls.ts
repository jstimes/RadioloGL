
export enum Key {
    SPACE = 32,

    ONE = 49,
    TWO = 50,
    THREE = 51,
    FOUR = 52,

    A = 65,
    B = 66,
    C = 67,

    D = 68,

    I = 73,
    J = 74,
    K = 75,

    L = 76,
    M = 77,
    N = 78,
    O = 79,
    P = 80,
    
    S = 83,
    T = 84,
    U = 85,
    V = 86,

    W = 87,
    X = 88,

    Z = 90,
}

class Controls {

    /** Value is true if Key is pressed. */
    private readonly keyMap: Map<Key, boolean> = new Map();

    /** Key to action it's bound to. */
    private readonly assignedControlMap: Map<Key, string> = new Map();

    constructor() {
        document.onkeydown = (e: KeyboardEvent) => {
            this.keyMap.set(e.keyCode, true);
        };
        document.onkeyup = (e: KeyboardEvent) => {
            this.keyMap.set(e.keyCode, false);
        };
    }

    isKeyDown(key: Key): boolean {
        return this.keyMap.get(key);
    }

    addAssignedControl(key: Key, action: string) {
        if (this.assignedControlMap.has(key)) {
            throw new Error(`Double-bound a control: ${key}`);
        }
        this.assignedControlMap.set(key, action);
    }

    removeAssignedControl(key: Key) {
        if (!this.assignedControlMap.has(key)) {
            throw new Error('Removing unassigned control');
        }
        this.assignedControlMap.delete(key);
    }

    getAssignedControlMap(): Map<Key, string> {
        return this.assignedControlMap;
    }

    getStringForKey(key: Key) {
        switch(key) {
            case Key.A:
                return 'A';
            case Key.B:
                return 'B';
            case Key.D:
                return 'D';
            case Key.W:
                return 'W';
            case Key.S:
                return 'S';
            case Key.J:
                return 'J';
            case Key.L:
                return 'L';
            case Key.N:
                return 'N';
            case Key.ONE:
                return '1';
            case Key.TWO:
                return '2';
            case Key.THREE:
                return '3';
            case Key.FOUR:
                return '4';
            case Key.SPACE:
                return 'Space';
            default:
                throw new Error("Need to add string for Key");
        }
    }
}

export const CONTROLS = new Controls();