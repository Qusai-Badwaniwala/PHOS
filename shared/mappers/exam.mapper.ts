import type {
  Exam,
  ExamAftermath,
  ExamCoverageDay,
  ExamPlan,
  ExamStageProgress,
} from "@/shared/types";
import { describeJuzScope } from "@/shared/constants";
import type {
  ExamAftermathDTO,
  ExamCoverageDayDTO,
  ExamDTO,
  ExamPlanDTO,
  ExamStageDTO,
} from "@/shared/dto";

export function toExamDTO(exam: Exam): ExamDTO {
  return {
    id: exam.id,
    stage: exam.stage,
    juzNumbers: exam.juzNumbers,
    // Derived here rather than stored, so a scope and its label can
    // never disagree.
    scopeLabel: describeJuzScope(exam.juzNumbers),
    examDate: exam.examDate ? exam.examDate.toISOString() : null,
    includeNewMemorization: exam.includeNewMemorization,
    recordedAsPast: exam.recordedAsPast,
    status: exam.status,
    passedAt: exam.passedAt ? exam.passedAt.toISOString() : null,
  };
}

export function toExamStageDTO(stage: ExamStageProgress): ExamStageDTO {
  return {
    stage: stage.stage,
    juzNumbers: stage.juzNumbers,
    label: stage.label,
    state: stage.state,
    pagesMemorized: stage.pagesMemorized,
    pagesInScope: stage.pagesInScope,
    examId: stage.examId,
    examDate: stage.examDate ? stage.examDate.toISOString() : null,
  };
}

export function toExamPlanDTO(plan: ExamPlan): ExamPlanDTO {
  return {
    examId: plan.examId,
    examDate: plan.examDate.toISOString(),
    daysRemaining: plan.daysRemaining,
    pagesInScope: plan.pagesInScope,
    todaysPageNumbers: plan.todaysPageNumbers,
    pagesPerDay: plan.pagesPerDay,
    exceedsDailyBudget: plan.exceedsDailyBudget,
    estimatedMinutesPerDay: plan.estimatedMinutesPerDay,
  };
}

export function toExamCoverageDayDTO(day: ExamCoverageDay): ExamCoverageDayDTO {
  return { date: day.date.toISOString(), pageNumbers: day.pageNumbers };
}

export function toExamAftermathDTO(aftermath: ExamAftermath): ExamAftermathDTO {
  return {
    pagesFallenBehind: aftermath.pagesFallenBehind,
    weakestPageNumbers: aftermath.weakestPageNumbers,
  };
}
