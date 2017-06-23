export class PrendusDropDown {

  public is: string;
	public buttonType: string;
	public buttonText: string;
	public buttonTitle: string;
	public classes: string;
	public properties: any;
	public querySelector: any;

  beforeRegister(): void {
    this.is = 'prendus-drop-down';
		this.properties = {
			classes: {
				type: String,
				value: 'prendus-button',
				computed: '_computeClasses(buttonType)'
			}
		}
  }

	_computeClasses(type: string): string {
		return 'prendus-button prendus-button--' + type;
	}

	toggleMenu(e: any): void {
		const items: any = this.querySelector('#drop-down');
		items.toggle();
	}

	toggleMenuWithKeyboard(e: any): void {
		if(e.keyCode === 13 || e.keyCode === 32) {
			e.preventDefault();
			this.toggleMenu(e);
		}
	}

}

Polymer(PrendusDropDown);
