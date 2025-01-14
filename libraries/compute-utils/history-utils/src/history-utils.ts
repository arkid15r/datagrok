/* eslint-disable max-len */
/* eslint-disable valid-jsdoc */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import wu from 'wu';

type DateOptions = 'Any time' | 'Today' | 'Yesterday' | 'This week' | 'Last week' | 'This month' | 'Last month' | 'This year' | 'Last year';

type FilterOptions = {
  text?: string,
  date?: DateOptions,
  author?: DG.User,
  isShared?: boolean,
};

const getSearchStringByPattern = (datePattern: DateOptions) => {
  switch (datePattern) {
  case 'Today':
    return `started > -1d`;
  case 'Yesterday':
    return `started > -2d and started < -1d`;
  case 'Any time':
    return ``;
  case 'Last year':
    return `started > -2y and started < -1y`;
  case 'This year':
    return `started > -1y`;
  case 'Last month':
    return `started > -2m and started < -1m`;
  case 'This month':
    return `started > -1m`;
  case 'Last week':
    return `started > -2w and started < -1w`;
  case 'This week':
    return `started > -1w`;
  }
};

export namespace historyUtils {
  const scriptsCache = {} as Record<string, DG.Script>;
  const packagesCache = {} as Record<string, DG.Package>;
  // TODO: add users and groups cache

  async function augmentFuncWithPackage(func: DG.Func) {
    const id = func.package.id;
    // DEALING WITH BUG: TODO
    const funcPackage = packagesCache[id] ?? await grok.dapi.packages.allPackageVersions().find(id);

    if (!packagesCache[id]) packagesCache[id] = funcPackage;
    // dirty hack to overwrite read-only property
    func.package.dart = funcPackage.dart;
  }

  async function augmentCallWithFunc(call: DG.FuncCall) {
    const id = call.func.id;
    // DEALING WITH BUG: https://reddata.atlassian.net/browse/GROK-12464
    const func = scriptsCache[id] ?? await grok.dapi.functions.allPackageVersions().find(id);

    if (!scriptsCache[id]) scriptsCache[id] = func;

    if (!func.package.name)
      await augmentFuncWithPackage(func);

    call.func = func;
    call.options['isHistorical'] = true;
  }

  export async function loadChildRuns(
    funcCallId: string,
  ): Promise<{parentRun: DG.FuncCall, childRuns: DG.FuncCall[]}> {
    const parentRun = await grok.dapi.functions.calls.allPackageVersions().find(funcCallId);
    parentRun.options['isHistorical'] = true;

    await augmentCallWithFunc(parentRun);

    const childRuns = await grok.dapi.functions.calls.allPackageVersions()
      .include('func').filter(`options.parentCallId="${funcCallId}"`).list();
    childRuns.forEach((childRun) => childRun.options['isHistorical'] = true);

    await Promise.all(childRuns.map(async (childRun) => augmentCallWithFunc(childRun)));

    return {parentRun, childRuns};
  }

  /**
   * Loads a FuncCall with a specified ID. By default, also loads its' inputs/outputs and author.
   * FuncCall is loaded with internal TableInfo structs instead of DG.Dataframe-s.
   * Thus, we should load them separately, and it is time-consuming. If you don't need actual values of DF-s,
   * you can skip DF loading using {@link skipDfLoad} param.
   * @param funcCallId FuncCall ID to load
   * @param skipDfLoad If true, skips replacing TableInfo with the actual dataframe
   * @returns Requested FuncCall
   */
  export async function loadRun(funcCallId: string, skipDfLoad = false) {
    const pulledRun = await grok.dapi.functions.calls.allPackageVersions()
      .include('inputs, outputs, session.user').find(funcCallId);

    await augmentCallWithFunc(pulledRun);
    pulledRun.options['isHistorical'] = true;

    if (!skipDfLoad) {
      const dfOutputs = wu(pulledRun.outputParams.values() as DG.FuncCallParam[])
        .filter((output) => output.property.propertyType === DG.TYPE.DATA_FRAME);
      for (const output of dfOutputs)
        pulledRun.outputs[output.name] = await grok.dapi.tables.getTable(pulledRun.outputs[output.name]);

      const dfInputs = wu(pulledRun.inputParams.values() as DG.FuncCallParam[])
        .filter((input) => input.property.propertyType === DG.TYPE.DATA_FRAME);
      for (const input of dfInputs)
        pulledRun.inputs[input.name] = await grok.dapi.tables.getTable(pulledRun.inputs[input.name]);
    }

    return pulledRun;
  }

  /**
   * Saved given FuncCall.
   * FuncCall is only stores references to actual dataframes. Thus, we should upload them separately
   * @param callToSave FuncCall to save
   * @returns Saved FuncCall
   */
  export async function saveRun(callToSave: DG.FuncCall) {
    const dfOutputs = wu(callToSave.outputParams.values() as DG.FuncCallParam[])
      .filter((output) => output.property.propertyType === DG.TYPE.DATA_FRAME);
    for (const output of dfOutputs) {
      callToSave.outputs[output.name] = callToSave.outputs[output.name].clone();
      await grok.dapi.tables.uploadDataFrame(callToSave.outputs[output.name]);
    }

    const dfInputs = wu(callToSave.inputParams.values() as DG.FuncCallParam[])
      .filter((input) => input.property.propertyType === DG.TYPE.DATA_FRAME);
    for (const input of dfInputs) {
      callToSave.inputs[input.name] = callToSave.inputs[input.name].clone();
      await grok.dapi.tables.uploadDataFrame(callToSave.inputs[input.name]);
    }

    return await grok.dapi.functions.calls.allPackageVersions().save(callToSave);
  }

  export async function deleteRun(callToDelete: DG.FuncCall) {
    await grok.dapi.functions.calls.allPackageVersions().delete(callToDelete);
  }

  /**
   * Loads all the function call of this function.
   * Designed to pull hstorical runs in fast manner and the call {@link loadRun} with specified run ID.
   * WARNING: FuncCall inputs/outputs fields are not included
   * @param funcId ID of Func which calls we are looking for. Get it using {@link func.id} field
   * @return Promise on array of FuncCalls corresponding to the passed Func ID
   * @stability Deprecated. Script ID changes with every package release, so searching by ID is useless in practice.
 */
  export async function pullRuns(
    funcId: string,
    filterOptions: FilterOptions = {},
    listOptions: {pageSize?: number, pageNumber?: number, filter?: string, order?: string} = {},
  ): Promise<DG.FuncCall[]> {
    let filteringString = `func.id="${funcId}"`;
    filteringString += filterOptions.author ? ` and session.user.id="${filterOptions.author.id}"`:'';
    filteringString += filterOptions.date ? getSearchStringByPattern(filterOptions.date): '';
    const filter = grok.dapi.functions.calls
      .allPackageVersions()
      .filter(filteringString)
      .include('session.user, options');
    const list = filter.list(listOptions);
    return list;
  }

  /**
   * Loads all the function call of this function.
   * Designed to pull hstorical runs in fast manner and the call {@link loadRun} with specified run ID.
   * WARNING: FuncCall inputs/outputs fields are not included by default. Use {@link includedFields} to specify fields to load.
   * @param funcName Name of Func which calls we are looking for. Get it using {@link func.name} field
   * @param filterOptions Struct containing filtering options. These options will be passed as valid filtering string to a request.
   * @param listOptions Struct containing listing options.
   * @param includedFields List of fields to include into response. See {@link DG.FuncCall} struct to see possible values. E.g., 'inputs' or 'outputs'
   * @return Promise on array of FuncCalls corresponding to the passed Func ID
   * @stability Stable
 */
  export async function pullRunsByName(
    funcName: string,
    filterOptions: FilterOptions[] = [],
    listOptions: {pageSize?: number, pageNumber?: number, filter?: string, order?: string} = {},
    includedFields: string[] = [],
  ): Promise<DG.FuncCall[]> {
    let filteringString = ``;
    for (const filterOption of filterOptions) {
      const filterOptionCriteria = [] as string[];
      if (filterOption.author) filterOptionCriteria.push(`session.user.id="${filterOption.author.id}"`);
      if (filterOption.date) filterOptionCriteria.push(getSearchStringByPattern(filterOption.date));
      if (filterOption.isShared) filterOptionCriteria.push(`options.isShared="true"`);
      if (filterOption.text) {
        filterOptionCriteria.push(
          `((options.title like "${filterOption.text}") or (options.annotation like "${filterOption.text}"))`,
        );
      }
      const filterOptionString = filterOptionCriteria.join(' and ');
      if (filterOptionString !== '') {
        if (filteringString === '')
          filteringString += `(${filterOptionString})`;
        else
          filteringString += ` or (${filterOptionString})`;
      }
    }
    if (filteringString !== '')
      filteringString = ` and (${filteringString})`;

    const result =
      await grok.dapi.functions.calls
        .allPackageVersions()
        .filter(`func.name="${funcName}"${filteringString}`)
        .include(`${includedFields.join(',')}`)
        .list(listOptions);

    for (const pulledRun of result)
      await augmentCallWithFunc(pulledRun);

    if (includedFields.includes('inputs') || includedFields.includes('func.params')) {
      for (const pulledRun of result) {
        const dfInputs = wu(pulledRun.inputParams.values() as DG.FuncCallParam[])
          .filter((input) => input.property.propertyType === DG.TYPE.DATA_FRAME);
        for (const input of dfInputs)
          pulledRun.inputs[input.name] = await grok.dapi.tables.getTable(pulledRun.inputs[input.name]);
      }
    }

    if (includedFields.includes('outputs') || includedFields.includes('func.params')) {
      for (const pulledRun of result) {
        const dfOutputs = wu(pulledRun.outputParams.values() as DG.FuncCallParam[])
          .filter((output) => output.property.propertyType === DG.TYPE.DATA_FRAME);
        for (const output of dfOutputs)
          pulledRun.outputs[output.name] = await grok.dapi.tables.getTable(pulledRun.outputs[output.name]);
      }
    }

    return result;
  }
}
