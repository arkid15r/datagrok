class RdKitSubstructLibrary {

  constructor(module) {

    this.rdKitModule = module;
    this.library = null;

  }

  init(dict) {

    this.deinit();
    if (dict.length === 0) {
      this.library = null;
      return;
    }
    this.library = new this.rdKitModule.SubstructLibrary();
    let hashToMolblock = {};
    let molIdxToHash = [];
    for (let item of dict) {
      let mol;
      try {
        mol = this.rdKitModule.get_mol(item);
        if (item.includes('M  END')) {
          item = mol.normalize_2d_molblock();
          mol.straighten_2d_layout();
          if (!hashToMolblock[item]) {
            hashToMolblock[item] = mol.get_molblock();
          }
        }
      } catch (e) {
        console.error(
          "Possibly a malformed molString: `" + item + "`");
        // preserving indices with a placeholder
        mol = this.rdKitModule.get_mol('');
        // Won't rethrow
      }
      if (mol) {
        this.library.add_mol(mol);
        mol.delete();
      }
      molIdxToHash.push(item);
    }
    return { molIdxToHash, hashToMolblock };
  }

  search(query) {

    let matches = "[]";
    if (this.library) {
      try {
        const queryMol = this.rdKitModule.get_mol(query, "{\"mergeQueryHs\":true}");
        if (queryMol) {
          if (queryMol.is_valid()) {
            matches = this.library.get_matches(queryMol, false, 1, -1);
          }
          queryMol.delete();
        }
      } catch (e) {
        console.error(
          "Possibly a malformed query: `" + query + "`");
        // Won't rethrow
      }
    }
    return matches;

  }

  deinit() {

    this.library?.delete();
    this.library = null;

  }

}