import * as DG from 'datagrok-api/dg';
import {EXCEL_BLOB_TYPE, FileInput} from './src/file-input';
import {HistoryInput} from './src/history-input';
import {HistoryPanel} from './src/history-panel';
import {v8n} from './src/validation';

export namespace UiUtils {
  export function fileInput(
    initialText = 'Drag-n-drop here',
    initialValue: File | null = null,
    onValueChanged: Function | null = null,
    fileType = EXCEL_BLOB_TYPE,
  ) {
    return new FileInput(initialText, initialValue, onValueChanged, fileType);
  }

  export function historyInput(
    label: string,
    _funcName: string,
    _stringValueFunc: (currentRun: DG.FuncCall) => string,
    _visibleColumnsForGrid: Record<string, (currentRun: DG.FuncCall) => string>,
    _visibleColumnsForFilter: string[] = [],
  ) {
    return new HistoryInput(label, _funcName, _stringValueFunc, _visibleColumnsForGrid, _visibleColumnsForFilter);
  }

  export function historyPanel(objFunc: DG.Func) {
    return new HistoryPanel(objFunc);
  }
}

export {v8n};
