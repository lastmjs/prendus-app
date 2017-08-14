import {SetPropertyAction, SetComponentPropertyAction } from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {setDisabledNext, checkForUserToken} from '../../redux/actions'
import {User} from '../../typings/user';
import {Assignment} from '../../typings/assignment';
import {Question} from '../../typings/question';
import {GuiQuestion} from '../../typings/gui-question';
import {GuiAnswer} from '../../typings/gui-answer';
import {QuestionScaffold} from '../../typings/question-scaffold';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer';
import {QuestionRating} from '../../typings/question-rating';
import {createUUID, getPrendusLTIServerOrigin, shuffleArray} from '../../services/utilities-service';

class PrendusAssignmentQuiz extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string | null;
    user: User | null;
    selectedIndex: number;
    questions: Question[];
    quizQuestions: Question[];
    assignmentId: string;
    quizId: string;


    static get is() { return 'prendus-assignment-quiz'; }

    static get properties() {
        return {
            assignmentId: {
              observer: "loadQuiz"
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
    _fireLocalAction(key: string, value: any) {
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
        componentId: this.componentId,
        key,
        value
      };
    }
    async loadQuiz(){
      await this.loadAssignmentQuestions();
      await this.generateQuiz();
    }
    async loadAssignmentQuestions() {
        await GQLQuery(`
            query {
                Assignment(id: "${this.assignmentId}") {
                    questions{
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
        `, this.userToken, (key: string, value: Assignment) => {
            if(value){
              const quizQuestions = shuffleArray(value.questions).slice(0,10);
              this._fireLocalAction('quizQuestions', quizQuestions)
            }else{
              this._fireLocalAction('questions', null)
            }

        }, (error: any) => {
            console.log(error);
        });
    }
    async generateQuiz(){
      const questionIds = this.quizQuestions.map(function(a) {return a.id;});
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
      this._fireLocalAction('quizId', data.createQuiz.id)
    }

    submitQuiz(){
      window.fetch(`${getPrendusLTIServerOrigin()}/lti/grade-passback`, {
          method: 'post',
          mode: 'no-cors',
          credentials: 'include'
      });
      alert('Congratulations! You have successfully completed the Quiz')
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (Object.keys(state.components[this.componentId] || {}).includes('selectedIndex')) this.selectedIndex = state.components[this.componentId].selectedIndex;
        if (Object.keys(state.components[this.componentId] || {}).includes('questions')) this.questions = state.components[this.componentId].questions;
        if (Object.keys(state.components[this.componentId] || {}).includes('quizQuestions')) this.quizQuestions = state.components[this.componentId].quizQuestions;
        if (Object.keys(state.components[this.componentId] || {}).includes('quizId')) this.quizId = state.components[this.componentId].quizId;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusAssignmentQuiz.is, PrendusAssignmentQuiz);
