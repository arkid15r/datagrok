import * as C from './constants';
import * as DG from 'datagrok-api/dg';
import {AminoacidsPalettes} from '@datagrok-libraries/bio/src/aminoacids';
import {NucleotidesPalettes} from '@datagrok-libraries/bio/src/nucleotides';
import {UnknownSeqPalettes} from '@datagrok-libraries/bio/src/unknown';
import {SplitterFunc, WebLogo} from '@datagrok-libraries/bio/src/viewers/web-logo';
import {SeqPalette} from '@datagrok-libraries/bio/src/seq-palettes';
import * as ui from 'datagrok-api/ui';

const lru = new DG.LruCache<any, any>();
const undefinedColor = 'rgb(100,100,100)';

function getPalleteByType(paletteType: string): SeqPalette {
  switch (paletteType) {
  case 'PT':
    return AminoacidsPalettes.GrokGroups;
  case 'NT':
    return NucleotidesPalettes.Chromatogram;
  case 'DNA':
    return NucleotidesPalettes.Chromatogram;
  case 'RNA':
    return NucleotidesPalettes.Chromatogram;
    // other
  default:
    return UnknownSeqPalettes.Color;
  }
}

export function processSequence(subParts: string[]): [string[], boolean] {
  const simplified = !subParts.some((amino, index) =>
    amino.length > 1 &&
    index != 0 &&
    index != subParts.length - 1);

  const text: string[] = [];
  const gap = simplified ? '' : ' ';
  subParts.forEach((amino: string, index) => {
    if (index < subParts.length)
      amino += `${amino ? '' : '-'}${gap}`;

    text.push(amino);
  });
  return [text, simplified];
}

/**
 * A function that prints a string aligned to left or centered.
 *
 * @param {number} x x coordinate.
 * @param {number} y y coordinate.
 * @param {number} w Width.
 * @param {number} h Height.
 * @param {CanvasRenderingContext2D} g Canvas rendering context.
 * @param {string} s String to print.
 * @param {string} [color=undefinedColor] String color.
 * @param {number} [pivot=0] Pirvot.
 * @param {boolean} [left=false] Is left aligned.
 * @param {number} [transparencyRate=0.0] Transparency rate where 1.0 is fully transparent
 * @param {string} [separator=''] Is separator for sequence.
 * @param {boolean} [last=false] Is checker if element last or not.
 * @return {number} x coordinate to start printing at.
 */
function printLeftOrCentered(
  x: number, y: number, w: number, h: number,
  g: CanvasRenderingContext2D, s: string, color = undefinedColor,
  pivot: number = 0, left = false, transparencyRate: number = 1.0,
  separator: string = '', last: boolean = false): number {
  g.textAlign = 'start';
  const colorPart = s.substring(0);
  let grayPart = separator;
  if (last)
    grayPart = '';

  const textSize = g.measureText(colorPart + grayPart);
  const indent = 5;

  const colorTextSize = g.measureText(colorPart);
  const dy = (textSize.fontBoundingBoxAscent + textSize.fontBoundingBoxDescent) / 2;

  function draw(dx1: number, dx2: number): void {
    g.fillStyle = color;
    g.globalAlpha = transparencyRate;
    g.fillText(colorPart, x + dx1, y + dy);
    g.fillStyle = '#808080';
    g.fillText(grayPart, x + dx2, y + dy);
  }


  if (left || textSize.width > w) {
    draw(indent, indent + colorTextSize.width);
    return x + colorTextSize.width + g.measureText(grayPart).width;
  } else {
    const dx = (w - textSize.width) / 2;
    draw(dx, dx + colorTextSize.width);
    return x + dx + colorTextSize.width;
  }
}

export class MacromoleculeSequenceCellRenderer extends DG.GridCellRenderer {
  get name(): string { return 'macromoleculeSequence'; }

  get cellType(): string { return C.SEM_TYPES.Macro_Molecule; }

  get defaultHeight(): number { return 30; }

  get defaultWidth(): number { return 230; }

  /**
   * Cell renderer function.
   *
   * @param {CanvasRenderingContext2D} g Canvas rendering context.
   * @param {number} x x coordinate on the canvas.
   * @param {number} y y coordinate on the canvas.
   * @param {number} w width of the cell.
   * @param {number} h height of the cell.
   * @param {DG.GridCell} gridCell Grid cell.
   * @param {DG.GridCellStyle} cellStyle Cell style.
   * @memberof AlignedSequenceCellRenderer
   */
  render(
    g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, gridCell: DG.GridCell,
    cellStyle: DG.GridCellStyle
  ): void {
    const grid = gridCell.gridRow !== -1 ? gridCell.grid : undefined;
    const cell = gridCell.cell;
    const tag = gridCell.cell.column.getTag(DG.TAGS.UNITS);
    if (tag === 'HELM') {
      const host = ui.div([], {style: {width: `${w}px`, height: `${h}px`}});
      host.setAttribute('dataformat', 'helm');
      host.setAttribute('data', gridCell.cell.value);
      gridCell.element = host;
      //@ts-ignore
      const canvas = new JSDraw2.Editor(host, {width: w, height: h, skin: 'w8', viewonly: true});
      const formula = canvas.getFormula(true);
      if (!formula) {
        gridCell.element = ui.divText(gridCell.cell.value, {style: {color: 'red'}});
      } else {
        gridCell.element = host;
        const molWeight = Math.round(canvas.getMolWeight() * 100) / 100;
        const coef = Math.round(canvas.getExtinctionCoefficient(true) * 100) / 100;
        const molfile = canvas.getMolfile();
        const result = formula + ', ' + molWeight + ', ' + coef + ', ' + molfile;
        lru.set(gridCell.cell.value, result);
      }
    } else {
      const [type, subtype, paletteType] = gridCell.cell.column.getTag(DG.TAGS.UNITS).split(':');
      w = grid ? Math.min(grid.canvas.width - x, w) : g.canvas.width - x;
      g.save();
      g.beginPath();
      g.rect(x, y, w, h);
      g.clip();
      g.font = '12px monospace';
      g.textBaseline = 'top';
      const s: string = cell.value ?? '';

      //TODO: can this be replaced/merged with splitSequence?
      const units = gridCell.cell.column.getTag(DG.TAGS.UNITS);

      const palette = getPalleteByType(paletteType);

      const separator = gridCell.cell.column.getTag('separator') ?? '';
      const splitterFunc: SplitterFunc = WebLogo.getSplitter(units, gridCell.cell.column.getTag('separator'));

      const subParts: string[] = splitterFunc(cell.value);
      // console.log(subParts);
      let x1 = x;
      let color = undefinedColor;
      subParts.forEach((amino, index) => {
        color = palette.get(amino);
        g.fillStyle = undefinedColor;
        let last = false;
        if (index === subParts.length - 1)
          last = true;

        x1 = printLeftOrCentered(x1, y, w, h, g, amino, color, 0, true, 1.0, separator, last);
      });

      g.restore();
    }
  }
}
