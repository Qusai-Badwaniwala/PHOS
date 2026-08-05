import { ExamStatus, type Exam } from "@/shared/types";
import { startOfLocalDay } from "@/shared/utils";
import type { ExamCreate, IExamRepository, PastExamRecord } from "../interfaces/IExamRepository";
import { generateId, getDatabase, type StoredExam } from "./database";

/**
 * IndexedDB implementation of `IExamRepository`.
 *
 * Dates are stored as ISO strings, matching every other store, and
 * converted at this boundary so nothing above the repository handles a
 * string where it expects a `Date`.
 */
export class BrowserExamRepository implements IExamRepository {
  async findAll(): Promise<readonly Exam[]> {
    const db = await getDatabase();
    const records = await db.getAll("exams");
    // Undated records sort last. They are always retrospective, so
    // "some time before PHOS" genuinely is the least specific position
    // available and putting them anywhere else would imply a precision
    // the user did not give.
    return records
      .map(toDomainExam)
      .sort((a, b) => (a.examDate?.getTime() ?? Infinity) - (b.examDate?.getTime() ?? Infinity));
  }

  async findById(id: string): Promise<Exam | null> {
    const db = await getDatabase();
    const record = await db.get("exams", id);
    return record ? toDomainExam(record) : null;
  }

  async findActive(referenceDate: Date): Promise<Exam | null> {
    /*
     * "Not passed" is measured against the start of the exam day, not
     * the moment it is asked. An exam at 9am is still the thing the user
     * is preparing for at 8am, and a schedule that vanished at midnight
     * would take the plan with it on the one morning it matters most.
     */
    const today = startOfLocalDay(referenceDate).getTime();
    const scheduled = (await this.findAll()).filter(
      (exam) =>
        exam.status === ExamStatus.Scheduled &&
        // An exam with no date cannot be prepared for. Only a
        // retrospective record reaches that state, and those are
        // `Passed` already, but the check is here rather than assumed
        // so a malformed row can never become the active exam.
        exam.examDate !== null &&
        startOfLocalDay(exam.examDate).getTime() >= today,
    );
    return scheduled[0] ?? null;
  }

  async create(exam: ExamCreate): Promise<Exam> {
    const db = await getDatabase();
    const now = new Date();
    const record: StoredExam = {
      id: generateId(),
      stage: exam.stage,
      juzNumbers: [...exam.juzNumbers].sort((a, b) => a - b),
      examDate: exam.examDate.toISOString(),
      includeNewMemorization: exam.includeNewMemorization,
      status: ExamStatus.Scheduled,
      recordedAsPast: false,
      scheduledAt: now.toISOString(),
      passedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await db.add("exams", record);
    return toDomainExam(record);
  }

  async recordPast(record: PastExamRecord): Promise<Exam> {
    const db = await getDatabase();
    const now = new Date();
    const stored: StoredExam = {
      id: generateId(),
      stage: record.stage,
      juzNumbers: [...record.juzNumbers].sort((a, b) => a - b),
      examDate: record.examDate ? record.examDate.toISOString() : null,
      // Nothing was scheduled, so there was no run-up to make this
      // choice about. `false` is the inert value, not a claim.
      includeNewMemorization: false,
      status: ExamStatus.Passed,
      recordedAsPast: true,
      scheduledAt: now.toISOString(),
      /*
       * `passedAt` is the exam's own date when one was given, and only
       * falls back to "now" when it was not. It is the field the
       * aftermath window reads, so dating a 2024 exam as passed today
       * would make PHOS announce what fell behind during a run-up it
       * never ran. `recordedAsPast` closes that door properly; this
       * keeps the stored fact honest regardless.
       */
      passedAt: (record.examDate ?? now).toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await db.add("exams", stored);
    return toDomainExam(stored);
  }

  async updateStatus(id: string, status: ExamStatus, passedAt: Date | null): Promise<Exam> {
    const db = await getDatabase();
    const tx = db.transaction("exams", "readwrite");
    const record = await tx.store.get(id);

    if (!record) {
      await tx.done;
      throw new Error(`No exam found with id "${id}".`);
    }

    const updated: StoredExam = {
      ...record,
      status,
      passedAt: passedAt ? passedAt.toISOString() : null,
      updatedAt: new Date().toISOString(),
    };
    await tx.store.put(updated);
    await tx.done;

    return toDomainExam(updated);
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.delete("exams", id);
  }

  async deleteAll(): Promise<number> {
    const db = await getDatabase();
    const tx = db.transaction("exams", "readwrite");
    const count = await tx.store.count();
    await tx.store.clear();
    await tx.done;
    return count;
  }
}

function toDomainExam(record: StoredExam): Exam {
  return {
    id: record.id,
    stage: record.stage,
    juzNumbers: [...record.juzNumbers].sort((a, b) => a - b),
    examDate: record.examDate ? new Date(record.examDate) : null,
    includeNewMemorization: record.includeNewMemorization,
    status: record.status as ExamStatus,
    // Records written before this field existed were all exams PHOS
    // scheduled, which is exactly what `false` means.
    recordedAsPast: record.recordedAsPast ?? false,
    scheduledAt: new Date(record.scheduledAt),
    passedAt: record.passedAt ? new Date(record.passedAt) : null,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}
