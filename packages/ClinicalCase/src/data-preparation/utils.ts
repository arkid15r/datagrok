import * as DG from "datagrok-api/dg";
import * as grok from 'datagrok-api/grok';
import { TREATMENT_ARM } from "../constants";

export function getUniqueValues(df: DG.DataFrame, colName: string) {
    const uniqueIds = new Set();
    let column = df.columns.byName(colName);
    let rowCount = df.rowCount;
    for (let i = 0; i < rowCount; i++){
        let value = column.get(i);
        if(value && !column.isNone(i))
        uniqueIds.add(column.get(i));
    }
    return uniqueIds;
  }

  export function changeEmptyStringsToUnknown(df: DG.DataFrame, colName: string) {
    let column = df.columns.byName(colName);
    let rowCount = df.rowCount;
    for (let i = 0; i < rowCount; i++){
        if(column.isNone(i)){
            column.set(i, 'Unknown');
        }
    }
  }

  export function filterNulls(df: DG.DataFrame, colName: string) {
    let column = df.columns.byName(colName);
    let rowCount = df.rowCount;
    for (let i = 0; i < rowCount; i++){
        if(column.isNone(i)){
            df.rows.removeAt(i);
            i--;
            rowCount-=1;
        }
    }
  }

  export function filterBooleanColumn(df: DG.DataFrame, colName: string, value: boolean) {
    let column = df.columns.byName(colName);
    let rowCount = df.rowCount;
    for (let i = 0; i < rowCount; i++){
        if(column.get(i) === value){
            df.rows.removeAt(i);
            i--;
            rowCount-=1;
        }
    }
  }


  export function dateDifferenceInDays(start: string, end: string) {
    const startDate = new Date(start) as any;
    const endDate = new Date(end) as any;
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  }


export function addTreatmentArm(df: DG.DataFrame, dm: DG.DataFrame, columnsToExtract: string[]) {
    let withArm = grok.data.joinTables(df, dm, [ 'USUBJID' ], [ 'USUBJID' ], columnsToExtract, [ TREATMENT_ARM ], DG.JOIN_TYPE.LEFT, false);
    changeEmptyStringsToUnknown(withArm, TREATMENT_ARM);
    return withArm;
}


export function createFilteredTable(df: DG.DataFrame, groupCols: string[], condition: string) {
    return df
        .groupBy(groupCols)
        .where(condition)
        .aggregate();
}

export function dataframeContentToRow(df: DG.DataFrame) {
    let content = '';
    let rowCount = df.rowCount;
    for (let i = 0; i < rowCount; i++) {
        for (let column of df.columns) {
            content = `${content}${df.get(column.name, i)} `
        }
        content = `${content}; `;
    }
    return content;
}
