export interface Action {
    readonly type: string;
}

export interface SetPropertyAction {
    readonly type: string;
    readonly key: string;
    readonly value: any;
}

export interface SetComponentPropertyAction {
    readonly type: string;
    readonly componentId: string;
    readonly key: string;
    readonly value: any;
}
