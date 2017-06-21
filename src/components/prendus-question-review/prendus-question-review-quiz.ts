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
import {createUUID} from '../../services/utilities-service';

class PrendusQuestionReviewQuiz extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string | null;
    user: User | null;
    selectedIndex: number;
    questions: Question[];

    static get is() { return 'prendus-question-review-quiz'; }

    static get properties() {
        return {
            assignmentId: {
              observer: "getInfoForQuestionScaffolds"
            },
        };
    }
    constructor() {
        super();
        this.componentId = createUUID();
    }
    async connectedCallback() {
        super.connectedCallback();
        // await this.loadAssignmentQuestions();
        this.generateQuiz()
    }

    async loadAssignmentQuestions() {
        await GQLQuery(`
            query {
                Assignment(id: "${this.assignmentId}") {
                    questions(first: 1 after: 2){
                      id
                      code
                      text
                      explanation
                      resource
                      concept{
                        title
                      }
                      answerComments{
                        text
                      }
                    },
                }
            }
        `, this.userToken, (key: string, value: Question[]) => {
            this.action = {
                type: 'SET_COMPONENT_PROPERTY',
                componentId: this.componentId,
                key: 'questions',
                value
            };
            return value;
        }, (error: any) => {
            console.log(error);
        });
    }
    generateQuiz(){
      // const questionComments = this.questions.questions;
      console.log('quiz', quiz)
    }

    async submit(e: any): Promise<void> {
      try {
        const questionId: string = e.target.id;
        const quality: number = this.shadowRoot.querySelector('#quality').value;
        const difficulty: number = this.shadowRoot.querySelector('#difficulty').value;
        const accuracy: number = this.shadowRoot.querySelector('#accuracy').value;
        const data = await GQLMutate(`
          mutation {
            createQuestionRating(
              quality: ${quality}
              difficulty: ${difficulty}
              alignment: ${accuracy}
              raterId: "${this.user.id}"
              questionId: "${questionId}"
            ) {
              id
            }
          }
        `, this.userToken, (error: any) => {
            console.log(error);
        });
        this.action = setDisabledNext(false);
        // Actions.showNotification(this, 'success', 'Ratings submitted');
      } catch(error) {
        console.error(error);
      }
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'selectedIndex',
          value: ++this.selectedIndex
      };

    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (Object.keys(state.components[this.componentId] || {}).includes('selectedIndex')) this.selectedIndex = state.components[this.componentId].selectedIndex;
        this.userToken = state.userToken;

    }
}

window.customElements.define(PrendusQuestionReviewQuiz.is, PrendusQuestionReviewQuiz);
