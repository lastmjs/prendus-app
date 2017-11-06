import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {checkForUserToken, getAndSetUser, setNotification} from '../../redux/actions';
import {createUUID, navigate} from '../../node_modules/prendus-shared/services/utilities-service';
import {NotificationType, QuestionType} from '../../services/constants-service';
import {User} from '../../typings/user';
import {GQLVariables} from '../../typings/gql-variables';

class PrendusCreateInstitution extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
    user: User;
    userToken: string;

    static get is() { return 'prendus-create-institution'; }

    constructor() {
        super();
        this.componentId = createUUID();
    }
    async connectedCallback() {
        super.connectedCallback();
    }

    createInstitution(){

    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusCreateInstitution.is, PrendusCreateInstitution);

async function saveInstitution(variables: GQLVariables): Promise<string|null> {
  try{
    const data = await GQLRequest(`mutation newInstitution($authorId: ID!, $conceptId: ID!, $resource: String!, $text: String!, $code: String!, $assignmentId: ID!, $imageIds: [ID!]!, $answerComments: [QuestionanswerCommentsAnswerComment!]!) {
      createQuestion(
        authorId: $authorId,
        conceptId: $conceptId,
        assignmentId: $assignmentId,
        resource: $resource,
        text: $text,
        code: $code,
        imagesIds: $imageIds
        answerComments: $answerComments
      ) {
        id
      }
    }`, variables, this.userToken, this._handleGQLError.bind(this));
    if (!data) {
      throw "Unable to save institution"
    }
    return data.createQuestion.id;
  }catch(error){
    throw error;
  }
}
