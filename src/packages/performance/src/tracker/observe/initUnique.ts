const instanceMap: WeakMap<object, unknown> = new WeakMap();


export function initUnique<T>(identityObj: object, ClassObj: new () => T): T {
  if (!instanceMap.get(identityObj)) {
    instanceMap.set(identityObj, new ClassObj());
  }
  return instanceMap.get(identityObj)! as T;
}
