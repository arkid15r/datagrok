/* Do not change these import lines. Datagrok will import API library in exactly the same manner */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

function replaceAll(string: string, search: string, replace: string) {
  return string.split(search).join(replace);
}

export class WebWidget extends DG.Widget {
  caption: string;
  urlTemplate: string;
  p1: string;
  p2: string;
  p3: string;
  frame: HTMLIFrameElement = ui.iframe();

  constructor() {
    super(ui.div());

    this.root.appendChild(this.frame);

    // properties
    this.caption = super.addProperty('caption', DG.TYPE.STRING, 'Web');
    this.urlTemplate = super.addProperty('caption', DG.TYPE.STRING, 'https://wikipedia.com');
    this.p1 = super.addProperty('p1', DG.TYPE.STRING, '');
    this.p2 = super.addProperty('p2', DG.TYPE.STRING, '');
    this.p3 = super.addProperty('p3', DG.TYPE.STRING, '');

    this.refresh();
  }

  onPropertyChanged(property: DG.Property | null) {
    this.refresh();
  }

  refresh(): void {
    let s = this.frame.src;
    s = replaceAll(this.urlTemplate, '${1}', this.p1);
    s = replaceAll(this.urlTemplate, '${2}', this.p2);
    s = replaceAll(this.urlTemplate, '${3}', this.p3);
    this.frame.src = s;
  }
}

