
import {Observable, Subject} from 'rxjs';
import {IMonomerLib, Monomer} from '../types/index';

export class MonomerLib implements IMonomerLib {
  private _monomers: { [type: string]: { [name: string]: Monomer } } = {};
  private _onChanged = new Subject<any>();

  getMonomer(monomerType: string, monomerName: string): Monomer | null {
    if (monomerType in this._monomers! && monomerName in this._monomers![monomerType])
      return this._monomers![monomerType][monomerName];
    else
      return null;
  }

  getTypes(): string[] {
    return Object.keys(this._monomers);
  }

  getMonomersByType(type: string): {[symbol: string]: string} {
    let res: {[symbol: string]: string} = {};

    Object.keys(this._monomers[type]).forEach(monomerSymbol => {
      res[monomerSymbol] = this._monomers[type][monomerSymbol].molfile;
    });

    return res;
  }

  get onChanged(): Observable<any> { 
    return this._onChanged;
  }

  public update(monomers: { [type: string]: { [name: string]: Monomer } }): void {
    Object.keys(monomers).forEach(type => {
      //could possibly rewrite -> TODO: check duplicated monomer symbol

      if (!this.getTypes().includes(type))
        this._monomers![type] = {};

      Object.keys(monomers[type]).forEach(monomerName =>{
        this._monomers[type][monomerName] = monomers[type][monomerName];
      })
    });

    this._onChanged.next();
  }
}
