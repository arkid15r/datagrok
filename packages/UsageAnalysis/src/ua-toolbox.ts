import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
// import * as grok from 'datagrok-api/grok';

import {BehaviorSubject} from 'rxjs';
import {UaFilter} from './filter';
import {ViewHandler} from './view-handler';
import {ChoiceInputGroups} from './elements/choice-input-groups';
import {ChoiceInputPackages} from './elements/choice-input-packages';
import {UaView} from './tabs/ua';
import $ from 'cash-dom';


export class UaToolbox {
  rootAccordion: DG.Accordion;
  dateInput: DG.InputBase;
  groupsInput: ChoiceInputGroups;
  packagesInput: ChoiceInputPackages;
  filterStream: BehaviorSubject<UaFilter>;
  dateFromDD: DG.InputBase = ui.stringInput('From', '');
  dateToDD: DG.InputBase = ui.stringInput('To', '');
  usersDD: DG.InputBase = ui.stringInput('Users', '');
  packagesDD: DG.InputBase = ui.stringInput('Packages', '');
  private _backToView: string = 'Packages';
  set backToView(value: string) {
    this._backToView = value;
    if (this.backButton !== undefined)
      this.backButton.innerText = `🠔 back to ${value.toLowerCase()}`;
  }
  get backToView(): string {
    return this._backToView;
  }

  backButton?: HTMLButtonElement;
  formDD: HTMLDivElement;
  drilldown: UaView | null = null;
  filters: DG.AccordionPane;

  static async construct() {
    const date = 'this week';
    const packages = ['all'];
    const dateInput = ui.stringInput('Date', date);
    dateInput.addPatternMenu('datetime');
    dateInput.setTooltip('Set the date period');
    const groupsInput = await ChoiceInputGroups.construct();
    const packagesInput = await ChoiceInputPackages.construct();
    const groups = groupsInput.allUsers;
    const filterStream = new BehaviorSubject(new UaFilter({
      date: date,
      groups: groups,
      packages: packages,
    }));
    return new UaToolbox(dateInput, groupsInput, packagesInput, filterStream);
  }

  private constructor(dateInput: DG.InputBase, groupsInput: ChoiceInputGroups,
    packagesInput: ChoiceInputPackages, filterStream: BehaviorSubject<UaFilter>) {
    this.rootAccordion = ui.accordion();
    this.formDD = ui.div();
    this.dateInput = dateInput;
    this.groupsInput = groupsInput;
    this.packagesInput = packagesInput;
    this.filterStream = filterStream;

    this.filters = this.rootAccordion.addPane('Filters', () => {
      const form = ui.narrowForm([
        dateInput,
        groupsInput.field,
        packagesInput.field,
      ]);
      const applyB = ui.bigButton('Apply', () => {
        applyB.disabled = true;
        this.applyFilter();
      });
      applyB.classList.add('ua-apply-button');
      applyB.disabled = true;
      dateInput.onChanged(() => applyB.disabled = false);
      $(form).append(applyB);
      this.dateFromDD.readOnly = true;
      this.dateToDD.readOnly = true;
      this.usersDD.readOnly = true;
      this.packagesDD.readOnly = true;
      this.formDD = ui.narrowForm([
        this.dateFromDD,
        this.dateToDD,
        this.usersDD,
        this.packagesDD,
      ]);
      this.formDD.style.display = 'none';
      const closeButton = ui.button('', () => this.exitDrilldown(), 'Close drilldown filter');
      closeButton.classList.add('ua-close-button', 'fal', 'fa-times');
      this.backButton = ui.button(`🠔 back`, () => {
        ViewHandler.changeTab(this._backToView);
        this.exitDrilldown();
      }, 'Back to previous tab');
      this.backButton.classList.add('ua-back-button');
      this.formDD.append(this.backButton);
      this.formDD.prepend(closeButton);
      this.formDD.classList.add('ua-drilldown-form');
      return form;
    }, true);
    this.filters.root.before(this.formDD);

    ViewHandler.UA.tabs.onTabChanged.subscribe((_) => {
      if (this.formDD.style.display === 'block') this.exitDrilldown();
      if (this.checkLabels()) {
        this.formDD.style.display = 'block';
        this.filters.root.style.display = 'none';
      }
    });
  }

  exitDrilldown() {
    this.formDD.style.display = 'none';
    this.clearFormDD();
    this.drilldown?.viewers.forEach((v) => v.reloadViewer());
    this.drilldown = null;
    this.filters.root.style.display = 'flex';
  }

  checkLabels() {
    return [this.dateFromDD.value, this.dateToDD.value,
      this.usersDD.value, this.packagesDD.value].some((val) => val);
  }

  clearFormDD() {
    this.dateFromDD.value = '';
    this.dateToDD.value = '';
    this.usersDD.value = '';
    this.packagesDD.value = '';
  }

  getFilter() {
    return new UaFilter({
      date: this.dateInput.value,
      groups: this.groupsInput.getSelectedGroups(),
      packages: this.packagesInput.getSelectedPackages(),
    });
  }

  applyFilter() {
    this.filterStream.next(this.getFilter());
    ViewHandler.getInstance().setUrlParam('date', this.dateInput.value, true);
    ViewHandler.getInstance().setUrlParam('users', this.groupsInput.getSelectedGroups().join(','), true);
    ViewHandler.getInstance().setUrlParam('packages', this.packagesInput.getSelectedPackages().join(','), true);
  }

  setDate(value: string) {
    this.dateInput.value = value;
  }

  setGroups(value: string) {
    this.groupsInput.addItems(value.split(','));
  }

  setPackages(value: string) {
    this.packagesInput.addItems(value.split(','));
  }
}
