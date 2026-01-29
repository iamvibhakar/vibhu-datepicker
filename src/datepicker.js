export default class VibhuDatepicker {
  constructor(input, options = {}) {
    this.input = typeof input === 'string'
      ? document.querySelector(input)
      : input;

    this.options = {
      theme: 'light',
      selectionMode: 'single',
      viewMode: 'date', // date | month | year
      disablePast: false,
      disableFuture: false,
      minDate: null,
      maxDate: null,
      disableDates: [],
      allowInput: false,
      multipleDelimiter: ', ',
      closeOnSelect: undefined,
      onSelect: () => { },
      ...options
    };

    if (this.options.closeOnSelect === undefined) {
      this.options.closeOnSelect = this.options.selectionMode !== 'multiple';
    }

    this.current = new Date();
    this.view = this.options.viewMode;
    this.selectedKeys = [];
    this.selectedSet = new Set();
    this.disabledSet = new Set(this.normalizeDisabledDates(this.options.disableDates));

    this.bootstrapSelection();
    this.mount();
  }

  mount() {
    this.root = document.createElement('div');
    this.root.className = `vdp ${this.options.theme}`;

    this.calendar = document.createElement('div');
    this.root.appendChild(this.calendar);

    document.body.appendChild(this.root);
    this.position();
    this.render();
    this.bindEvents();
    this.bindInputGuards();
  }

  position() {
    const r = this.input.getBoundingClientRect();
    this.root.style.top = r.bottom + window.scrollY + 8 + 'px';
    this.root.style.left = r.left + window.scrollX + 'px';
  }

  render() {
    const y = this.current.getFullYear();
    const m = this.current.getMonth();

    this.calendar.innerHTML = `
      <div class="vdp-header">
        <button class="vdp-nav" data-prev aria-label="Previous month">‹</button>

        <div class="vdp-title">
          <span class="vdp-month" data-view="month">
            ${this.monthName(this.current.getMonth())}
          </span>
          <span class="vdp-year" data-view="year">
            ${this.current.getFullYear()}
          </span>
        </div>

        <button class="vdp-nav" data-next aria-label="Next month">›</button>
      </div>


      ${this.view === 'date' ? this.renderDates(y, m) : ''}
      ${this.view === 'month' ? this.renderMonths() : ''}
      ${this.view === 'year' ? this.renderYears() : ''}

      <div class="vdp-footer">
        <span class="vdp-hint">
          ${this.options.selectionMode === 'multiple'
        ? `${this.selectedKeys.length} selected`
        : 'Select a date'}
        </span>
        <button class="vdp-clear" data-clear>Clear</button>
      </div>
    `;
  }

  renderDates(year, month) {
    return `
      <div class="vdp-weekdays">
        ${this.weekdays().map(d => `<div>${d}</div>`).join('')}
      </div>
      <div class="vdp-grid">
        ${this.days(year, month)}
      </div>
    `;
  }

  renderMonths() {
    return `
      <div class="vdp-month-grid">
        ${this.monthNameList().map((m, i) =>
      `<button data-month="${i}">${m.slice(0, 3)}</button>`
    ).join('')}
      </div>
    `;
  }

  renderYears() {
    const base = this.current.getFullYear() - 6;
    return `
      <div class="vdp-year-grid">
        ${Array.from({ length: 12 }).map((_, i) => {
      const y = base + i;
      return `<button data-year="${y}">${y}</button>`;
    }).join('')}
      </div>
    `;
  }

  days(year, month) {
    const total = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    let html = '';

    for (let i = 0; i < firstDay; i++) {
      html += '<span class="vdp-empty"></span>';
    }

    for (let d = 1; d <= total; d++) {
      const date = new Date(year, month, d);
      const key = this.formatDateKey(date);
      const disabled = this.isDisabled(date);

      const classes = ['vdp-day'];
      if (this.selectedSet.has(key)) classes.push('is-selected');
      if (disabled) classes.push('is-disabled');

      html += disabled
        ? `<button class="${classes.join(' ')}" disabled>${d}</button>`
        : `<button class="${classes.join(' ')}" data-date="${key}">${d}</button>`;
    }
    return html;
  }

  bindEvents() {
    this.calendar.onclick = e => {
      const t = e.target.dataset;

      if (t.view) {
        this.view = t.view;
        this.render();
      }

      if (t.prev !== undefined) {
        this.current.setMonth(this.current.getMonth() - 1);
        this.render();
      }

      if (t.next !== undefined) {
        this.current.setMonth(this.current.getMonth() + 1);
        this.render();
      }

      if (t.month !== undefined) {
        this.current.setMonth(+t.month);
        this.view = 'date';
        this.render();
      }

      if (t.year !== undefined) {
        this.current.setFullYear(+t.year);
        this.view = 'date';
        this.render();
      }

      if (t.date) {
        this.handleSelection(t.date);
      }

      if (t.clear !== undefined) {
        this.clearSelection();
      }
    };
  }

  handleSelection(key) {
    if (this.options.selectionMode === 'multiple') {
      this.selectedSet.has(key)
        ? this.removeSelection(key)
        : this.addSelection(key);
    } else {
      this.selectedKeys = [key];
      this.selectedSet = new Set([key]);
    }

    this.syncInput();
    this.options.onSelect(this.getSelected());

    this.options.closeOnSelect ? this.destroy() : this.render();
  }

  isDisabled(date) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const key = this.formatDateKey(date);

    if (this.options.disablePast && date < today) return true;
    if (this.options.disableFuture && date > today) return true;
    if (this.options.minDate && date < new Date(this.options.minDate)) return true;
    if (this.options.maxDate && date > new Date(this.options.maxDate)) return true;
    if (this.disabledSet.has(key)) return true;
    if (typeof this.options.disableDates === 'function') {
      return this.options.disableDates(date) === true;
    }

    return false;
  }

  addSelection(key) {
    if (!this.selectedSet.has(key)) {
      this.selectedSet.add(key);
      this.selectedKeys.push(key);
    }
  }

  removeSelection(key) {
    this.selectedSet.delete(key);
    this.selectedKeys = this.selectedKeys.filter(k => k !== key);
  }

  clearSelection() {
    this.selectedKeys = [];
    this.selectedSet.clear();
    this.syncInput();
    this.options.onSelect(this.getSelected());
    this.render();
  }

  syncInput() {
    this.input.value =
      this.options.selectionMode === 'multiple'
        ? this.selectedKeys.join(this.options.multipleDelimiter)
        : this.selectedKeys[0] || '';
  }

  getSelected() {
    return this.options.selectionMode === 'multiple'
      ? this.selectedKeys.map(k => new Date(`${k}T00:00:00`))
      : this.selectedKeys[0]
        ? new Date(`${this.selectedKeys[0]}T00:00:00`)
        : null;
  }

  weekdays() {
    return ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  }

  monthName(i) {
    return this.monthNameList()[i];
  }

  monthNameList() {
    return [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
  }

  formatDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  bootstrapSelection() {
    if (!this.input.value) return;
    if (this.options.selectionMode === 'multiple') {
      this.input.value
        .split(this.options.multipleDelimiter)
        .map(v => v.trim())
        .filter(Boolean)
        .forEach(k => this.addSelection(k));
    } else {
      const value = this.input.value.trim();
      if (value) this.addSelection(value);
    }
  }

  bindInputGuards() {
    if (!this.input || this.options.allowInput) return;

    this.input.readOnly = true;
    this.input.addEventListener('keydown', e => e.preventDefault());
    this.input.addEventListener('paste', e => e.preventDefault());
    this.input.addEventListener('drop', e => e.preventDefault());
  }

  normalizeDisabledDates(disabled) {
    if (!Array.isArray(disabled)) return [];
    return disabled.map(item => {
      if (item instanceof Date) return this.formatDateKey(item);
      if (typeof item === 'string') return item.trim();
      return '';
    }).filter(Boolean);
  }

  destroy() {
    this.root?.remove();
  }
}
