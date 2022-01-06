// OCL requires same kind of loading as we do for RdKit
// Therefore, this cannot be currently used from WebWorkers
import {RdKitService} from './rdkit-service';
import * as ui from 'datagrok-api/ui';
import * as OCL from 'openchemlib/full.js';
import {chemLock, chemUnlock} from './chem-common';
import {drawMoleculeToCanvas} from './chem-common-rdkit';
import {isMolBlock} from "./chem-utils";

export function renderDescription(description: OCL.IParameterizedString[], smiles: string | null = null) {
  const host = ui.div([], 'd4-flex-wrap');
  const width = 200;
  const height = 150;
  let lastMolCanvas: null | HTMLCanvasElement = null;
  let scaffoldMolString: null | string = null;
  for (const entry of description) {
    if (entry.type == 2 || entry.type == 3) {
      const divElement = ui.div(
        [ui.label(entry.value), lastMolCanvas],
        lastMolCanvas === null ? {} : {classes: 'd4-flex-col', style: {margin: '5px'}},
      );
      // if (lastMolCanvas !== null && smiles !== null && scaffoldMolString !== null) {
      //   //@ts-ignore
      //   ui.tooltip.bind(divElement, () => {
      //     const canvas = ui.canvas(200, 150);
      //     drawMoleculeToCanvas(0, 0, 200, 150, canvas, smiles, scaffoldMolString);
      //     return ui.div(canvas);
      //   });
      // }
      host.append(divElement);
      lastMolCanvas = null;
      scaffoldMolString = null;
    }
    if (entry.type == 1) {
      scaffoldMolString = entry.value;
      const mol = OCL.Molecule.fromIDCode(scaffoldMolString);
      lastMolCanvas = _molToCanvas(mol, width, height);
    }
  }
  return host;
}

function _molToCanvas(mol: OCL.Molecule, width=200, height=100) {
  const canvas = ui.canvas(width, height);
  if (mol !== null) {
    OCL.StructureView.drawMolecule(canvas, mol);
  }
  return canvas;
}

export function oclMol(molStr: string): OCL.Molecule {
  return isMolBlock(molStr)
    ? OCL.Molecule.fromMolfile(molStr)
    : OCL.Molecule.fromSmiles(molStr);
}
