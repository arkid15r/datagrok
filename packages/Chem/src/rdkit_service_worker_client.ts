import RdKitWorkerClass from './rdkit.worker.ts'; // .ts!
import {WORKER_CALL} from './rdkit_service_worker_api';
import {WorkerMessageBusClient} from './worker-message-bus-client';

export class RdKitServiceWorkerClient extends WorkerMessageBusClient {
  constructor() {
    super(new RdKitWorkerClass());
  }
  moduleInit = async (pathToRdkit: string) =>
    this.call('module::init', [pathToRdkit]);
  initMoleculesStructures = async (dict: any) =>
    this.call(WORKER_CALL.INIT_MOLECULES_STRUCTURES, [dict]);
  searchSubstructure = async (query: string, querySmarts: string) =>
    this.call(WORKER_CALL.SEARCH_SUBSTRUCTURE, [query, querySmarts]);
  freeMoleculesStructures = async () =>
    this.call(WORKER_CALL.FREE_MOLECULES_STRUCTURES);
  initMorganFingerprints = async () =>
    this.call(WORKER_CALL.INIT_MORGAN_FINGERPRINTS);
  getMorganFingerprints = async () =>
    this.call(WORKER_CALL.GET_MORGAN_FINGERPRINTS);
}
