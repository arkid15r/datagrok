import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

// See also https://datagrok.ai/help/develop/how-to/develop-custom-viewer
// This viewer does the following:
// * listens to changes of filter and selection in the attached table,
// * updates the number of filtered/selected rows accordingly.
export class #{NAME} extends DG.JsViewer {
  onTableAttached() {
    this.subs.push(this.dataFrame!.selection.onChanged.subscribe((_) => this.render()));
    this.subs.push(this.dataFrame!.filter.onChanged.subscribe((_) => this.render()));

    this.render();
  }

  render() {
    this.root.innerHTML =
      `${this.dataFrame!.toString()}<br>
            Selected: ${this.dataFrame!.selection.trueCount}<br>
            Filtered: ${this.dataFrame!.filter.trueCount}`;
  }
}
