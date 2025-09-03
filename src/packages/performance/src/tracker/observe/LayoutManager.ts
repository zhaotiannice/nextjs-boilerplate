

export class LayoutShiftManager {
  _onAfterProcessingUnexpectedShift?: (entry) => void;

  _sessionValue = 0;
  _sessionEntries: any[] = [];

  _processEntry(entry) {
    // Only count layout shifts without recent user input.
    if (entry.hadRecentInput) return;

    const firstSessionEntry = this._sessionEntries[0];
    const lastSessionEntry = this._sessionEntries.at(-1);


    if (
      this._sessionValue &&
      firstSessionEntry &&
      lastSessionEntry &&
      entry.startTime - lastSessionEntry.startTime < 1000 &&
      entry.startTime - firstSessionEntry.startTime < 5000
    ) {
      this._sessionValue += entry.value;
      this._sessionEntries.push(entry);
    } else {
      this._sessionValue = entry.value;
      this._sessionEntries = [entry];
    }

    this._onAfterProcessingUnexpectedShift?.(entry);
  }
}
