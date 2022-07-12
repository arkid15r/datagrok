import * as DG from 'datagrok-api/dg';
import {WebLogo} from '@datagrok-libraries/bio/src/viewers/web-logo';

/** enum type to simplify setting "user-friendly" notation if necessary */
export const enum NOTATION {
  FASTA = 'FASTA',
  SEPARATOR = 'SEPARATOR',
  HELM = 'HELM'
}

/** Class for handling conversion of notation systems in Macromolecule columns */
export class NotationConverter {
  private _sourceColumn: DG.Column; // the column to be converted
  private _sourceUnits: string; // units, of the form fasta:SEQ:NT, etc.
  private _sourceNotation: NOTATION; // current notation (without :SEQ:NT, etc.)

  private get sourceUnits(): string { return this._sourceUnits; }

  private get sourceColumn(): DG.Column { return this._sourceColumn; }

  public get sourceNotation(): NOTATION { return this._sourceNotation; }

  public isFasta(): boolean { return this.sourceNotation === NOTATION.FASTA; }

  public isSeparator(): boolean { return this.sourceNotation === NOTATION.SEPARATOR; }

  public isHelm(): boolean { return this.sourceNotation === NOTATION.HELM; }

  public toFasta(targetNotation: NOTATION): boolean { return targetNotation === NOTATION.FASTA; }

  public toSeparator(targetNotation: NOTATION): boolean { return targetNotation === NOTATION.SEPARATOR; }

  public toHelm(targetNotation: NOTATION): boolean { return targetNotation === NOTATION.HELM; }

  public isRna(): boolean { return this.sourceUnits.toLowerCase().endsWith('rna'); }

  public isDna(): boolean { return this.sourceUnits.toLowerCase().endsWith('dna'); }

  public isPeptide(): boolean { return this.sourceUnits.toLowerCase().endsWith('pt'); }

  /** Associate notation types with the corresponding units */
  /**
   * @return {NOTATION}     Notation associated with the units type
   */
  private determineSourceNotation(): NOTATION {
    if (this.sourceUnits.toLowerCase().startsWith('fasta'))
      return NOTATION.FASTA;
    else if (this.sourceUnits.toLowerCase().startsWith('separator'))
      return NOTATION.SEPARATOR;
    else
      // TODO: handle possible exceptions
      return NOTATION.HELM;
  }

  // TODO: docstring
  private determineSeparator(): string {
  //   TODO: figure out how to determine the separator efficiently
    const col = this.sourceColumn;
    let i = 0;
    const re = /[^a-z]/;
    while (i < col.length) {
      const molecule = col.get(i);
      const foundSeparator = molecule.toLowerCase().match(re);
      if (foundSeparator)
        return foundSeparator[0];
      i++;
    }
    throw new Error('No separators found');
  }

  /**
   * Create a new empty column of the specified notation type and the same
   * length as sourceColumn
   *
   * @param {NOTATION} targetNotation
   * @return {DG.Column}
   */
  private getNewColumn(targetNotation: NOTATION): DG.Column {
    const col = this.sourceColumn;
    const len = col.length;
    const name = targetNotation + '(' + col.name + ')';
    const newColName = col.dataFrame.columns.getUnusedName(name);
    // dummy code
    const newColumn = DG.Column.fromList('string', newColName, new Array(len).fill(''));
    newColumn.semType = 'Macromolecule';
    newColumn.setTag(
      DG.TAGS.UNITS,
      this.sourceUnits.replace(
        this.sourceNotation.toLowerCase().toString(),
        targetNotation.toLowerCase().toString()
      )
    );
    // TODO: specify cell renderers for all cases
    if (this.toFasta(targetNotation)) {
      newColumn.setTag(
        DG.TAGS.CELL_RENDERER,
        this.sourceColumn.tags[DG.TAGS.CELL_RENDERER]);
    }
    return newColumn;
  }

  /**
   * Method for conversion from FASTA to SEPARATOR
   *
   * @param {string} separator  A specific separator to be used
   * @param {string} gapSymbol  Gap symbol in FASTA, '-' by default
   * @return {DG.Column}        A new column in SEPARATOR notation
   */
  private convertFastaToSeparator(separator: string, gapSymbol: string = '-'): DG.Column {
    // a function splitting FASTA sequence into an array of monomers:
    const splitterAsFasta = WebLogo.splitterAsFasta;

    const newColumn = this.getNewColumn(NOTATION.SEPARATOR);
    // assign the values to the newly created empty column
    newColumn.init((idx: number) => {
      const fastaPolymer = this.sourceColumn.get(idx);
      const fastaMonomersArray = splitterAsFasta(fastaPolymer);
      for (let i = 0; i < fastaMonomersArray.length; i++) {
        if (fastaMonomersArray[i] === gapSymbol)
          fastaMonomersArray[i] = '';
      }
      return fastaMonomersArray.join(separator);
    });
    return newColumn;
  }

  // TODO: doc
  private convertFastaToHelm(
    fastaGapSymbol: string = '-',
    helmGapSymbol: string = '*'
  ): DG.Column {
    // a function splitting FASTA sequence into an array of monomers
    const splitterAsFasta = WebLogo.splitterAsFasta;
    const prefix = (this.isDna()) ? 'DNA1{' :
      (this.isRna()) ? 'RNA1{' :
        (this.isPeptide()) ? 'PEPTIDE1{' :
          'Unknown'; // this case should be handled as exception

    if (prefix === 'Unknown')
      throw new Error('Neither peptide, nor nucleotide');

    const postfix = '}$$$';
    const wrapperLeft = (this.isDna()) ? 'D(' :
      (this.isRna()) ? 'R(' : ''; // no wrapper for peptides
    const wrapperRight = (this.isDna() || this.isRna()) ? ')P' : ''; // no wrapper for peptides

    const newColumn = this.getNewColumn(NOTATION.HELM);
    // assign the values to the empty column
    newColumn.init((idx: number) => {
      const fastaPolymer = this.sourceColumn.get(idx);
      const fastaMonomersArray = splitterAsFasta(fastaPolymer);
      const helmArray = [prefix];
      let firstIteration = true;
      for (let i = 0; i < fastaMonomersArray.length; i++) {
        if (fastaMonomersArray[i] === fastaGapSymbol) {
          // TODO: verify the correctness of gap symbols handling
          helmArray.push(helmGapSymbol);
        } else {
          const dot = firstIteration ? '' : '.';
          const item = [dot, wrapperLeft, fastaMonomersArray[i], wrapperRight];
          helmArray.push(item.join(''));
        }
        firstIteration = false;
      }
      helmArray.push(postfix);
      return helmArray.join('');
    });
    return newColumn;
  }

  private handleSeparatorItemForFasta(
    idx: number,
    separatorItemsArray: string[],
    separator: string,
    gapSymbol: string,
    fastaMonomersArray: string[]
  ): void {
    const item = separatorItemsArray[idx];
    if (item.length > 1) {
      // the case of a multi-character monomer
      const monomer = '[' + item + ']';
      fastaMonomersArray.push(monomer);
    }
    if (item === separator) {
      if (idx !== 0 && separatorItemsArray[idx - 1] === separator)
        fastaMonomersArray.push(gapSymbol);
    }
  }

  private convertSeparatorToFasta(
    separator: string | null = null,
    gapSymbol: string = '-'
  ): DG.Column {
    // TODO: implementation
    // * similarly to fasta2separator, divide string into monomers
    // * adjacent separators is a gap (symbol to be specified)
    // * the monomers MUST be single-character onles, otherwise forbid
    // * NO, they can be multi-characters
    // conversion
    // * consider automatic determining the separator

    if (separator === null)
      separator = this.determineSeparator();

    // a function splitting FASTA sequence into an array of monomers
    const splitterAsSeparator = WebLogo.getSplitterWithSeparator(separator);

    const newColumn = this.getNewColumn(NOTATION.FASTA);
    // assign the values to the empty column
    newColumn.init((idx: number) => {
      const separatorPolymer = this.sourceColumn.get(idx);
      // items can be monomers or separators
      const separatorItemsArray = splitterAsSeparator(separatorPolymer);
      const fastaMonomersArray : string[] = [];
      for (let i = 0; i < separatorItemsArray.length; i++) {
        this.handleSeparatorItemForFasta(
          i, separatorItemsArray, separator!, gapSymbol, fastaMonomersArray
        );
      }
      return separatorItemsArray.join('');
    });
    return newColumn;
  }

  private convertSeparatorToHelm(): DG.Column {
    // TODO: implementation
    return this.getNewColumn(NOTATION.HELM);
  }

  private convertHelmToFasta(): DG.Column {
    // TODO: implementation
    return this.getNewColumn(NOTATION.FASTA);
  }

  private convertHelmToSeparator(): DG.Column {
    // TODO: implementatioreturn this.getNewColumn();
    return this.getNewColumn(NOTATION.SEPARATOR);
  }

  /** Dispatcher method for notation conversion */
  // TODO: write the bodies of converter methods
  public convert(targetNotation: NOTATION, separator: string | null = null): DG.Column {
    // possible exceptions
    if (this.sourceNotation === targetNotation)
      throw new Error('Target notation is invalid');
    if ((this.isSeparator() || this.toSeparator(targetNotation)) &&
      separator === null)
      throw new Error('Separator is not specified');

    if (
      this.isFasta() &&
      this.toSeparator(targetNotation) &&
      separator !== null)
      return this.convertFastaToSeparator(separator);
    else if (this.isFasta() && this.toHelm(targetNotation))
      return this.convertFastaToHelm();
    else if (this.isSeparator() && this.toFasta(targetNotation))
      return this.convertSeparatorToFasta(separator!);
    else if (this.isSeparator() && this.toHelm(targetNotation))
      return this.convertSeparatorToHelm();
    else if (this.isHelm() && this.toFasta(targetNotation))
      return this.convertHelmToFasta();
    else
      return this.convertHelmToSeparator();
  }

  public constructor(col: DG.Column) {
    this._sourceColumn = col;
    this._sourceUnits = this._sourceColumn.tags[DG.TAGS.UNITS];
    this._sourceNotation = this.determineSourceNotation();
  }
}
