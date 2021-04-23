export default function Modal(config) {
	if (!(this instanceof Modal)) {
		return new Modal(config);
	}

	this.config = {
		...{
			open: false,
			template: undefined,
			activePromise: undefined,

			domModal: undefined,
			domBackdrop: undefined,
			domContent: undefined,
			btnAbort: undefined,
			btnConfirm: undefined,
		},
		...config
	};

	try {
		let _div = document.createElement('div');
		let modalHTML = this.config.template.innerHTML.slice(0);
			_div.innerHTML = modalHTML;
		this.config.domModal = _div.firstElementChild;

		this.config.domBackdrop = this.config.domModal.querySelector('.modal-backdrop');
		this.config.domContent = this.config.domModal.querySelector('.modal-content');

		this.config.domBackdrop.classList.add('ease-out', 'duration-300', 'opacity-0', 'pointer-events-none');
		this.config.domContent.classList.add('opacity-0', 'translate-y-4', 'sm:translate-y-0', 'sm:scale-95');

		document.body.appendChild(this.config.domModal);
		document.body.addEventListener('keyup', e => {
			if (!this.config.open) {
				return true;
			}
			if (e.key === 'Enter' || e.key === 'Escape') {
				this.hide(e.key === 'Enter');
			}
		});

		this.config.btnConfirm = this.config.domModal.querySelector('.js-confirm');
		this.config.btnConfirm.addEventListener('click', e => {
			if (!this.config.open) {
				return;
			}
			this.hide(true);
		});
		this.config.btnAbort = this.config.domModal.querySelector('.js-abort');
		this.config.btnAbort.addEventListener('click', e => {
			this.hide(false);
		});
	} catch (e) {
		console.log(e);
	}
}

Modal.prototype.show = function() {
	return new Promise((resolve, reject) => {
		if (this.config.open) {
			return 
		}

		this.config.domModal.classList.remove('hidden');
		setTimeout(() => {
			this.config.domBackdrop.classList.remove('ease-in', 'duration-200', 'opacity-0');
			this.config.domBackdrop.classList.add('ease-out', 'duration-300', 'opacity-100');

			this.config.domContent.classList.remove('ease-in', 'duration-200', 'opacity-0', 'translate-y-4', 'sm:translate-y-0', 'sm:scale-95');
			this.config.domContent.classList.add('ease-out', 'duration-300', 'opacity-100', 'translate-y-0', 'sm:scale-100');
		}, 25);

		this.config.btnConfirm.focus();
		this.config.open = true;
		this.config.activePromise = resolve;
	});
};

Modal.prototype.hide = function(accepted) {
	if (!this.config.open) {
		return;
	}

	this.config.domBackdrop.classList.remove('ease-out', 'duration-300', 'opacity-100');
	this.config.domBackdrop.classList.add('ease-in', 'duration-200', 'opacity-0');

	this.config.domContent.classList.remove('ease-out', 'duration-300', 'opacity-100', 'translate-y-0', 'sm:scale-100');
	this.config.domContent.classList.add('ease-in', 'duration-200', 'opacity-0', 'translate-y-4', 'sm:translate-y-0', 'sm:scale-95');
	setTimeout(() => this.config.domModal.classList.add('hidden'), 200);

	this.config.open = false;
	this.config.activePromise(accepted);
	this.config.activePromise = undefined;
};

Modal.prototype.confirm = function(column) {
	this.config.domContent.querySelectorAll('.js-column').forEach(el => el.innerText = column);

	return this.show();
};
