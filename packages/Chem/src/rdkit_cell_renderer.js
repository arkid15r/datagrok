/**
 * RDKit-based molecule cell renderer.
 * */
class RDKitCellRenderer extends DG.GridCellRenderer {

    get name() { return 'RDKit cell renderer'; }

    get cellType() { return 'RDMolecule'; }

    render(g, x, y, w, h, gridCell, cellStyle) {
        
        let value = gridCell.cell.value;
        if (value == null || value === '')
            return;
        let mol = Module.get_mol(value);
        if (!mol.is_valid()) return;
        
        let drawMolecule = function (rdkitMol) {
            rdkitMol.draw_to_canvas_with_offset(g.canvas, x, -y, w, h);
        }
    
        let molIsInMolBlock = function(molString, rdkitMol) {
            const molBlockString = rdkitMol.get_molblock();
            if (molBlockString === molString) return true;
            const v3KmolblockString = rdkitMol.get_v3Kmolblock();
            if (v3KmolblockString === molString) return true;
            return false;
        }
        
        let drawMoleculeWithScaffold = function(scaffoldMolString, rdkitMol) {
            let scaffoldMol = Module.get_mol(scaffoldMolString);
            if (!scaffoldMol.is_valid()) {
                drawMolecule(rdkitMol);
                return;
            }
            if (molIsInMolBlock(scaffoldMolString, scaffoldMol)) {
                const substructJson = rdkitMol.get_substruct_match(scaffoldMol);
                if (substructJson !== '{}') {
                    rdkitMol.generate_aligned_coords(scaffoldMol, true);
                    drawMolecule(rdkitMol);
                }
            }
            scaffoldMol.delete();
    
        }
    
        const molCol = gridCell.tableColumn.dataFrame.columns.byName('rdkit');
        let singleScaffoldMolString = molCol ? molCol.tags['chem-scaffold'] : null;
        
        if (singleScaffoldMolString) {
            
            drawMoleculeWithScaffold(singleScaffoldMolString, mol);
        
        } else {
    
            let df = gridCell.tableColumn.dataFrame;
            let rowScaffoldCol = null;
            for (let j = 0; j < df.columns.length; ++j) {
                let col = df.columns.byIndex(j);
                let tags = col.tags;
                if (tags && tags['row-scaffold']) {
                    rowScaffoldCol = col;
                    break;
                }
            }
            
            if (rowScaffoldCol == null) {
                // regular drawing
                drawMolecule(mol);
            } else {
                let idx = gridCell.tableRowIndex;
                let scaffoldMolString = df.get(rowScaffoldCol.name, idx);
                drawMoleculeWithScaffold(scaffoldMolString, mol);
            }
            
        }
        
        mol.delete();
    }
}