import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {findMonomers, parseHelm, getParts} from './utils';
import {printLeftOrCentered} from '@datagrok-libraries/bio/src/utils/cell-renderer';
import {errorToConsole} from '@datagrok-libraries/utils/src/to-console';


export class HelmCellRenderer extends DG.GridCellRenderer {
  get name() { return 'helm'; }

  get cellType() { return 'helm'; }

  get defaultWidth(): number | null { return 400; }

  get defaultHeight(): number | null { return 100; }

  onMouseMove(gridCell: DG.GridCell, e: MouseEvent): void {
    try {
      const maxLengthWordsSum = gridCell.cell.column.temp['helm-sum-maxLengthWords'];
      const maxIndex = Object.values(gridCell.cell.column.temp['helm-maxLengthWords']).length - 1;
      const argsX = e.offsetX - gridCell.gridColumn.left + (gridCell.gridColumn.left - gridCell.bounds.x);
      let left = 0;
      let right = maxIndex;
      let found = false;
      maxLengthWordsSum[maxIndex + 1] = argsX + 1;
      let mid = 0;
      if (argsX > maxLengthWordsSum[0]) {
        while (!found) {
          mid = Math.floor((right + left) / 2);
          if (argsX >= maxLengthWordsSum[mid] && argsX <= maxLengthWordsSum[mid + 1]) {
            left = mid;
            found = true;
          } else if (argsX < maxLengthWordsSum[mid]) {
            right = mid - 1;
          } else if (argsX > maxLengthWordsSum[mid + 1]) {
            left = mid + 1;
          }
          if (left == right)
            found = true;
        }
      }
      left = (argsX >= maxLengthWordsSum[left]) ? left + 1 : left;
      const monomers = findMonomers(gridCell.cell.value);
      const s: string = gridCell.cell.value ?? '';
      const subParts: string[] = parseHelm(s);
      const allParts: string[] = getParts(subParts, s);
      const tooltipMessage: HTMLElement[] = [];
      for (let i = 0; i < allParts.length; ++i) {
        if (monomers.has(allParts[i])) {
          tooltipMessage[i] = ui.divV([
            ui.divText(`Monomer ${allParts[i]} not found.`),
            ui.divText('Open the Context Panel, then expand Manage Libraries')
          ]);
        }
      }
      (((tooltipMessage[left]?.childNodes.length ?? 0) > 0)) ?
        ui.tooltip.show(ui.div(tooltipMessage[left]), e.x + 16, e.y + 16) :
        ui.tooltip.hide();
    } catch (err: any) {
      const errMsg: string = errorToConsole(err);
      console.error('Helm: HelmCellRenderer.onMouseMove() error:\n' + errMsg);
    }
  }

  render(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
    gridCell: DG.GridCell, cellStyle: DG.GridCellStyle
  ) {
    const grid = gridCell.gridRow !== -1 ? gridCell.grid : undefined;
    const undefinedColor = 'rgb(100,100,100)';
    const grayColor = '#808080';
    const monomers = findMonomers(gridCell.cell.value);
    const s: string = gridCell.cell.value ?? '';
    const subParts: string[] = parseHelm(s);
    if (monomers.size == 0 && grid) {
      const host = ui.div([], {style: {width: `${w}px`, height: `${h}px`}});
      host.setAttribute('dataformat', 'helm');
      host.setAttribute('data', gridCell.cell.value);
      gridCell.element = host;
      //@ts-ignore
      const canvas = new JSDraw2.Editor(host, {width: w, height: h, skin: 'w8', viewonly: true});
      return;
    } else {
      if (!grid) {
        const r = window.devicePixelRatio;
        h = 28;
        g.canvas.height = h*r;
        g.canvas.style.height = `${h}px`;
      }
      w = grid ? Math.min(grid.canvas.width - x, w) : g.canvas.width - x;
      g.save();
      g.beginPath();
      g.rect(x, y, w, h);
      g.clip();
      g.font = '12px monospace';
      g.textBaseline = 'top';
      let x1 = x;
      const maxLengthWords: any = {};
      const maxLengthWordSum: any = {};
      const allParts: string[] = getParts(subParts, s);
      for (let i = 0; i < allParts.length; ++i) {
        maxLengthWords[i] = allParts[i].length * 7;
        const color = monomers.has(allParts[i]) ? 'red' : grayColor;
        g.fillStyle = undefinedColor;
        x1 = printLeftOrCentered(x1, y, w, h, g, allParts[i], color, 0, true, 1.0);
      }

      maxLengthWordSum[0] = maxLengthWords[0];
      for (let i = 1; i < allParts.length; i++)
        maxLengthWordSum[i] = maxLengthWordSum[i - 1] + maxLengthWords[i];

      gridCell.cell.column.temp = {
        'helm-sum-maxLengthWords': maxLengthWordSum,
        'helm-maxLengthWords': maxLengthWords
      };
      g.restore();
      return;
    }
  }
}
