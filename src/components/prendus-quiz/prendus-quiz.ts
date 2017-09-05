import {ContainerElement} from '../../typings/container-element';
import {SetComponentPropertyAction, SetPropertyAction, DefaultAction} from '../../typings/actions';
import {GQLQuery} from '../../services/graphql-service';
import {Quiz} from '../../typings/quiz';
import {checkForUserToken, setNotification} from '../../redux/actions';
import {createUUID} from '../../services/utilities-service';
import {Question} from '../../typings/question';
import {NotificationType} from '../../services/constants-service';

class PrendusQuiz extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetComponentPropertyAction | SetPropertyAction | DefaultAction;
    userToken: string;
    quizId: string;
    quiz: Quiz;
    loaded: boolean;
    currentQuestionId: string;
    currentQuestion: Question;
    currentQuestionIndex: number;
    random: boolean;
    numberOfQuestions: number;

    static get is() { return 'prendus-quiz'; }
    static get properties() {
        return {
            quizId: {
                type: String,
                observer: 'quizIdChanged'
            },
            random: {
                type: Boolean,
                observer: 'randomChanged'
            },
            numberOfQuestions: {
                type: Number,
                observer: 'numberOfQuestionsChanged'
            }
        };
    }

    constructor() {
        super();

        this.componentId = createUUID();
    }

    connectedCallback() {
        super.connectedCallback();

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };

        this.action = checkForUserToken();

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'currentQuestionIndex',
            value: -1
        };
    }

    loadNewQuestion() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'currentQuestionIndex',
            value: this.currentQuestionIndex + 1
        };
    }

    getCurrentQuestionNumber(currentQuestionIndex: number) {
        return currentQuestionIndex + 1;
    }

    showNewQuestionButton(currentQuestionIndex: number, numberOfQuestions: number) {
        return currentQuestionIndex + 1 !== numberOfQuestions;
    }

    async quizIdChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'quizId',
            value: this.quizId
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
            key: 'numberOfQuestions',
            value: this.numberOfQuestions || (this.quiz ? this.quiz.questions.length : this.numberOfQuestions)
        };

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };

        this.loadNewQuestion();
    }

    randomChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'random',
            value: this.random
        };
    }

    numberOfQuestionsChanged(newValue: boolean, oldValue: boolean) {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'numberOfQuestions',
            value: this.numberOfQuestions
        };
    }

    async loadData() {
        await GQLQuery(`
            query {
                Quiz(id: "${this.quizId}") {
                    title
                    questions {
                        text
                        code
                    }
                }
            }
        `, this.userToken, (key: string, value: any) => {
            this.action = {
                type: 'SET_COMPONENT_PROPERTY',
                componentId: this.componentId,
                key,
                value
            };
        }, (error: any) => {
              this.action = setNotification(error.message, NotificationType.ERROR)
        });
    }

    getCurrentQuestionInfo(currentQuestionId: string, currentQuestion: Question, currentQuestionIndex: number, previousCurrentQuestionIndex: number, quiz: Quiz, random: boolean) {
        if (!quiz) {
            return {
                currentQuestionId,
                currentQuestion
            };
        }

        if (currentQuestionIndex === previousCurrentQuestionIndex) {
            return {
                currentQuestionId,
                currentQuestion
            };
        }

        if (currentQuestionIndex === undefined) {
            return {
                currentQuestionId,
                currentQuestion
            };
        }

        if (currentQuestionIndex === -1) {
            return {
                currentQuestionId,
                currentQuestion
            };
        }

        const index = random ? Math.floor(Math.random() * quiz.questions.length) : currentQuestionIndex;

        return {
            currentQuestionId: quiz.questions[index] ? quiz.questions[index].id : currentQuestionId,
            currentQuestion: quiz.questions[index] ? quiz.questions[index] : currentQuestion
        };
    }

    submit() {
        this.dispatchEvent(new CustomEvent('submit', {
            bubbles: false
        }));
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('quizId')) this.quizId = state.components[this.componentId].quizId;
        if (Object.keys(state.components[this.componentId] || {}).includes('random')) this.random = state.components[this.componentId].random;
        if (Object.keys(state.components[this.componentId] || {}).includes('numberOfQuestions')) this.numberOfQuestions = state.components[this.componentId].numberOfQuestions;
        this.quiz = state.components[this.componentId] ? state.components[this.componentId].Quiz : this.quiz;
        this.userToken = state.userToken;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        const previousCurrentQuestionIndex = this.currentQuestionIndex;
        this.currentQuestionIndex = state.components[this.componentId] ? state.components[this.componentId].currentQuestionIndex : this.currentQuestionIndex;
        const {currentQuestionId, currentQuestion} = this.getCurrentQuestionInfo(this.currentQuestionId, this.currentQuestion, this.currentQuestionIndex, previousCurrentQuestionIndex, this.quiz, this.random);
        this.currentQuestionId = currentQuestionId;
        this.currentQuestion = currentQuestion;
    }
}

window.customElements.define(PrendusQuiz.is, PrendusQuiz);
