import type { AppSettings, DocumentSet } from "../../types";
import { saveFilesToFolder } from "./save";
import { safeFileStem } from "./print";
import { getSetExchanges } from "../selectors";
import {
  buildExchangeFormsDocx,
  buildMemoDocx,
  buildOrderDocx,
} from "./word";
import {
  buildAttendanceXlsx,
  buildPaymentXlsx,
  buildScheduleXlsx,
} from "./excel";

export async function exportAllFolder(
  set: DocumentSet,
  settings: AppSettings,
): Promise<string | null> {
  const files = await Promise.all([
    buildOrderDocx(set, settings),
    buildMemoDocx(set, settings),
    buildScheduleXlsx(set, settings),
    buildAttendanceXlsx(set, settings),
    buildPaymentXlsx(set, settings),
  ]);

  if (getSetExchanges(set).length > 0) {
    files.push(await buildExchangeFormsDocx(set, settings));
  }

  return saveFilesToFolder(files, safeFileStem(set.title));
}
