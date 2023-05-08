import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {smilesTo3DCoordinates} from '../scripts-api';
import {getRdKitModule} from '../utils/chem-common-rdkit';
import {_convertMolNotation} from '../utils/convert-notation-utils';

const WIDTH = 300;
const HEIGHT = 300;

export async function structure3dWidget(molecule: string): Promise<DG.Widget> {
  const rdKitModule = getRdKitModule();
  try {
    molecule = _convertMolNotation(molecule, 'unknown', 'molblock', rdKitModule);
  } catch (e) {
    return new DG.Widget(ui.divText('Molecule is possibly malformed'));
  }
  let sdf: string;
  try {
    sdf = (await smilesTo3DCoordinates(molecule)).replaceAll('\\n', '\n');
  } catch (e) {
    return new DG.Widget(ui.divText('Molecule has no atoms'));
  }
  const stringBlob = new Blob([sdf], {type: 'text/plain'});

  const nglHost = ui.div([], {classes: 'd4-ngl-viewer', id: 'ngl-3d-host'});
  nglHost.style.width = `${WIDTH}px`;
  nglHost.style.height = `${HEIGHT}px`;
  nglHost.style.backgroundColor = 'white';

  //@ts-ignore
  const stage = new NGL.Stage(nglHost, {backgroundColor: 'white'});
  //@ts-ignore
  stage.loadFile(stringBlob, {ext: 'sdf'}).then(function(comp: NGL.StructureComponent) {
    stage.setSize(WIDTH, HEIGHT);
    comp.addRepresentation('ball+stick');
    comp.autoView();
  });
  ui.tools.waitForElementInDom(nglHost).then(() => {
    if (nglHost.closest('.dialog-floating')) {
      const accPanel = nglHost.closest('.panel-content') as HTMLElement;
      if (accPanel) {
        ui.onSizeChanged(accPanel).subscribe((_) => {
          const w = Math.max(accPanel.clientWidth, 300);
          const h = Math.max(accPanel.clientHeight, 300);
          nglHost.style.width = `${w}px`;
          nglHost.style.height = `${h}px`;
          const waitParentEl = nglHost.parentElement;
          if(waitParentEl?.classList.contains('grok-wait')){
            waitParentEl.style.width = `${w}px`;
            waitParentEl.style.height = `${h}px`;
          }
          stage.handleResize();
        })
      }
    }
  })

  return new DG.Widget(nglHost);
}
