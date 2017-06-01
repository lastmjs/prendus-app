export interface ContainerElement {
    componentId: string;
    readonly subscribedToStore: () => void;
    readonly loadData: () => void;
    readonly subscribeToData: () => void;
    readonly stateChange: (e: CustomEvent) => void;
}
