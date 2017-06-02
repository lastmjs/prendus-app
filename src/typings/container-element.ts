export interface ContainerElement {
    componentId: string;
    readonly loadData: () => void;
    readonly subscribeToData: () => void;
    readonly stateChange: (e: CustomEvent) => void;
}
