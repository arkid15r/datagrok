import * as DG from 'datagrok-api/dg';

//@ts-ignore
import Aioli from '@biowasm/aioli';

import {AlignedSequenceEncoder} from '@datagrok-libraries/bio/src/sequence-encoder';
import * as C from './constants';

/**
 * Converts array of sequences into simple fasta string.
 *
 * @param {string[]} sequences Input list of sequences.
 * @return {string} Fasta-formatted string.
 */
function _stringsToFasta(sequences: string[]): string {
  return sequences.reduce((a, v, i) => a + `>sample${i + 1}\n${v}\n`, '');
}

/**
 * Extracts array of sequences from simple fasta string.
 *
 * @param {string} fasta Fasta-formatted string.
 * @return {string[]} Output list of sequences.
 */
function _fastaToStrings(fasta: string): string[] {
  return fasta.replace(/>sample\d+(\r\n|\r|\n)/g, '').split('\n');
}

/**
 * Runs Aioli environment with kalign tool.
 *
 * @param {DG.Column} srcCol Column with sequences.
 * @param {boolean} isAligned Whether the column is aligned.
 * @return {Promise<DG.Column>} Aligned sequences.
 */
export async function runKalign(srcCol: DG.Column, isAligned = false): Promise<DG.Column> {
  let sequences = srcCol.toList();

  if (isAligned)
    sequences = sequences.map((v: string, _) => AlignedSequenceEncoder.clean(v).replace(/\-/g, ''));

  const fasta = _stringsToFasta(sequences);
  const CLI = await new Aioli({
    tool: 'kalign',
    version: '3.3.1',
    reinit: true,
  });

  console.log(['fasta.length =', fasta.length]);

  await CLI.fs.writeFile('input.fa', fasta);
  const output = await CLI.exec('kalign input.fa -f fasta -o result.fasta');
  const buf = await CLI.cat('result.fasta');

  console.warn(output);

  const aligned = _fastaToStrings(buf).slice(0, sequences.length);
  const tgtCol = DG.Column.fromStrings(`msa(${srcCol.name})`, aligned);

  // units
  const srcUnits = srcCol.getTag(DG.TAGS.UNITS);
  const tgtUnits = srcUnits.split(':').map((p, i) => i == 1 ? p + '.MSA' : p).join(':');

  tgtCol.setTag(DG.TAGS.UNITS, tgtUnits);
  tgtCol.semType = C.SEM_TYPES.Macro_Molecule;
  return tgtCol;
}

export async function testMSAEnoughMemory(col: DG.Column): Promise<void> {
  const sequencesCount = col.length;
  const delta = sequencesCount / 100;

  for (let i = delta; i < sequencesCount; i += delta) {
    try {
      await runKalign(DG.Column.fromStrings(col.name, col.toList().slice(0, Math.round(i))));
      console.log(`runKalign succeeded on ${i}`);
    } catch (error) {
      console.log(`runKalign failed on ${i} with '${error}'`);
    }
  }
}
