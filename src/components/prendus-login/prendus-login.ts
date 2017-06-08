import {ContainerElement} from '../../typings/container-element';
import {State} from '../../typings/state';
import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {SetPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {persistUserToken} from '../../redux/actions';

class PrendusLogin extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction;
    userToken: string | null;
    user: User | null;
    linkLtiAccount: boolean;

    static get is() { return 'prendus-login'; }
    static get properties() {
        return {
            redirectUrl: {
                type: String
            },
            linkLtiAccount: {
                type: Boolean
            }
        };
    }

    async connectedCallback() {
        super.connectedCallback();

        this.componentId = this.shadowRoot.querySelector('#reduxStoreElement').elementId;
    }

    loadData() {

    }

    subscribeToData() {

    }

    async loginClick() {
        const email: string = this.shadowRoot.querySelector('#emailInput').value;
        const password: string = this.shadowRoot.querySelector('#passwordInput').value;
        const data = await signinUser(email, password, this.userToken);
        const GQLUser = await getUser(email, password, data.signinUser.token)
        this.action = persistUserToken(data.signinUser.token);
        this.action = setUserInRedux(GQLUser.User);
        if (this.linkLtiAccount) await addLtiJwtToUser(this.user, this.userToken);
        if (data.signinUser.token === this.userToken && (this.user && this.user.id === GQLUser)) alert('user logged in successfully');
        navigateHome();

        async function signinUser(email: string, password: string, userToken: string | null) {
            // signup the user and login the user
            const data = await GQLMutate(`
                mutation {
                    signinUser(email: {
                        email: "${email}"
                        password: "${password}"
                    }) {
                        token
                    }
                }
            `, userToken, (error: any) => {
                console.log(error);
            });
            return data;
        }

        async function addLtiJwtToUser(user: User | null, userToken: string | null) {
            const data = await GQLMutate(`
                mutation {
                    updateUser(
                        id: "${user ? user.id : null}"
                        ltiJWT: "${getCookie('ltiJWT')}"
                    ) {
                        id
                    }
                }
            `, userToken, (error: any) => {
                console.log(error);
            });
            return data;
        }

        async function getUser(email: string, password: string, userToken: string | null) {
            // signup the user and login the user
            const data = await GQLQuery(`
              query {
                User(email:"${email}") {
                    id
                    email
                }
              }
            `, userToken, (key: string, value: any) => {
            }, (error: any) => {
                alert(error);
            });
            return data;
        }
        function navigateHome() {
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new CustomEvent('location-changed'));
        }

        function setUserInRedux(user: User): SetPropertyAction {
            return {
                type: 'SET_PROPERTY',
                key: 'user',
                value: user
            };
        }
    }

    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusLogin.is, PrendusLogin);

//TODO put this into redux somehow. Manage all cookies from Redux. Also, use regex
function getCookie(name) {
    const cookiesObj = document.cookie.split(';').reduce((result, cookieString) => {
        const cookieArray = cookieString.split('=');
        const key = cookieArray[0];
        const value = cookieArray[1];
        return {
            ...result,
            [key]: value
        };
    }, {});
    return cookiesObj[name];
}
