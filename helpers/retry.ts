export async function retry(
  promiseFactory: () => Promise<any>,
  retryCount: number
) {
  try {
    return await promiseFactory();
  } catch (error) {
    if (retryCount <= 0) {
      throw error;
    }
    return await retry(promiseFactory, retryCount - 1);
  }
}
