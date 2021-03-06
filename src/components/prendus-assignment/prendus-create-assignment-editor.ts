import {NotificationType, ASSIGNMENT_VALIDATION_ERROR, DEFAULT_EVALUATION_RUBRIC} from '../../services/constants-service';
import {fireLocalAction, createUUID} from '../../node_modules/prendus-shared/services/utilities-service';
import {compileToAssessML} from '../../node_modules/assessml/assessml';
import {AST, Content, Radio} from '../../node_modules/assessml/assessml.d';
import {Concept, SetComponentPropertyAction, User, Assignment, State, Rubric} from '../../prendus.d';
import {setNotification} from '../../redux/actions';
import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';

class PrendusCreateAssignmentEditor extends Polymer.Element {
    componentId: string;
    action: SetComponentPropertyAction;
    question: {
        text: string;
        code: string;
    };
    concept: Concept;
    resource: string;
    user: User | null;
    userToken: string | null;
    assignment: Assignment;
    selectedLicenseId: string;
    selectedVisibilityId: string;

    static get is() { return 'prendus-create-assignment-editor'; }
    static get properties() {
        return {
            assignment: Object,
            question: {
                observer: 'questionChanged'
            }
        };
    }

    constructor() {
      super();
      this.componentId = createUUID();
    }

    async connectedCallback() {
        super.connectedCallback();

        const licenses = await loadLicenses(this.userToken || 'USER_TOKEN_NOT_SET', this.handleGQLError.bind(this));
        this.action = fireLocalAction(this.componentId, 'licenses', licenses);
        if (licenses[0]) this.action = fireLocalAction(this.componentId, 'selectedLicenseId', licenses[0].id);

        const visibilities = await loadVisibilities(this.userToken || 'USER_TOKEN_NOT_SET', this.handleGQLError.bind(this));
        this.action = fireLocalAction(this.componentId, 'visibilities', visibilities);
        if (visibilities[0]) this.action = fireLocalAction(this.componentId, 'selectedVisibilityId', visibilities[0].id);
    }

    questionChanged() {
        this.action = fireLocalAction(this.componentId, '_question', {
            text: '',
            code: ''
        });
        this.action = fireLocalAction(this.componentId, 'concept', null);
        this.action = fireLocalAction(this.componentId, 'resource', '');
    }

    submitClick() {
        try {
          validate(this.concept, this.resource);
        } catch (e) {
          this.dispatchEvent(new CustomEvent(ASSIGNMENT_VALIDATION_ERROR));
          this.action = setNotification(e.message, NotificationType.ERROR);
          return;
        }

        const text = this.shadowRoot.querySelector('#question-editor')._question.text;

        const rawCode = this.shadowRoot.querySelector('#question-editor')._question.code;
        const code = `evaluationRubric = '${rubricStr(DEFAULT_EVALUATION_RUBRIC)}';\n${rawCode}`;

        const question = {
          authorId: this.user.id,
          assignmentId: this.assignment.id,
          text,
          code,
          ...this.concept.id && {conceptId: this.concept.id},
          ...!this.concept.id && {concept: this.concept},
          resource: this.resource,
          answerComments: [],
          imageIds: [],
          licenseId: this.selectedLicenseId,
          visibilityId: this.selectedVisibilityId
        };

        this.dispatchEvent(new CustomEvent('question-created', {
            detail: {
                question
            }
        }));
    }

    licenseInfoIconClick(e) {
        e.stopPropagation();
        this.shadowRoot.querySelector(`#licenseInfoDialog${e.model.item.type}`).open();
    }

    licenseSelected(e) {
        this.action = fireLocalAction(this.componentId, 'selectedLicenseId', e.model.item.id);
    }

    getLicenseInfoIconHidden(selectedLicenseId, item) {
        return selectedLicenseId !== item.id;
    }

    visibilityInfoIconClick(e) {
        e.stopPropagation();
        this.shadowRoot.querySelector(`#visibilityInfoDialog${e.model.item.type}`).open();
    }

    visibilitySelected(e) {
        this.action = fireLocalAction(this.componentId, 'selectedVisibilityId', e.model.item.id);
    }

    getVisibilityInfoIconHidden(selectedVisibilityId, item) {
        return selectedVisibilityId !== item.id;
    }

    licenseInfoDialogCloseClick(e) {
        this.shadowRoot.querySelector(`#licenseInfoDialog${e.model.item.type}`).close();
    }

    visibilityInfoDialogCloseClick(e) {
        this.shadowRoot.querySelector(`#visibilityInfoDialog${e.model.item.type}`).close();
    }

    handleConcept(e: CustomEvent) {
        this.action = fireLocalAction(this.componentId, 'concept', e.detail.concept);
    }

    handleResource(e: Event) {
      this.action = fireLocalAction(this.componentId, 'resource', e.target.value);
    }

    handleGQLError(err: any) {
      this.action = setNotification(err.message, NotificationType.ERROR);
    }

    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;
        const componentState = state.components[this.componentId] || {};
        const keys = Object.keys(componentState);

        if (keys.includes('concept')) this.concept = componentState.concept;
        if (keys.includes('resource')) this.resource = componentState.resource;
        if (keys.includes('_question')) this._question = componentState._question;
        if (keys.includes('licenses')) this.licenses = componentState.licenses;
        if (keys.includes('selectedLicenseId')) this.selectedLicenseId = componentState.selectedLicenseId;
        if (keys.includes('visibilities')) this.visibilities = componentState.visibilities;
        if (keys.includes('selectedVisibilityId')) this.selectedVisibilityId = componentState.selectedVisibilityId;
        this.user = state.user;
        this.userToken = state.userToken;
    }
}

window.customElements.define(PrendusCreateAssignmentEditor.is, PrendusCreateAssignmentEditor);

function validate(concept: Concept, resource: string) {
    const empty = (str: any) => str == undefined || str.toString().trim() === '';
    if (!concept || (empty(concept.id) && empty(concept.title))) throw new Error('Concept must be entered or selected');
    if (empty(resource)) throw new Error('Resource must not be empty');
}

function rubricStr(rubric: Rubric): string {
  return JSON.stringify(rubric).replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\n/g, '\\n');
}

async function loadLicenses(userToken: string, handleError: any) {
    const data = await GQLRequest(`
        query {
            allLicenses(orderBy: precedence_ASC) {
                id
                commonName
                description
                hyperlink
                type
            }
        }
    `, {}, userToken, handleError);

    return data.allLicenses;
}

async function loadVisibilities(userToken: string, handleError: any) {
    const data = await GQLRequest(`
        query {
            allVisibilities(orderBy: precedence_ASC) {
                id
                commonName
                description
                type
            }
        }
    `, {}, userToken, handleError);

    return data.allVisibilities;
}
