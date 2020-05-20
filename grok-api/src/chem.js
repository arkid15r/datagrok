/**
 * @typedef {string} SimilarityMetric
 **/

import {DataFrame} from "./dataframe";

/**
 * @enum {SimilarityMetric}
 * @type {{TANIMOTO: string, DICE: string, COSINE: string, SOKAL: string, RUSSEL: string, ROGOT_GOLDBERG: string, KULCZYNSKI: string, MC_CONNAUGHEY: string, ASYMMETRIC: string, BRAUN_BLANQUET: string}}
 */
export const SIMILARITY_METRIC = {
    TANIMOTO: 'tanimoto',
    DICE: 'dice',
    COSINE: 'cosine',
    SOKAL: 'sokal',
    RUSSEL: 'russel',
    ROGOT_GOLDBERG: 'rogot-goldberg',
    KULCZYNSKI: 'kulczynski',
    MC_CONNAUGHEY: 'mc-connaughey',
    ASYMMETRIC: 'asymmetric',
    BRAUN_BLANQUET: 'braun-blanquet',
};

/** Cheminformatics-related routines */
export class chem {

    /**
     * Returns molecules similar to the reference one.
     * @async
     * @param {Column} column - Molecule column to search in.
     * @param {string} molecule - Reference molecule in SMILES format.
     * @param {SimilarityMetric} metric - Metric to use.
     * @param {number} limit - Maximum number of results to return.
     * @param {number} minScore - Minimum similarity score for a molecule to be included.
     * @returns {Promise<DataFrame>}
     * */
    static similaritySearch(column, molecule, metric = SIMILARITY_METRIC.TANIMOTO, limit = 10, minScore = 0.7) {
        return new Promise((resolve, reject) => grok_Chem_SimilaritySearch(column.d, molecule, metric,
            limit, minScore, (t) => resolve(new DataFrame(t))));
    }

    /**
     * Returns the specified number of most diverse molecules in the column.
     * @async
     * @param {Column} column - Column with molecules in which to search.
     * @param {SimilarityMetric} metric - Metric to use.
     * @param {number} limit - Number of molecules to return.
     * @returns {Promise<DataFrame>}
     * */
    static diversitySearch(column, metric = SIMILARITY_METRIC.TANIMOTO, limit = 10) {
        return new Promise((resolve, reject) => grok_Chem_DiversitySearch(column.d, metric, limit, (mols) => resolve(mols)));
    }

    /**
     * Searches for a molecular pattern in a given column, returning a bitset with hits.
     * @async
     * @param {Column} column - Column with molecules to search.
     * @param {string} pattern - Pattern, either SMARTS or SMILES.
     * @param {boolean} isSmarts - Whether the pattern is SMARTS.
     * @returns {Promise<BitSet>}
     * */
    static substructureSearch(column, pattern, isSmarts = true) {
        return new Promise((resolve, reject) => grok_Chem_SubstructureSearch(column.d, pattern, isSmarts, (bs) => resolve(new BitSet(bs))));
    }

    /**
     * Performs R-group analysis.
     * @async
     * @param {DataFrame} table - Table.
     * @param {Column} column - Column with SMILES to analyze.
     * @param {string} core - Core in the SMILES format.
     * @returns {Promise<DataFrame>}
     * */
    static rGroup(table, column, core) {
        return new Promise((resolve, reject) => grok_Chem_RGroup(table.d, column, core, () => resolve(table)));
    }

    /**
     * Finds Most Common Substructure in the specified column.
     * @async
     * @param {Column} column - Column with SMILES to analyze.
     * @returns {Promise<string>}
     * */
    static mcs(column) {
        return new Promise((resolve, reject) => grok_Chem_MCS(column.d, (mcs) => resolve(mcs)));
    }

    /**
     * Calculates specified descriptors for the molecular column.
     * @async
     * @param {DataFrame} table - Table.
     * @param {Column} column - Column with SMILES to calculate descriptors for.
     * @param {string[]} descriptors - RDKit descriptors to calculate.
     * @returns {Promise<DataFrame>}
     * */
    static descriptors(table, column, descriptors) {
        return new Promise((resolve, reject) => grok_Chem_Descriptors(table.d, column, descriptors, () => resolve(table)));
    }
}