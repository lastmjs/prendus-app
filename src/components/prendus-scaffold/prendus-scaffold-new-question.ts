import {ContainerElement} from '../../typings/container-element';
import {Course} from '../../typings/course';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {checkForUserToken, getAndSetUser} from '../../redux/actions';
import {State} from '../../typings/state';
import {QuestionScaffold} from '../../typings/question-scaffold';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer';


class PrendusScaffoldNewQuestion extends Polymer.Element implements ContainerElement {
    componentId: string;
    loaded: boolean;
    userToken: string | null;
    user: User | null;
    selectedIndex: number;
    myIndex: number;
    currentQuestionScaffold: QuestionScaffold;
    numberOfAnswers: number;
    action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;

    static get is() { return 'prendus-scaffold-new-question'; }
    static get properties() {
        return {
          selectedIndex: {
            type: Number,
            observer: 'disableNext'
          },
          myIndex: {
            type: Number
          },
          numberOfAnswers: {
            type: Number,
            observer: 'initCurrentQuestionScaffold'
          }
        };
    }

    async connectedCallback() {
        super.connectedCallback();

    }

    /**
     * Called when numberOfAnswers is set
     */
    initCurrentQuestionScaffold(): void {
      // this.action = Actions.initCurrentQuestionScaffold(this.numberOfAnswers);
    }
    /**
     * Checks if the question and answer have been entered and aren't empty and if
     * the inputs aren't empty.
     */
    disableNext(e: any): void {
      try {
        console.log('hello')
        console.log(this.myIndex)
        console.log(this.selectedIndex)
        if(this.myIndex !== undefined && this.selectedIndex !== undefined && this.myIndex === this.selectedIndex) {
          const question: string = this.querySelector('#question') ? this.querySelector('#question').value : null;
          const answer: string = this.querySelector('#answer') ? this.querySelector('#answer').value : null;
          const answers: string[] = getAnswers(this, answer);
          console.log('question', question)
          console.log('answer', answer)
          this.action = Actions.setDisabledNext(!UtilitiesService.isDefinedAndNotEmpty([question, answer]));
          this.action = Actions.updateCurrentQuestionScaffold(question, null, answers, null);
        }
      } catch(error) {
        console.error(error);
      }

      function getAnswers(context: PrendusQuestionScaffoldNewQuestion, text: string): string[] {
        const newAnswers: { [questionScaffoldAnswerId: string]: QuestionScaffoldAnswer } = {
          ...(context.currentQuestionScaffold ? context.currentQuestionScaffold.answers : {}),
          'question0': {
            ...context.currentQuestionScaffold.answers['question0'],
            text,
            correct: true,
            id: 'true'
          }
        };

        return Object.keys(newAnswers || {}).map((key: string, index: number) => {
          return newAnswers[key].text;
        });
      }
    }

    async stateChange(e: CustomEvent) {
        const state: State = e.detail.state;

    }
}

window.customElements.define(PrendusScaffoldNewQuestion.is, PrendusScaffoldNewQuestion);
