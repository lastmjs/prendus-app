import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {Mode} from '../../typings/mode';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {Concept} from '../../typings/concept';
import {User} from '../../typings/user';

class PrendusConcept extends Polymer.Element implements ContainerElement {
    conceptId: string;
    concept: Concept;
    subjectId: string;
    mode: Mode;
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string;
    user: User;

    static get is() { return 'prendus-concept'; }
    static get properties() {
        return {
            conceptId: {
                observer: 'conceptIdChanged'
            },
            subjectId: {

            },
            mode: {

            }
        };
    }

    connectedCallback() {
        super.connectedCallback();

        this.componentId = this.shadowRoot.querySelector('#reduxStoreElement').elementId;
        this.subscribeToData();
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
    }

    isViewMode(mode: Mode) {
        return mode === 'view';
    }

    isEditMode(mode: Mode) {
        return mode === 'edit';
    }

    isCreateMode(mode: Mode) {
        return mode === 'create';
    }

    async conceptIdChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'conceptId',
            value: this.conceptId
        };

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: false
        };
        await this.loadData();
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
    }
    subscribeToData() {

    }
    async loadData() {
        await GQLQuery(`
            query {
                concept${this.conceptId}: Concept(id: "${this.conceptId}") {
                    title
                    subject {
                        id
                    }
                }
            }
        `, this.userToken, (key: string, value: any) => {
            this.action = {
                type: 'SET_PROPERTY',
                key,
                value
            };
        }, (error: any) => {
            alert(error);
        });
    }

    async saveConcept() {
        const title = this.shadowRoot.querySelector('#titleInput').value;
        //TODO replace this with an updateOrCreate mutation once you figure out how to do that. You had a conversation on slack about it
        if (this.conceptId) {
            GQLMutate(`
                mutation {
                    updateConcept(
                        id: "${this.conceptId}"
                        title: "${title}"
                        subjectId: "${this.subjectId}"
                    ) {
                        id
                    }
                }
            `, this.userToken, (error: any) => {
                alert(error);
            });
        }
        else {
          console.log(`${this.subjectId}`)
            const data = await GQLMutate(`
                mutation {
                    createConcept(
                        title: "${title}"
                        subjectId: "${this.subjectId}"
                    ) {
                        id
                    }
                }
            `, this.userToken, (error: any) => {
              console.log('error', error)
                alert(error);
            });
            console.log('data', data)
            this.action = {
                type: 'SET_COMPONENT_PROPERTY',
                componentId: this.componentId,
                key: 'conceptId',
                value: data.createConcept.id
            };
        }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        this.conceptId = state.components[this.componentId] ? state.components[this.componentId].conceptId : this.conceptId;
        this.concept = state[`concept${this.conceptId}`];
        this.subjectId = this.concept ? this.concept.subject.id : this.subjectId;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusConcept.is, PrendusConcept);
