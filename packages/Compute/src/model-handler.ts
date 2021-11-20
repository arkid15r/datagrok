import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {ModelCatalogView} from "./model-catalog-view";

export class ModelHandler extends DG.ObjectHandler {
  get type() {
    return 'Model';
  }

  async getById(id: string): Promise<DG.Script> {
    console.log('id:', id);
    return await grok.dapi.scripts.find(id);
  }

  async refresh(x: DG.Script): Promise<DG.Script> {
    let script = await this.getById(x.id);
    console.log('script:', script);
    return script;
  }

  getLanguageIcon(language: string) {
    if (language == 'grok')
      return ui.iconSvg('project');
    return ui.iconImage('script', `/images/entities/${language}.png`);
  }

  // Checks whether this is the handler for [x]
  isApplicable(x: any) {
    return x instanceof DG.Script && x.hasTag('model');
  }

  renderIcon(x: DG.Script, context: any = null): HTMLElement {
    return this.getLanguageIcon(x.language);
  }

  renderMarkup(x: DG.Script): HTMLElement {
    return ui.span([this.renderIcon(x), ui.label(x.friendlyName, {style: {marginLeft: '4px'}})], {style: {display: 'inline-flex'}});
  }

  renderProperties(x: DG.Script) {
    const a = ui.accordion();
    a.context = x;
    a.addTitle(ui.span([this.renderIcon(x), ui.label(x.friendlyName), ui.contextActions(x), ui.star(x.id)]));
    a.addPane('Details', () => {
      return this.renderDetails(x);
    });
    a.addCountPane('Usage', () => {
      return ui.span(['Usage statistics']);
    }, () => 99);
    a.end();
    return a.root;
  }

  renderDetails(x: DG.Script) {
    return ui.divV([ui.render(x.author), ui.render(x.createdOn)], {style: {lineHeight: '150%'}});
  }

  renderTooltip(x: DG.Script) {
    return ui.divText(`${x.friendlyName}`);
  }

  renderCard(x: DG.Script, context?: any): HTMLElement {
    let card = ui.bind(x, ui.divV([
      ui.h2(this.renderMarkup(x)),
      ui.divText(x.description, 'ui-description'),
      this.renderDetails(x),
    ], 'd4-gallery-item'), {contextMenu: false});
    card.ondblclick = (e) => {
      ModelHandler.openModel(x);
    }
    return card;
  }

  static openModel(x: DG.Script, parentView?: DG.ViewBase) {
    let view = DG.FunctionView.createFromFunc(x);
    grok.shell.addView(view);
  }

  init() {
    this.registerParamFunc('Open', async (t: DG.Script) => {

    });
  }
}
