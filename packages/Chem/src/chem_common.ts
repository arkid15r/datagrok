const lockPromiseForKey: any = {};
const unlockFunctionForKey: any = {};

// By https://github.com/mistval/locko

/**
 * Take out a lock. When this function returns (asynchronously),
 * you have the lock.
 * @param {string} key - The key to lock on. Anyone else who
 *   tries to lock on the same key will need to wait for it to
 *   be unlocked.
 */
async function lock(key: string) {
  if (!lockPromiseForKey[key]) {
    lockPromiseForKey[key] = Promise.resolve();
  }

  const takeLockPromise = lockPromiseForKey[key];
  lockPromiseForKey[key] = takeLockPromise.then(() => new Promise((fulfill) => {
    unlockFunctionForKey[key] = fulfill;
  }));

  return takeLockPromise;
}

/**
 * Release a lock.
 * @param {string} key - The key to release the lock for.
 *   The next person in line will now be able to take out
 *   the lock for that key.
 */
function unlock(key: string) {
  if (unlockFunctionForKey[key]) {
    unlockFunctionForKey[key]();
    delete unlockFunctionForKey[key];
  }
}

/*

let cntr = 0;

export async function chemLock() {
  await lock(cntr.toString());
  cntr++;
}

export function chemUnlock() {
  unlock(cntr.toString());
  cntr--;
}

*/

let _chemLocked = false;

export async function chemLock(token: string | null = null) {
  /*
  if (token !== null) {
    console.log(`Locking for ${token}`);
  }
  */
  if (_chemLocked) {
    throw(`RdKit Service usage locked:\n${(new Error()).stack}`);
  }
  _chemLocked = true;
  /*
  if (token !== null) {
    console.log(`Locked for ${token}`);
  }
   */
}

export async function chemUnlock(token: string | null = null) {
  _chemLocked = false;
  // console.log(`Unlocked for ${token}`);
}