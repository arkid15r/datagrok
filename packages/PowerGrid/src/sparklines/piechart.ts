import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import {getSettingsBase, names, SummarySettingsBase} from './shared';


interface PieChartSettings extends SummarySettingsBase {
  radius: number;
  minRadius: number;
}

function getSettings(gc: DG.GridColumn): PieChartSettings {
  return gc.settings ??= {
    ...getSettingsBase(gc),
    ...{radius: 40},
    ...{minRadius: 10},
  };
}

export class PieChartCellRenderer extends DG.GridCellRenderer {
  get name() { return 'pie ts'; }

  get cellType() { return 'piechart'; }

  // getPreferredCellSize(col: DG.GridColumn) {
  //   return new Size(80,80);
  // }

  get defaultWidth(): number | null { return 80; }

  get defaultHeight(): number | null { return 80; }

  onMouseMove(gridCell: DG.GridCell, e: MouseEvent | any): void {
    const settings = getSettings(gridCell.gridColumn);
    const cols = gridCell.grid.dataFrame.columns.byNames(settings.columnNames);
    const vectorX = e.layerX - gridCell.bounds.midX;
    const vectorY = e.layerY - gridCell.bounds.midY;
    const atan2 = Math.atan2(vectorY, vectorX);
    const angle = atan2 < 0 ? atan2 + 2 * Math.PI : atan2;
    let activeColumn = -1;
    for (let i = 0; i < cols.length; i++) {
      if (cols[i].isNone(gridCell.cell.row.idx))
        continue;
      if ((angle > 2 * Math.PI * i / cols.length) && (angle < 2 * Math.PI * (i + 1) / cols.length)) {
        activeColumn = i;
        break;
      }
    }
    const row: number = gridCell.cell.row.idx;
    let arr: any = [];
    for (let i = 0; i < cols.length; i++) {
      arr.push(ui.divH([ui.divText(`${cols[i].name}:`, {
            style: {
              margin: '0 10px 0 0',
              fontWeight: (activeColumn == i) ? 'bold' : 'normal',
            }
          }), ui.divText(`${Math.floor(cols[i].get(row) * 100) / 100}`, {
            style: {
              fontWeight: (activeColumn == i) ? 'bold' : 'normal',
            }
          })]
        )
      );
    }
    // get distance from vector to center of cell
    const distance = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
    const r = cols[activeColumn].scale(row) * gridCell.bounds.width / 2;
    if ((r >= distance) || (distance <= settings.minRadius)) {
      ui.tooltip.show(ui.divV(arr), e.x + 16, e.y + 16);
    } else {
      ui.tooltip.hide();
    }
  }

  render(
    g: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    gridCell: DG.GridCell, cellStyle: DG.GridCellStyle
  ) {
    const df = gridCell.grid.dataFrame;

    if (w < 5 || h < 5 || df === void 0) return;

    const settings = getSettings(gridCell.gridColumn);
    const row: number = gridCell.cell.row.idx;
    const cols = df.columns.byNames(settings.columnNames);
    const box = new DG.Rect(x, y, w, h).fitSquare().inflate(-2, -2);

    for (let i = 0; i < cols.length; i++) {
      if (cols[i].isNone(row))
        continue;

      let r = cols[i].scale(row) * box.width / 2;
      r = r < settings.minRadius ? settings.minRadius : r;
      g.beginPath();
      g.moveTo(box.midX, box.midY);
      g.arc(box.midX, box.midY, r,
        2 * Math.PI * i / cols.length, 2 * Math.PI * (i + 1) / cols.length);
      g.closePath();

      g.fillStyle = DG.Color.toRgb(DG.Color.getCategoricalColor(i));
      g.fill();
    }
  }

  renderSettings(gc: DG.GridColumn): Element {
    gc.settings ??= getSettings(gc);
    const settings = gc.settings;

    return ui.inputs([
      ui.columnsInput('Radar columns', gc.grid.dataFrame, (columns) => {
        settings.columnNames = names(columns);
        gc.grid.invalidate();
      }, {
        available: names(gc.grid.dataFrame.columns.numerical),
        checked: settings?.columnNames ?? names(gc.grid.dataFrame.columns.numerical),
      }),
    ]);
  }
}
