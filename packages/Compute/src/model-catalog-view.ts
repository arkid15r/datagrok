import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {ModelHandler} from './model-handler';
import {onboardModel} from './onboard-model';
const api = <any>window;

export class ModelCatalogView extends DG.CardView {
  constructor() {
    super(api.grok_CardView_Create({dataSource: grok.dapi.scripts, permanentFilter: '#model'}));

    this.meta = new ModelHandler();
    this.name = 'Models';
    this.permanentFilter = '#model';

    this.initToolbox();
    this.initRibbon();
    this.initMenu();
  }

  initRibbon() {
    this.setRibbonPanels([[ui.icons.add(() => onboardModel())]]);
  }

  initMenu() {
    this.ribbonMenu
      .group('Models')
      .item('Add New...', () => onboardModel())
      .endGroup()
      .group('Help')
      .item('Compute Engine', () => window.open('https://github.com/datagrok-ai/public/tree/master/packages/Compute', '_blank'));
  }

  initToolbox() {
    grok.dapi.scripts
      .filter('#model')
      .list()
      .then((models) => {
        this.toolbox = ui.divV(models.map((model) => ui.render(model, {onClick: (_) => this.setCurrentModel(model)})));
      });
  }

  setCurrentModel(model: DG.Script) {
    const modelView = DG.View.forObject(model)!;
    const host: HTMLDivElement = this.root.querySelector('.grok-gallery-grid')!;
    ui.empty(host);
    host.appendChild(modelView.root);
  }
}
