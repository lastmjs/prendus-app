export interface State {
    readonly userToken: string;
    readonly components: {
        readonly [componentId: string]: any;
    }
}
