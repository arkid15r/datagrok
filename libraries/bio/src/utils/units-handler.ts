import * as DG from 'datagrok-api/dg';

import {
  ALIGNMENT, ALPHABET, NOTATION, TAGS,
  candidateAlphabets, detectAlphabet,
  splitterAsFasta, getSplitterWithSeparator, splitterAsHelm,
  SplitterFunc, getSplitterForColumn,
  SeqColStats, getStats,
} from './macromolecule';

/** Class for handling notation units in Macromolecule columns */
export class UnitsHandler {
  protected readonly _column: DG.Column; // the column to be converted
  protected _units: string; // units, of the form fasta, separator
  protected _notation: NOTATION; // current notation (without :SEQ:NT, etc.)
  protected _defaultGapSymbol: string;
  protected static readonly _defaultGapSymbolsDict = {
    HELM: '*',
    SEPARATOR: '',
    FASTA: '-',
  };

  public static readonly PeptideFastaAlphabet = new Set<string>([
    'G', 'L', 'Y', 'S', 'E', 'Q', 'D', 'N', 'F', 'A',
    'K', 'R', 'H', 'C', 'V', 'P', 'W', 'I', 'M', 'T',
  ]);
  public static readonly DnaFastaAlphabet = new Set<string>(['A', 'C', 'G', 'T']);
  public static readonly RnaFastaAlphabet = new Set<string>(['A', 'C', 'G', 'U']);

  public static setUnitsToFastaColumn(col: DG.Column) {
    if (col.semType !== DG.SEMTYPE.MACROMOLECULE || col.getTag(DG.TAGS.UNITS) !== NOTATION.FASTA)
      throw new Error(`The column of notation '${NOTATION.FASTA}' must be '${DG.SEMTYPE.MACROMOLECULE}'.`);

    col.setTag(DG.TAGS.UNITS, NOTATION.FASTA);
    UnitsHandler.setTags(col, splitterAsFasta);
  }

  public static setUnitsToSeparatorColumn(col: DG.Column, separator?: string) {
    if (col.semType !== DG.SEMTYPE.MACROMOLECULE || col.getTag(DG.TAGS.UNITS) !== NOTATION.SEPARATOR)
      throw new Error(`The column of notation '${NOTATION.SEPARATOR}' must be '${DG.SEMTYPE.MACROMOLECULE}'.`);
    if (!separator)
      throw new Error(`The column of notation '${NOTATION.SEPARATOR}' must have the separator tag.`);

    col.setTag(DG.TAGS.UNITS, NOTATION.SEPARATOR);
    col.setTag(TAGS.separator, separator);
    UnitsHandler.setTags(col, getSplitterWithSeparator(separator));
  }

  public static setUnitsToHelmColumn(col: DG.Column) {
    if (col.semType !== DG.SEMTYPE.MACROMOLECULE)
      throw new Error(`The column of notation '${NOTATION.HELM}' must be '${DG.SEMTYPE.MACROMOLECULE}'`);

    col.setTag(DG.TAGS.UNITS, NOTATION.HELM);
    UnitsHandler.setTags(col, splitterAsHelm);
  }

  /** From detectMacromolecule */
  public static setTags(col: DG.Column, splitter: SplitterFunc): void {
    const units = col.getTag(DG.TAGS.UNITS) as NOTATION;
    const stats: SeqColStats = getStats(col, 5, splitter);
    const alphabetIsMultichar = Object.keys(stats.freq).some((m) => m.length > 1);

    if ([NOTATION.FASTA, NOTATION.SEPARATOR].includes(units)) {
      // Empty monomer alphabet is not allowed
      if (Object.keys(stats.freq).length === 0) throw new Error('Alphabet is empty');

      const aligned = stats.sameLength ? ALIGNMENT.SEQ_MSA : ALIGNMENT.SEQ;
      col.setTag(TAGS.aligned, aligned);

      const alphabet = detectAlphabet(stats.freq, candidateAlphabets);
      col.setTag(TAGS.alphabet, alphabet);
      if (alphabet === ALPHABET.UN) {
        const alphabetSize = Object.keys(stats.freq).length;
        const alphabetIsMultichar = Object.keys(stats.freq).some((m) => m.length > 1);
        col.setTag(TAGS.alphabetSize, alphabetSize.toString());
        col.setTag(TAGS.alphabetIsMultichar, alphabetIsMultichar ? 'true' : 'false');
      }
    }
  }

  protected get units(): string { return this._units; }

  protected get column(): DG.Column { return this._column; }

  public get notation(): NOTATION { return this._notation; }

  public get defaultGapSymbol(): string { return this._defaultGapSymbol; }

  public get separator(): string | undefined {
    const separator: string | undefined = this.column.getTag(TAGS.separator) ?? undefined;
    if (this.notation === NOTATION.SEPARATOR && separator === undefined)
      throw new Error(`Separator is mandatory  for column '${this.column.name}' of notation '${this.notation}'.`);
    return separator;
  }

  public get aligned(): string {
    const aligned = this.column.getTag(TAGS.aligned);

    // TAGS.aligned is mandatory for columns of NOTATION.FASTA and NOTATION.SEPARATOR
    if (!aligned && (this.isFasta() || this.isSeparator()))
      throw new Error('Tag aligned not set');

    return aligned;
  }

  /** Alphabet name (upper case) */
  public get alphabet(): string {
    const alphabet = this.column.getTag(TAGS.alphabet);

    // TAGS.alphabet is mandatory for columns of NOTATION.FASTA and NOTATION.SEPARATOR
    if (!alphabet && (this.isFasta() || this.isSeparator()))
      throw new Error('Tag alphabet not set');

    return alphabet;
  }

  public getAlphabetSize(): number {
    if (this.notation == NOTATION.HELM || this.alphabet == ALPHABET.UN) {
      const alphabetSizeStr = this.column.getTag(TAGS.alphabetSize);
      let alphabetSize: number;
      if (alphabetSizeStr) {
        alphabetSize = parseInt(alphabetSizeStr);
      } else {
        // calculate alphabetSize on demand
        const splitter: SplitterFunc = getSplitterForColumn(this.column);
        const stats = getStats(this.column, 1, splitter);
        alphabetSize = Object.keys(stats.freq).length;
      }
      return alphabetSize;
    } else {
      switch (this.alphabet) {
      case ALPHABET.PT:
        return 20;
      case ALPHABET.DNA:
      case ALPHABET.RNA:
        return 4;
      case 'NT':
        console.warn(`Unexpected alphabet 'NT'.`);
        return 4;
      default:
        throw new Error(`Unexpected alphabet '${this.alphabet}'.`);
      }
    }
  }

  public getAlphabetIsMultichar(): boolean {
    if (this.notation === NOTATION.HELM)
      return true;
    else if (this.alphabet !== ALPHABET.UN)
      return false;
    else
      return this.column.getTag(TAGS.alphabetIsMultichar) === 'true';
  }

  public isFasta(): boolean { return this.notation === NOTATION.FASTA; }

  public isSeparator(): boolean { return this.notation === NOTATION.SEPARATOR; }

  public isHelm(): boolean { return this.notation === NOTATION.HELM; }

  public isRna(): boolean { return this.alphabet === ALPHABET.RNA; }

  public isDna(): boolean { return this.alphabet === ALPHABET.DNA; }

  public isPeptide(): boolean { return this.alphabet === ALPHABET.PT; }

  public isMsa(): boolean { return this.aligned ? this.aligned.toUpperCase().includes('MSA') : false; }

  /** Associate notation types with the corresponding units */
  /**
   * @return {NOTATION}     Notation associated with the units type
   */
  protected getNotation(): NOTATION {
    if (this.units.toLowerCase().startsWith(NOTATION.FASTA))
      return NOTATION.FASTA;
    else if (this.units.toLowerCase().startsWith(NOTATION.SEPARATOR))
      return NOTATION.SEPARATOR;
    else if (this.units.toLowerCase().startsWith(NOTATION.HELM))
      return NOTATION.HELM;
    else
      throw new Error(`Column '${this.column.name}' has unexpected notation '${this.units}'.`);
  }

  /**
   * Create a new empty column of the specified notation type and the same
   * length as column
   *
   * @param {NOTATION} targetNotation
   * @return {DG.Column}
   */
  protected getNewColumn(targetNotation: NOTATION, separator?: string): DG.Column {
    const col = this.column;
    const len = col.length;
    const name = targetNotation.toLowerCase() + '(' + col.name + ')';
    const newColName = col.dataFrame.columns.getUnusedName(name);
    const newColumn = DG.Column.fromList('string', newColName, new Array(len).fill(''));
    newColumn.semType = DG.SEMTYPE.MACROMOLECULE;
    newColumn.setTag(DG.TAGS.UNITS, targetNotation);
    if (targetNotation === NOTATION.SEPARATOR) {
      if (!separator) throw new Error(`Notation \'${NOTATION.SEPARATOR}\' requires separator value.`);
      newColumn.setTag(TAGS.separator, separator);
    }
    newColumn.setTag(DG.TAGS.CELL_RENDERER, 'Macromolecule');

    const srcAligned = col.getTag(TAGS.aligned);
    if (srcAligned)
      newColumn.setTag(TAGS.aligned, srcAligned);

    const srcAlphabet = col.getTag(TAGS.alphabet);
    if (srcAlphabet)
      newColumn.setTag(TAGS.alphabet, srcAlphabet);

    let srcAlphabetSize: string = col.getTag(TAGS.alphabetSize);
    if (srcAlphabetSize)
      newColumn.setTag(TAGS.alphabetSize, srcAlphabetSize);

    const srcAlphabetIsMultichar: string = col.getTag(TAGS.alphabetIsMultichar);
    if (srcAlphabetIsMultichar !== undefined)
      newColumn.setTag(TAGS.alphabetIsMultichar, srcAlphabetIsMultichar);

    if (targetNotation == NOTATION.HELM) {
      srcAlphabetSize = this.getAlphabetSize().toString();
      newColumn.setTag(TAGS.alphabetSize, srcAlphabetSize);
    }

    return newColumn;
  }

  /**
   * Create a new empty column using templateCol as a template
   *
   * @param {DG.Column} templateCol  the properties and units of this column are used as a
   * template to build the new one
   * @return {DG.Column}
   */
  public static getNewColumn(templateCol: DG.Column): DG.Column {
    const col: UnitsHandler = new UnitsHandler(templateCol);
    const targetNotation = col.notation;
    return col.getNewColumn(targetNotation);
  }

  /**
   * A helper function checking the validity of the 'units' string
   *
   * @param {string} units  the string to be validated
   * @return {boolean}
   */
  public static unitsStringIsValid(units: string): boolean {
    units = units.toLowerCase();
    const prefixes = [NOTATION.FASTA, NOTATION.SEPARATOR, NOTATION.HELM];
    const postfixes = ['rna', 'dna', 'pt'];

    const prefixCriterion = prefixes.some((p) => units.startsWith(p.toLowerCase()));
    return prefixCriterion;
  }

  /**
   * Construct a new column of semantic type MACROMOLECULE from the list of
   * specified parameters
   *
   * @param {number}    len  the length of the new column
   * @param {string}    name  the name of the new column
   * @param {string}    units  the units of the new column
   * @return {DG.Column}
   */
  public static getNewColumnFromParams(
    len: number,
    name: string,
    units: string
  ): DG.Column {
    // WARNING: in this implementation is is impossible to verify the uniqueness
    // of the new column's name
    // TODO: verify the validity of units parameter
    if (!UnitsHandler.unitsStringIsValid(units))
      throw new Error('Invalid format of \'units\' parameter');
    const newColumn = DG.Column.fromList('string', name, new Array(len).fill(''));
    newColumn.semType = DG.SEMTYPE.MACROMOLECULE;
    newColumn.setTag(DG.TAGS.UNITS, units);
    return newColumn;
  }

  public constructor(col: DG.Column) {
    this._column = col;
    const units = this._column.getTag(DG.TAGS.UNITS);
    if (units !== null && units !== undefined)
      this._units = units;
    else
      throw new Error('Units are not specified in column');
    this._notation = this.getNotation();
    this._defaultGapSymbol = (this.isFasta()) ? UnitsHandler._defaultGapSymbolsDict.FASTA :
      (this.isHelm()) ? UnitsHandler._defaultGapSymbolsDict.HELM :
        UnitsHandler._defaultGapSymbolsDict.SEPARATOR;

    if (!this.column.tags.has(TAGS.aligned) || !this.column.tags.has(TAGS.alphabet) ||
        (!this.column.tags.has(TAGS.alphabetIsMultichar) && !this.isHelm() && this.alphabet === ALPHABET.UN)
    ) {
      // The following detectors and setters are to be called because the column is likely
      // as the UnitsHandler constructor was called on the column.
      if (this.isFasta()) {
        UnitsHandler.setUnitsToFastaColumn(this.column);
      } else if (this.isSeparator()) {
        const separator = col.getTag(TAGS.separator);
        UnitsHandler.setUnitsToSeparatorColumn(this.column, separator);
      } else if (this.isHelm()) {
        UnitsHandler.setUnitsToHelmColumn(this.column);
      } else {
        throw new Error(`Unexpected units '${this.column.getTag(DG.TAGS.UNITS)}'.`);
      }
    }

    // if (!this.column.tags.has(TAGS.alphabetSize)) {
    //   if (this.isHelm())
    //     throw new Error(`For column '${this.column.name}' of notation '${this.notation}' ` +
    //       `tag '${TAGS.alphabetSize}' is mandatory.`);
    //   else if (['UN'].includes(this.alphabet))
    //     throw new Error(`For column '${this.column.name}' of alphabet '${this.alphabet}' ` +
    //       `tag '${TAGS.alphabetSize}' is mandatory.`);
    // }

    if (!this.column.tags.has(TAGS.alphabetIsMultichar)) {
      if (this.isHelm()) {
        this.column.setTag(TAGS.alphabetIsMultichar, 'true');
      } else if (['UN'].includes(this.alphabet)) {
        throw new Error(`For column '${this.column.name}' of alphabet '${this.alphabet}' ` +
          `tag '${TAGS.alphabetIsMultichar}' is mandatory.`);
      }
    }
  }
}
