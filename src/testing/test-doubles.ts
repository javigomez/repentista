export type Clock = () => Date;

export function fixedClock(isoTimestamp: string): Clock {
  const timestamp = new Date(isoTimestamp);

  if (Number.isNaN(timestamp.getTime())) {
    throw new Error(`Invalid test timestamp: ${isoTimestamp}`);
  }

  return () => new Date(timestamp.getTime());
}

export function sequenceDouble<T>(values: readonly T[]): () => T {
  let index = 0;

  return () => {
    const value = values[index];

    if (value === undefined) {
      throw new Error("Test double sequence exhausted");
    }

    index += 1;
    return value;
  };
}
