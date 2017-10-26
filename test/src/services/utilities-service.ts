export const getListener = (eventName: string, element: HTMLElment): Promise => {
  let _resolve, listener;
  const promise = new Promise((resolve, reject) => {
    _resolve = resolve;
  });
  listener = (e: Event) => {
    element.removeEventListener(eventName, listener);
    _resolve();
  }
  element.addEventListener(eventName, listener);
  return promise;
};

export const randomIndex = (l: number): number => Math.round((l - 1) * Math.random());
