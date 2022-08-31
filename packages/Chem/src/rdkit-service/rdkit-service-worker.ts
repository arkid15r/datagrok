import {RdKitServiceWorkerSubstructure} from './rdkit-service-worker-substructure';
import {RDModule} from '@datagrok-libraries/bio/src/rdkit-api';

export class RdKitServiceWorker extends RdKitServiceWorkerSubstructure {
  constructor(module: RDModule, webRoot: string) {
    super(module, webRoot);
  }
}
