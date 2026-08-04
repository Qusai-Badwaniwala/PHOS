import { ConfidenceLevel, SessionType } from "@/shared/types";
import {
  validateBoolean,
  validateEnum,
  validateIdentifier,
  validateNumericRange,
  validateRequestShape,
  validateString,
} from "@/validators";
import type {
  ConfidenceSubmissionRequestDTO,
  RecallSubmissionRequestDTO,
  SessionFinishRequestDTO,
  SessionStartRequestDTO,
} from "./session.dto";
import type { UpdateSettingsRequestDTO } from "./settings.dto";

const SESSION_TYPE_VALUES = Object.values(SessionType);
const CONFIDENCE_VALUES = Object.values(ConfidenceLevel);

export function validateSessionStartRequest(
  body: unknown,
  correlationId: string,
): SessionStartRequestDTO {
  const record = validateRequestShape(
    body,
    ["sessionType", "availableStudyMinutes"],
    ["sessionType", "availableStudyMinutes"],
    correlationId,
  );
  return {
    sessionType: validateEnum(
      record.sessionType,
      SESSION_TYPE_VALUES,
      "sessionType",
      correlationId,
    ),
    availableStudyMinutes: validateNumericRange(
      record.availableStudyMinutes,
      "availableStudyMinutes",
      { min: 1, max: 24 * 60 },
      correlationId,
    ),
  };
}

export function validateRecallSubmissionRequest(
  body: unknown,
  correlationId: string,
): RecallSubmissionRequestDTO {
  const record = validateRequestShape(
    body,
    ["sessionId", "pageId", "successfulRecall", "durationSeconds"],
    ["sessionId", "pageId", "successfulRecall", "durationSeconds"],
    correlationId,
  );
  return {
    sessionId: validateIdentifier(record.sessionId, "sessionId", correlationId),
    pageId: validateIdentifier(record.pageId, "pageId", correlationId),
    successfulRecall: validateBoolean(record.successfulRecall, "successfulRecall", correlationId),
    durationSeconds: validateNumericRange(
      record.durationSeconds,
      "durationSeconds",
      { min: 0, max: 3600 },
      correlationId,
    ),
  };
}

export function validateConfidenceSubmissionRequest(
  body: unknown,
  correlationId: string,
): ConfidenceSubmissionRequestDTO {
  const record = validateRequestShape(
    body,
    ["sessionId", "pageId", "confidence"],
    ["sessionId", "pageId", "confidence"],
    correlationId,
  );
  return {
    sessionId: validateIdentifier(record.sessionId, "sessionId", correlationId),
    pageId: validateIdentifier(record.pageId, "pageId", correlationId),
    confidence: validateEnum(record.confidence, CONFIDENCE_VALUES, "confidence", correlationId),
  };
}

export function validateSessionFinishRequest(
  body: unknown,
  correlationId: string,
): SessionFinishRequestDTO {
  const record = validateRequestShape(body, ["sessionId"], ["sessionId"], correlationId);
  return {
    sessionId: validateIdentifier(record.sessionId, "sessionId", correlationId),
  };
}

export function validateUpdateSettingsRequest(
  body: unknown,
  correlationId: string,
): UpdateSettingsRequestDTO {
  const record = validateRequestShape(
    body,
    [],
    ["theme", "ayahRotationFrequency", "personalization"],
    correlationId,
  );

  const result: {
    theme?: string;
    ayahRotationFrequency?: number;
  } = {};

  if (record.theme !== undefined) {
    result.theme = validateString(
      record.theme,
      "theme",
      { minLength: 1, maxLength: 50 },
      correlationId,
    );
  }
  if (record.ayahRotationFrequency !== undefined) {
    result.ayahRotationFrequency = validateNumericRange(
      record.ayahRotationFrequency,
      "ayahRotationFrequency",
      { min: 0, max: 1000, integer: true },
      correlationId,
    );
  }

  return result;
}
