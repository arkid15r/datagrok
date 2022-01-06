import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';


export async function mcsgetter(smiles: string, df1: DG.DataFrame): Promise<string> {
  return await grok.functions.call('Chem:MCSGetter', {smiles, df1});
}

export async function rgroupGetter(smiles: string, df1: DG.DataFrame, core: string, prefix: string): Promise<DG.DataFrame> {
  return await grok.functions.call('Chem:RGroupGetter', {smiles, df1, core, prefix});
}

export async function smilesTo3DCoordinates(smiles: string): Promise<string> {
  return await grok.functions.call('Chem:SmilesTo3DCoordinates', {smiles});
}

export async function getDescriptorsTree(): Promise<any> {
  return JSON.parse((await grok.functions.call('Chem:DescTree')).replaceAll('\\"', '\'').replaceAll('\\', ''));
}

export async function getDescriptorsPy(smiles: string, df1: DG.DataFrame, selected: string, df2: DG.DataFrame): Promise<any> {
  return await grok.functions.call('Chem:Desc', {smiles, df1, selected, df2});
}
