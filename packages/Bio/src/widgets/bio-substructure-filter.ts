/**
 * Macromolecules substructure filter that uses Datagrok's collaborative filtering.
 * 1. On onRowsFiltering event, only FILTER OUT rows that do not satisfy this filter's criteria
 * 2. Call dataFrame.rows.requestFilter when filtering criteria changes.
 * */

import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import * as grok from 'datagrok-api/grok';
import wu from 'wu';
import {helmSubstructureSearch, linearSubstructureSearch} from '../substructure-search/substructure-search';
import {Subject, Subscription} from 'rxjs';
import {updateDivInnerHTML} from '../utils/ui-utils';
import {TAGS as bioTAGS, NOTATION} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {delay} from '@datagrok-libraries/utils/src/test';
import {debounceTime} from 'rxjs/operators';

export class BioSubstructureFilter extends DG.Filter {
  bioFilter: FastaFilter | SeparatorFilter | HelmFilter | null = null;
  bitset: DG.BitSet | null = null;
  loader: HTMLDivElement = ui.loader();
  onBioFilterChangedSubs?: Subscription;
  notation: string | undefined = undefined;

  get calculating(): boolean { return this.loader.style.display == 'initial'; }

  set calculating(value: boolean) { this.loader.style.display = value ? 'initial' : 'none'; }

  get filterSummary(): string {
    return this.bioFilter!.substructure;
  }

  get isFiltering(): boolean {
    return super.isFiltering && this.bioFilter!.substructure !== '';
  }

  get isReadyToApplyFilter(): boolean {
    return !this.calculating && this.bitset != null;
  }

  get _debounceTime(): number {
    if (this.column == null)
      return 1000;
    const length = this.column.length;
    const minLength = 500;
    const maxLength = 10000;
    const msecMax = 1000;
    if (length < minLength) return 0;
    if (length > maxLength) return msecMax;
    return Math.floor(msecMax * ((length - minLength) / (maxLength - minLength)));
  }

  //column name setter overload

  constructor() {
    super();
    this.root = ui.divV([]);
    this.calculating = false;
  }

  attach(dataFrame: DG.DataFrame): void {
    super.attach(dataFrame);
    this.column = dataFrame.columns.bySemType(DG.SEMTYPE.MACROMOLECULE);
    this.columnName ??= this.column?.name;
    this.notation ??= this.column?.getTag(DG.TAGS.UNITS);
    this.bioFilter = this.notation === NOTATION.FASTA ?
      new FastaFilter() : this.notation === NOTATION.SEPARATOR ?
        new SeparatorFilter(this.column!.getTag(bioTAGS.separator)) : new HelmFilter();
    this.root.appendChild(this.bioFilter!.filterPanel);
    this.root.appendChild(this.loader);

    this.onBioFilterChangedSubs?.unsubscribe();

    let onChangedEvent: any = this.bioFilter.onChanged;
    onChangedEvent = onChangedEvent.pipe(debounceTime(this._debounceTime));
    this.onBioFilterChangedSubs = onChangedEvent.subscribe(async (_: any) => await this._onInputChanged());
  }

  detach() {
    super.detach();
  }

  applyFilter(): void {
    if (this.bitset && !this.isDetached)
      this.dataFrame?.filter.and(this.bitset);
  }

  /** Override to save filter state.
   * @return {any} - filter state
   */
  saveState(): any {
    const state = super.saveState();
    state.bioSubstructure = this.bioFilter?.substructure;
    return state;
  }

  /** Override to load filter state.
   * @param {any} state - filter state
   */
  applyState(state: any): void {
    super.applyState(state); //column, columnName
    if (state.bioSubstructure)
      this.bioFilter!.substructure = state.bioSubstructure;

    const that = this;
    if (state.bioSubstructure)
      setTimeout(function() { that._onInputChanged(); }, 1000);
  }

  /**
   * Performs the actual filtering
   * When the results are ready, triggers `rows.requestFilter`, which in turn triggers `applyFilter`
   * that would simply apply the bitset synchronously.
   */
  async _onInputChanged(): Promise<void> {
    if (!this.isFiltering) {
      this.bitset = null;
      this.dataFrame?.rows.requestFilter();
    } else if (wu(this.dataFrame!.rows.filters).has(`${this.columnName}: ${this.filterSummary}`)) {
      // some other filter is already filtering for the exact same thing
      return;
    } else {
      this.calculating = true;
      try {
        this.bitset = await this.bioFilter?.substrucrureSearch(this.column!)!;
        this.calculating = false;
        this.dataFrame?.rows.requestFilter();
      } finally {
        this.calculating = false;
      }
    }
  }
}

abstract class BioFilterBase {
  onChanged: Subject<any> = new Subject<any>();

  get filterPanel() {
    return new HTMLElement();
  }

  get substructure() {
    return '';
  }

  set substructure(s: string) {
  }

  async substrucrureSearch(_column: DG.Column): Promise<DG.BitSet | null> {
    return null;
  }
}

class FastaFilter extends BioFilterBase {
  readonly substructureInput: DG.InputBase<string>;

  constructor() {
    super();

    this.substructureInput = ui.stringInput('', '', () => {
      this.onChanged.next();
    }, {placeholder: 'Substructure'});
  }

  get filterPanel() {
    return this.substructureInput.root;
  }

  get substructure() {
    return this.substructureInput.value;
  }

  set substructure(s: string) {
    this.substructureInput.value = s;
  }

  async substrucrureSearch(column: DG.Column): Promise<DG.BitSet | null> {
    return await linearSubstructureSearch(this.substructure, column);
  }
}

export class SeparatorFilter extends FastaFilter {
  readonly separatorInput: DG.InputBase<string>;
  colSeparator = '';

  constructor(separator: string) {
    super();

    this.separatorInput = ui.stringInput('', '', () => {
      this.onChanged.next();
    }, {placeholder: 'Separator'});
    this.colSeparator = separator;
    this.separatorInput.value = separator;
  }

  get filterPanel() {
    return ui.divV([
      this.substructureInput.root,
      this.separatorInput.root,
    ]);
  }

  get substructure() {
    return this.separatorInput.value && this.separatorInput.value !== this.colSeparator ?
      this.substructureInput.value.replaceAll(this.separatorInput.value, this.colSeparator) :
      this.substructureInput.value;
  }

  set substructure(s: string) {
    this.substructureInput.value = s;
  }

  async substrucrureSearch(column: DG.Column): Promise<DG.BitSet | null> {
    return await linearSubstructureSearch(this.substructure, column, this.colSeparator);
  }
}

export class HelmFilter extends BioFilterBase {
  helmEditor: any;
  _filterPanel = ui.div('', {style: {cursor: 'pointer'}});
  helmSubstructure = '';

  constructor() {
    super();
    this.init();
  }

  async init() {
    this.helmEditor = await grok.functions.call('HELM:helmWebEditor');
    await ui.tools.waitForElementInDom(this._filterPanel);
    this.updateFilterPanel();
    this._filterPanel.addEventListener('click', (_event: MouseEvent) => {
      const {editorDiv, webEditor} = this.helmEditor.createWebEditor(this.helmSubstructure);
      //@ts-ignore
      ui.dialog({showHeader: false, showFooter: true})
        .add(editorDiv)
        .onOK(() => {
          const helmString = webEditor.canvas.getHelm(true)
            .replace(/<\/span>/g, '').replace(/<span style='background:#bbf;'>/g, '');
          this.helmSubstructure = helmString;
          this.updateFilterPanel(this.substructure);
          setTimeout(() => { this.onChanged.next(); }, 10);
        }).show({modal: true, fullScreen: true});
    });
    ui.onSizeChanged(this._filterPanel).subscribe((_) => {
      const helmString = this.helmEditor
        .webEditor.canvas.getHelm(true).replace(/<\/span>/g, '').replace(/<span style='background:#bbf;'>/g, '');
      this.updateFilterPanel(helmString);
    });
  }

  get filterPanel() {
    return this._filterPanel;
  }

  get substructure() {
    return this.helmSubstructure;
  }

  set substructure(s: string) {
    this.helmEditor.editor.setHelm(s);
  }

  updateFilterPanel(helmString?: string) {
    const width = this._filterPanel.parentElement!.clientWidth < 100 ? 100 :
      this._filterPanel.parentElement!.clientWidth;
    const height = width / 2;
    if (!helmString) {
      const editDiv = ui.divText('Click to edit', 'helm-substructure-filter');
      updateDivInnerHTML(this._filterPanel, editDiv);
    } else {
      updateDivInnerHTML(this._filterPanel, this.helmEditor.host);
      this.helmEditor.editor.setHelm(helmString);
      this.helmEditor.resizeEditor(width, height);
    }
  }

  async substrucrureSearch(column: DG.Column): Promise<DG.BitSet | null> {
    ui.setUpdateIndicator(this._filterPanel, true);
    await delay(10);
    const res = await helmSubstructureSearch(this.substructure, column);
    ui.setUpdateIndicator(this._filterPanel, false);
    return res;
  }
}
