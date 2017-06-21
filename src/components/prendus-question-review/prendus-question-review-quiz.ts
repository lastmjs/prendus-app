import {SetPropertyAction, SetComponentPropertyAction, initializeQuestionScaffoldsToRate } from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {setDisabledNext} from '../../redux/actions'
import {User} from '../../typings/user';
import {Question} from '../../typings/question';
import {GuiQuestion} from '../../typings/gui-question';
import {GuiAnswer} from '../../typings/gui-answer';
import {QuestionScaffold} from '../../typings/question-scaffold';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer';
import {generateGuiData} from '../../services/code-to-question-service'
import {QuestionRating} from '../../typings/question-rating';
import {createUUID, getPrendusLTIServerOrigin} from '../../services/utilities-service';

class PrendusQuestionReviewQuiz extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string | null;
    user: User | null;
    selectedIndex: number;
    questions: Question[];
    assignmentId: string;
    quizId: string;


    static get is() { return 'prendus-question-review-quiz'; }

    static get properties() {
        return {
            questions: {
              observer: "generateQuiz"
            },
            assignmentId: {
            }
        };
    }
    constructor() {
        super();
        this.componentId = createUUID();
    }
    async connectedCallback() {
        super.connectedCallback();
    }

    async generateQuiz(){
      const questionIds = this.questions.map(function(a) {return a.id;});
      const questionIdsString = `["${questionIds.join('","')}"]`;
      const data = await GQLMutate(`
          mutation {
              createQuiz(
                  authorId: "${this.user.id}"
                  title: "Assignment Quiz"
                  questionsIds: ${questionIdsString}
              ) {
                  id
              }
          }
      `, this.userToken, (error: any) => {
          alert(error);
      });
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'quizId',
          value: data.createQuiz.id
      };
    }

    submitQuiz(){
      console.log('submitQuiz')
      window.fetch(`${getPrendusLTIServerOrigin()}/api/lti/grade-passback`, {
          method: 'post',
          mode: 'no-cors',
          credentials: 'include'
      });
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (Object.keys(state.components[this.componentId] || {}).includes('selectedIndex')) this.selectedIndex = state.components[this.componentId].selectedIndex;
        if (Object.keys(state.components[this.componentId] || {}).includes('quizId')) this.quizId = state.components[this.componentId].quizId;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusQuestionReviewQuiz.is, PrendusQuestionReviewQuiz);
