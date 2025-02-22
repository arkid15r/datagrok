/**
 * Machine learning-related routines
 * @module ml
 * */

import {DataFrame} from "./dataframe";

let api = <any>window;

export namespace ml {
  /** Applies predictive model to the specified table.
   * See example: {@link https://public.datagrok.ai/js/samples/domains/data-science/predictive-model}
   * @async
   * @param {string} name - Model namespace path.
   * @param {DataFrame} table - Data table.
   * @param {object} columnNamesMap - Columns map.
   * @param {boolean} showProgress - Maximum number of results to return.
   * @returns {Promise<DataFrame>}
   * */
  export function applyModel(name: string, table: DataFrame, columnNamesMap: object = {}, showProgress: boolean = true): Promise<DataFrame> {
    return new Promise((resolve, reject) =>
      api.grok_ML_ApplyModel(name, table.dart, (t: any) => resolve(new DataFrame(t)), (e: any) => reject(e), columnNamesMap, showProgress));
  }

  /** Imputes missing values.
   * See example: {@link https://public.datagrok.ai/js/samples/domains/data-science/missing-values-imputation}
   * @async
   * @param {DataFrame} table - Data table.
   * @param {string[]} impute - List of column names to impute missing values.
   * @param {string[]} data - List of column names containing data.
   * @param {number} nearestNeighbours - Number of nearest neighbours.
   * @returns {Promise<DataFrame>}
   * */
  export function missingValuesImputation(table: DataFrame, impute: string[], data: string[], nearestNeighbours: number): Promise<DataFrame> {
    return new Promise((resolve, reject) =>
      api.grok_ML_MissingValuesImputation(table.dart, impute, data, nearestNeighbours, () => resolve(table), (e: any) => reject(e)));
  }

  /** Clusters data.
   * See example: {@link https://public.datagrok.ai/js/samples/domains/data-science/cluster}
   * @async
   * @param {DataFrame} table - Data table.
   * @param {string[]} features - List of column names containing features.
   * @param {number} clusters - Number of clusters.
   * @returns {Promise<DataFrame>}
   * */
  export function cluster(table: DataFrame, features: string[], clusters: number): Promise<DataFrame> {
    return new Promise((resolve, reject) =>
      api.grok_ML_Cluster(table.dart, features, clusters, () => resolve(table), (e: any) => reject(e)));
  }

  /** Principal component analysis.
   * See example: {@link https://public.datagrok.ai/js/samples/domains/data-science/pca}
   * @async
   * @param {DataFrame} table - Data table.
   * @param {string[]} features - List of column names containing features.
   * @param {number} components - Number of clusters.
   * @param {boolean} center - Center features data before PCA.
   * @param {boolean} scale - Scale features data before PCA.
   * @returns {Promise<DataFrame>}
   * */
  export function pca(table: DataFrame, features: string[], components: number, center: boolean, scale: boolean): Promise<DataFrame> {
    return new Promise((resolve, reject) =>
      api.grok_ML_PCA(table.dart, features, components, center, scale, () => resolve(table), (e: any) => reject(e)));
  }

  /** Creates a table with random values from the specified distribution.
   * Documentation: {@link https://datagrok.ai/help/transform/random-data}
   * See example: {@link https://public.datagrok.ai/js/samples/domains/data-science/random-data}
   * @async
   * @param {DataFrame} table - Data table.
   * @param {string} distribution - Distribution name.
   * @param {object} params - Distribution parameters.
   * @param {number} seed - Initial seed.
   * @returns {Promise<DataFrame>}
   * */
  export function randomData(table: DataFrame, distribution: string, params: object, seed: number): Promise<DataFrame> {
    return new Promise((resolve, reject) =>
      api.grok_ML_RandomData(table.dart, distribution, params, seed, () => resolve(table), (e: any) => reject(e)));
  }
}