async function testSubstructureSearch() {
  let t = grok.data.demo.molecules();
  await grok.chem.searchSubstructure(t.col('smiles'), 'O=C1CN=C(C2CCCCC2)C2:C:C:C:C:C:2N1');
}

async function testDescriptors() {
  let t = grok.data.demo.molecules();
  let descriptors = await grok.chem.descriptors(t, 'smiles', ['MolWt', 'Lipinski']);
}

async function testDiversitySearch() {
  let t = grok.data.demo.molecules();
  await grok.chem.diversitySearch(t.col('smiles'));
}

async function testSimilaritySearch() {
  let t = grok.data.demo.molecules();
  let scores = await grok.chem.getSimilarities(t.col('smiles'), 'O=C1CN=C(C2CCCCC2)C2:C:C:C:C:C:2N1');
}

async function testMcs() {
  let t = DG.DataFrame.fromCsv(`O=C1CN=C(c2ccccc2N1)C3CCCCC3,1,242.32000732421875,1,1,1,pass,92.22000122070312,60,1.0,167.5240020751953,60,1.7000000476837158,287.8399963378906,113,42,3.990000009536743,6.599999904632568,H-,C6H11-,H-,H-,6.900000095367432,2.1700000762939453,-0.3720000088214874,6.019999980926514,C15H15N2O
  CN1C(=O)CN=C(c2ccccc12)C3CCCCC3,2,256.3500061035156,1,2,1,pass,482.739990234375,50,1.1540000438690186,433.2699890136719,50,1.9800000190734863,675.9099731445312,326,56,-1.4199999570846558,7.099999904632568,H-,C6H11-,H-,CH3-,0.9169999957084656,-1.6399999856948853,3.934999942779541,6.199999809265137,C15H15N2O
  CCCCN1C(=O)CN=C(c2ccccc12)C3CCCCC3,3,298.42999267578125,1,3,1,fail,3.5299999713897705,61,795.5040283203125,884.0969848632812,61,644.9099731445312,970.9099731445312,67,32,4.119999885559082,6.199999809265137,H-,C6H11-,H-,C4H9-,0.0820000022649765,-1.7799999713897705,-0.5149999856948853,1.5800000429153442,C15H15N2O
  CC(C)CCN1C(=O)CN=C(c2ccccc12)C3CCCCC3,4,312.4599914550781,1,4,1,pass,806.9099731445312,86,0.009999999776482582,450.2510070800781,86,0.10000000149011612,706.239990234375,481,18,-4.159999847412109,9.5,H-,C6H11-,H-,C5H11-,-1.7910000085830688,2.0,-1.597000002861023,7.289999961853027,C15H15N2O
  O=C1CN=C(c2ccccc2N1CC3CCCCC3)C4CCCCC4,5,338.5,1,5,1,pass,1.7999999523162842,33,110.14900207519531,302.3659973144531,33,117.83999633789062,527.0599975585938,239,56,-1.4500000476837158,10.199999809265137,H-,C6H11-,H-,C7H13-,3.263000011444092,6.239999771118164,5.269999980926514,3.7699999809265137,C15H15N2O
  O=C1CN=C(c2cc(Cl)ccc2N1)C3CCCCC3,6,276.7699890136719,1,6,1,pass,3.0799999237060547,51,3.4739999771118164,0.04899999871850014,51,4.949999809265137,0.17000000178813934,383,40,-4.920000076293945,6.900000095367432,H-,C6H11-,Cl-,H-,6.099999904632568,3.049999952316284,3.6679999828338623,1.3600000143051147,C15H15N2O
  CN1C(=O)CN=C(c2cc(Cl)ccc12)C3CCCCC3,7,290.79998779296875,1,7,1,pass,92.81999969482422,68,0.8479999899864197,40.49700164794922,68,1.5,9.850000381469727,51,42,-2.890000104904175,9.199999809265137,H-,C6H11-,Cl-,CH3-,2.805999994277954,5.760000228881836,2.2300000190734863,2.9700000286102295,C15H15N2O`);

  await grok.chem.mcs(t.col('smiles'));
}

async function testRendering() {
  ui.dialog()
    .add(grok.chem.svgMol('O=C1CN=C(C2CCCCC2)C2:C:C:C:C:C:2N1'))
    .show();
}

async function testRenderingCanvas() {
  let root = ui.div();
  const width = 300; const height = 200;
  let canvas1 = document.createElement('canvas');
  canvas1.width = width; canvas1.height = height;
  canvas1.id = 'canvas1';
  let canvas2 = document.createElement('canvas');
  canvas2.width = width; canvas2.height = height;
  canvas2.id = 'canvas2';
  root.appendChild(canvas1);
  root.appendChild(canvas2);
  // TODO: should be syncronous
  await grok.chem.canvasMol(
    0, 0, width, height, canvas1,
    'COc1ccc2cc(ccc2c1)C(C)C(=O)OCCCc3cccnc3',
    'c1ccccc1');
  await grok.chem.canvasMol(
    0, 0, width, height, canvas2,
    'CN1CCC(O)(CC1)c2ccccc2');
  ui
  .dialog({title:'Test molecule'})
  .add(root)
  .show();
}