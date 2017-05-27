export interface PrendusElement {
    loadData: () => void;
    stateChange: (e: CustomEvent) => void;
}
