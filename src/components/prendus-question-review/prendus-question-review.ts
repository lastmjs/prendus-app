import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {Question} from '../../typings/question';
import {GuiQuestion} from '../../typings/gui-question';
import {GuiAnswer} from '../../typings/gui-answer';
import {QuestionScaffold} from '../../typings/question-scaffold';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer';
import {compileToGuiQuestion} from '../../services/code-to-question-service'
import {QuestionRating} from '../../typings/question-rating';
import {createUUID} from '../../services/utilities-service';

class PrendusQuestionReview extends Polymer.Element {
  componentId: string;
  action: SetPropertyAction | SetComponentPropertyAction;
  loaded: boolean;

  static get is() { return 'prendus-question-review'; }

  static get properties() {
    return {
        question: Object
    };
  }
  constructor() {
    super();
    this.componentId = createUUID();
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._fireLocalAction('loaded', true);
  }

  _scaffold(question: Question): QuestionScaffold {
    if (!question) return {};
    const gui = compileToGuiQuestion(question.text, question.code);
    const answers = gui.answers.map((answer, i) => {
      return {
        text: answer.text,
        correct: answer.correct,
        comment: question.answerComments[i].text,
        id: `question$[i]`
      }
    });
    return {
      id: question.id,
      answers,
      question: gui.stem,
      concept: question.concept,
      resource: question.resource,
      explanation: question.explanation,
      convertedQuestion: question
    }
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId];
    const keys = Object.keys(componentState || {});
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
  }
}

window.customElements.define(PrendusQuestionReview.is, PrendusQuestionReview);
