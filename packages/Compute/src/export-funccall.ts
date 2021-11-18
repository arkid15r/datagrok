import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import ExcelJS from 'exceljs';
import {saveAs} from 'file-saver';

export async function exportFuncCall(call: DG.FuncCall) {
  //todo: check status
  // if (call.status != FuncCall.STATUS_COMPLETED) ...

  const BLOB_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
  const exportWorkbook = new ExcelJS.Workbook();

  const isScalarType = (type: DG.TYPE) => {
    return DG.TYPES_SCALAR.has(type);
  };

  const isDataFrame = (type: DG.TYPE) => (type === DG.TYPE.DATA_FRAME);

  const dfInputs = call.func.inputs.filter((input) => isDataFrame(input.propertyType));
  const scalarInputs = call.func.inputs.filter((input) => isScalarType(input.propertyType));
  const dfOutputs = call.func.outputs.filter((output) => isDataFrame(output.propertyType));
  const scalarOutputs = call.func.outputs.filter((output) => isScalarType(output.propertyType));

  dfInputs.forEach((dfInput) => {
    const currentDfSheet = exportWorkbook.addWorksheet(`Input - ${dfInput.name}`);
    const currentDf = (call.inputs[dfInput.name] as DG.DataFrame);
    currentDfSheet.addRow((currentDf.columns as DG.ColumnList).names());
    for (let i = 0; i < currentDf.rowCount; i++) {
      currentDfSheet.addRow([...currentDf.row(i).cells].map((cell: DG.Cell) => cell.value));
    }
  });

  const inputScalarsSheet = exportWorkbook.addWorksheet('Input scalars');
  scalarInputs.forEach((scalarInput) => {
    inputScalarsSheet.addRow([scalarInput.name, call.inputs[scalarInput.name]]);
  });

  for await (const dfOutput of dfOutputs) {
    const currentDfSheet = exportWorkbook.addWorksheet(`Output - ${dfOutput.name}`);
    const currentDf = (call.outputs[dfOutput.name] as DG.DataFrame);
    currentDfSheet.addRow((currentDf.columns as DG.ColumnList).names());
    for (let i = 0; i < currentDf.rowCount; i++) {
      currentDfSheet.addRow([...currentDf.row(i).cells].map((cell: DG.Cell) => cell.value));
    }

    // TODO: change to API call when it will be available. Currently, it does not work if the plot is not visible.
    // In addition, it does not track the scatterplot's source dataframe
    const plot = document.getElementsByName('viewer-Scatter-plot')[0];

    const canvas = await DG.HtmlUtils.renderToCanvas(plot);
    const dataUrl = canvas.toDataURL('image/png');
    const testImageId = exportWorkbook.addImage({
      base64: dataUrl,
      extension: 'png',
    });
    currentDfSheet.addImage(testImageId, {
      tl: {col: (currentDf.columns as DG.ColumnList).length + 1, row: 0},
      ext: {width: canvas.width, height: canvas.height},
    });
  };

  const outputScalarsSheet = exportWorkbook.addWorksheet('Output scalars');
  scalarOutputs.forEach((scalarOutput) => {
    outputScalarsSheet.addRow([scalarOutput.name, call.outputs[scalarOutput.name]]);
  });

  exportWorkbook.xlsx.writeBuffer().then((data) => {
    const blob = new Blob([data], {type: BLOB_TYPE});
    saveAs(blob, call.func.name);
  });
}
