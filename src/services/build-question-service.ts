import {Question} from '../typings/question';
import {BuiltQuestion} from '../typings/built-question';

//TODO add a return type to this function...the typescript errors are a little weird for the return type
export async function buildQuestion(rawQuestion: Question) {
    return new Promise((resolve, reject) => {
        const uuid = createUUID();
        const userVariables: string[] = retrieveUserVariables([], rawQuestion);
        const userInputs: string[] = retrieveUserInputs([], rawQuestion);
        const userCheckboxes: string[] = retrieveUserCheckboxes([], rawQuestion);
        const userRadios: string[] = retrieveUserRadios([], rawQuestion);
        const questionWorker = new Worker('services/question-worker-service.js');

        questionWorker.postMessage({
            userVariables,
            userInputs,
            userCode: rawQuestion.code
        });

        questionWorker.onmessage = (e) => {
            const result: {
                answer: string | number,
                // hint: string,
                userVariableValues: {
                    name: string,
                    value: number | string
                }[],
                errorMessage: string
            } = e.data;

            if (result.errorMessage) {
                resolve({
                    author: rawQuestion.author,
                    transformedText: result.errorMessage,
                    text: rawQuestion.text,
                    code: rawQuestion.code,
                    answer: null,
                    uuid,
                    userInputs,
                    userCheckboxes,
                    userRadios
                });
                return;
            }

            const answer: string | number = result.answer;
            // const hint: string = result.hint;
            const userVariableValues: {
                name: string,
                value: number | string
            }[] = result.userVariableValues;

            const userVariableReplacedText = userVariableValues.reduce((prev: string, curr: {
                name: string,
                value: number | string
            }) => {
                const re = new RegExp(`{{${curr.name}}}`);
                return prev.replace(re, curr.value.toString());
            }, rawQuestion.text);

            const userInputReplacedText: string = replaceUserInputText(userVariableReplacedText, userInputs, uuid);
            const userCheckboxReplacedText: string = replaceUserCheckboxText(userInputReplacedText, userCheckboxes, uuid);
            const userRadioReplacedText: string = replaceUserRadioText(userCheckboxReplacedText, userRadios, uuid);

            const finalText: string = userRadioReplacedText;

            resolve({
                author: rawQuestion.author,
                transformedText: finalText,
                text: rawQuestion.text,
                code: rawQuestion.code,
                // visibility: rawQuestion.visibility,
                // license: rawQuestion.license,
                answer,
                // hint,
                uuid,
                // previewQuestionId: rawQuestion.previewQuestionId,
                userInputs,
                userCheckboxes,
                userRadios
            });
        };
    });
}

function retrieveUserVariables(matches: any[], rawQuestion: Question): string[] {
    const reUserVariables: RegExp = /{{(.*?)}}/g;
    const recurseMatches = (matches: any[]): any[] => {
        const match = reUserVariables.exec(rawQuestion.text);

        if (!match) {
            return matches;
        }

        return recurseMatches([...matches, match[1]]);
    };

    return recurseMatches(matches);
}

function retrieveUserInputs(matches: any[], rawQuestion: Question): string[] {
    const reUserInputs: RegExp = /\[\[(.*?)\]\]/g;
    const recurseMatches = (matches: any[]): any[] => {
        const match = reUserInputs.exec(rawQuestion.text);

        if (!match) {
            return matches;
        }

        return recurseMatches([...matches, match[1]]);
    };

    return recurseMatches(matches);
}

function retrieveUserCheckboxes(matches: any[], rawQuestion: Question): string[] {
    const reUserCheckboxes: RegExp = /\[x\](.*?)\[x\]/g;
    const recurseMatches = (matches: any[]): any[] => {
        const match = reUserCheckboxes.exec(rawQuestion.text);

        if (!match) {
            return matches;
        }

        return recurseMatches([...matches, match[1]]);
    };

    return recurseMatches(matches);
}

function retrieveUserRadios(matches: any[], rawQuestion: Question): string[] {
    const reUserRadios: RegExp = /\[\*\](.*?)\[\*\]/g;
    const recurseMatches = (matches: any[]): any[] => {
        const match = reUserRadios.exec(rawQuestion.text);

        if (!match) {
            return matches;
        }

        return recurseMatches([...matches, match[1]]);
    };

    return recurseMatches(matches);
}

function replaceUserInputText(previousText: string, userInputs: string[], uuid: string): string {
    return userInputs.reduce((prev: string, curr: string) => {
        const re = new RegExp(`\\[\\[${curr}\\]\\]`);
        return prev.replace(re, `
            <span id="${curr}${uuid}" contenteditable="true" style="display: inline-block; min-width: 25px; padding: 5px; box-shadow: 0px 0px 1px black;"></span>
        `);
    }, previousText);
}

function replaceUserCheckboxText(previousText: string, userCheckboxes: string[], uuid: string): string {
    return userCheckboxes.reduce((prev: string, curr: string) => {
        const re = new RegExp(`\\[x\\]${curr}\\[x\\]`);
        return prev.replace(re, `
            <input type="checkbox" id="${curr}${uuid}">
        `);
    }, previousText);
}

function replaceUserRadioText(previousText: string, userRadios: string[], uuid: string): string {
    return userRadios.reduce((prev: string, curr: string, index: number) => {
        const constructString = (index: number, label: string) => {
            const radioButton = `<paper-radio-button id="${curr}${uuid}" name="${curr}">${label}</paper-radio-button><br>`;

            if (index === 0) {
                return `<paper-radio-group allow-empty-selection>${radioButton}`;
            }

            if (index === userRadios.length - 1) {
                return `${radioButton}</paper-radio-group>`;
            }

            return radioButton;
        };

        const re = new RegExp(`<p>\\[\\*\\]${curr}\\[\\*\\](.*?)</p>`);
        const label: string = re.exec(prev)[1];
        return prev.replace(re, constructString(index, label));
    }, previousText);
}

function createUUID() {
    //From persistence.js; Copyright (c) 2010 Zef Hemel <zef@zef.me> * * Permission is hereby granted, free of charge, to any person * obtaining a copy of this software and associated documentation * files (the "Software"), to deal in the Software without * restriction, including without limitation the rights to use, * copy, modify, merge, publish, distribute, sublicense, and/or sell * copies of the Software, and to permit persons to whom the * Software is furnished to do so, subject to the following * conditions: * * The above copyright notice and this permission notice shall be * included in all copies or substantial portions of the Software. * * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR * OTHER DEALINGS IN THE SOFTWARE.
	var s: any[] = [];
	var hexDigits = "0123456789ABCDEF";
	for ( var i = 0; i < 32; i++) {
		s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
	}
	s[12] = "4";
	s[16] = hexDigits.substr((s[16] & 0x3) | 0x8, 1);

	var uuid = s.join("");
	return uuid;
}
