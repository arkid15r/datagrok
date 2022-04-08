import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import $ from 'cash-dom';

import {getSequenceMolecularWeight} from '../utils/molecular-measure';
import {AlignedSequenceEncoder} from '@datagrok-libraries/bio/src/sequence-encoder';
import {DimensionalityReducer} from '@datagrok-libraries/ml/src/reduce-dimensionality';
import {
  createDimensinalityReducingWorker,
} from '@datagrok-libraries/ml/src/workers/dimensionality-reducing-worker-creator';
import {Measure, StringMetrics} from '@datagrok-libraries/ml/src/typed-metrics';
import {Coordinates} from '@datagrok-libraries/utils/src/type-declarations';
import * as C from '../utils/constants';
import { PeptidesController } from '../peptides';

export class PeptideSpaceViewer extends DG.JsViewer {
  method: string;
  measure: string;
  cyclesCount: number;
  controller: PeptidesController | null = null;
  customProperties = new Set(['method', 'measure', 'cyclesCount']);
  isEmbeddingCreating: boolean = false;
  
  constructor() {
    super();

    this.method = this.addProperty('method', DG.TYPE.STRING, 'UMAP', {choices: ['UMAP', 't-SNE', 'SPE', 'pSPE', 'OriginalSPE']});
    this.measure = this.addProperty('measure', DG.TYPE.STRING, 'Levenshtein', {choices: ['Levenshtein', 'Jaro-Winkler']});
    this.cyclesCount = this.addProperty('cyclesCount', DG.TYPE.INT, 100);
  }

  async onFrameAttached(dataFrame: DG.DataFrame) {
    super.onFrameAttached(dataFrame);

    this.controller = await PeptidesController.getInstance(this.dataFrame!);

    await this.render(this.dataFrame!.temp[C.EMBEDDING_STATUS]);
  }

  async onPropertyChanged(property: DG.Property | null) {
    super.onPropertyChanged(property);


    await this.render(this.customProperties.has(property?.name ?? '') || this.dataFrame!.temp[C.EMBEDDING_STATUS]);
  }

  async render(computeData=false) {
    if (computeData && !this.isEmbeddingCreating) {
      this.isEmbeddingCreating = true;
      $(this.root).empty();
      const viewerHost = ui.waitBox(async () => {
        await computeWeights(this.dataFrame!, this.method, this.measure, this.cyclesCount);

        const viewerOptions = {
          x: '~X', y: '~Y', color: C.COLUMNS_NAMES.ACTIVITY ?? '~MW', size: '~MW', title: 'Peptide Space',
          showYSelector: false, showXSelector: false, showColorSelector: false, showSizeSelector: false,
        };
        const viewerRoot = this.dataFrame!.plot.scatter(viewerOptions).root;
        viewerRoot.style.width = 'auto';
        this.isEmbeddingCreating = false;
        viewerHost.style.paddingLeft = 'unset';
        return viewerRoot;
      }) as HTMLDivElement;
      viewerHost.style.paddingLeft = '45%';
      this.root.appendChild(viewerHost);
    }
  }
}

export async function computeWeights(
  table: DG.DataFrame, method: string, measure: string, cyclesCount: number, col?: DG.Column,
): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('Creating embedding...');
  try {
    const axesNames = ['~X', '~Y', '~MW'];
    const columnData = (col ?? table.getCol(C.COLUMNS_NAMES.ALIGNED_SEQUENCE)).toList()
      .map((v) => AlignedSequenceEncoder.clean(v));

    const embcols = await createDimensinalityReducingWorker(
      {data: columnData, metric: measure as StringMetrics}, method, cyclesCount);

    const columns = Array.from(
      embcols as Coordinates, (v: Float32Array, k) => DG.Column.fromFloat32Array(axesNames[k], v));

    function _getMW(sequences: string[]) {
      const mw: Float32Array = new Float32Array(sequences.length);

      mw.map((_, index) => getSequenceMolecularWeight(sequences[index] ?? ''));

      return mw;
    }

    columns.push(DG.Column.fromFloat32Array('~MW', _getMW(columnData)));

    const edf = DG.DataFrame.fromColumns(columns);

    // Add new axes.
    for (const axis of axesNames) {
      const col = table.col(axis);
      const newCol = edf.getCol(axis);

      if (col != null) {
        for (let i = 0; i < newCol.length; ++i) {
          const v = newCol.get(i);
          table.set(axis, i, v);
        }
      } else
        table.columns.insert(newCol);
    }
  } catch (error) {
    grok.shell.error('Could not compute embeddings. See console for details.');
    console.error(error);
  } finally {
    pi.close();
  }
}
