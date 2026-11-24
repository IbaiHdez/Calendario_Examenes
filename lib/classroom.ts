import { randomBytes, randomUUID } from "node:crypto";
import type { Db } from "mongodb";
import { examSchema } from "./validation";
type ClassRecord = {
  _id: string;
  name: string;
  code: string;
  teacherId: string;
  createdAt: Date;
};
type Member = { _id: string; classId: string; studentId: string };
type ExamRecord = {
  _id: string;
  classId: string;
  title: string;
  subject: string;
  date: string;
  time: string;
  description: string;
  location: string;
};
export class AccessError extends Error {
  constructor(
    message: string,
    public status = 403,
  ) {
    super(message);
  }
}
export function classroom(db: Db) {
  const classes = db.collection<ClassRecord>("classes"),
    members = db.collection<Member>("class_members"),
    exams = db.collection<ExamRecord>("exams");
  async function isTeacher(userId: string) {
    return !!(await db.collection("teachers").findOne({ userId }));
  }
  async function owns(userId: string, classId: string) {
    return (
      (await isTeacher(userId)) &&
      !!(await classes.findOne({ _id: classId, teacherId: userId }))
    );
  }
  async function canRead(userId: string, classId: string) {
    return (
      !!(await members.findOne({ classId, studentId: userId })) ||
      (await owns(userId, classId))
    );
  }
  return {
    isTeacher,
    async indexes() {
      await Promise.all([
        classes.createIndex({ code: 1 }, { unique: true }),
        classes.createIndex({ teacherId: 1 }),
        members.createIndex({ classId: 1, studentId: 1 }, { unique: true }),
        members.createIndex({ studentId: 1 }),
        exams.createIndex({ classId: 1, date: 1 }),
        db.collection("teachers").createIndex({ userId: 1 }, { unique: true }),
        db
          .collection("join_limits")
          .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      ]);
    },
    async list(userId: string) {
      const teacher = await isTeacher(userId);
      const joined = await members.find({ studentId: userId }).toArray();
      const records = await classes
        .find({
          $or: [
            { _id: { $in: joined.map((m) => m.classId) } },
            ...(teacher ? [{ teacherId: userId }] : []),
          ],
        })
        .sort({ createdAt: 1 })
        .toArray();
      return {
        role: teacher ? "teacher" : "student",
        classes: records.map((c) => ({
          id: c._id,
          name: c.name,
          code: c.code,
          role: teacher && c.teacherId === userId ? "teacher" : "student",
        })),
      };
    },
    async create(userId: string, name: string) {
      if (!(await isTeacher(userId)))
        throw new AccessError(
          "Solo un profesor autorizado puede crear clases.",
        );
      if (!name.trim() || name.length > 70)
        throw new AccessError("Nombre no válido.", 400);
      const id = randomUUID();
      await classes.insertOne({
        _id: id,
        name: name.trim(),
        code: randomBytes(6).toString("hex").toUpperCase(),
        teacherId: userId,
        createdAt: new Date(),
      });
      return id;
    },
    async join(userId: string, code: string) {
      const window = Math.floor(Date.now() / 60000),
        limits = db.collection<{ _id: string; count: number; expiresAt: Date }>(
          "join_limits",
        );
      const limit = await limits.findOneAndUpdate(
        { _id: userId + ":" + window },
        {
          $inc: { count: 1 },
          $setOnInsert: { expiresAt: new Date(Date.now() + 120000) },
        },
        { upsert: true, returnDocument: "after" },
      );
      if ((limit?.count || 0) > 10)
        throw new AccessError("Demasiados intentos. Espera un minuto.", 429);
      const group = await classes.findOne({ code: code.trim().toUpperCase() });
      if (!group)
        throw new AccessError("No encontramos una clase con ese código.", 404);
      await members.updateOne(
        { classId: group._id, studentId: userId },
        {
          $setOnInsert: {
            _id: randomUUID(),
            classId: group._id,
            studentId: userId,
          },
        },
        { upsert: true },
      );
      return group._id;
    },
    async events(userId: string, classId: string) {
      if (!(await canRead(userId, classId)))
        throw new AccessError("No tienes acceso a esta clase.");
      return (
        await exams.find({ classId }).sort({ date: 1, time: 1 }).toArray()
      ).map(({ _id, ...e }) => ({
        ...e,
        id: _id,
        type: "Examen",
        author: "Profesor",
      }));
    },
    async save(userId: string, classId: string, input: unknown) {
      if (!(await owns(userId, classId)))
        throw new AccessError("Solo el profesor de esta clase puede editarla.");
      const { id, type, ...values } = examSchema.parse(input);
      if (id) {
        const r = await exams.updateOne({ _id: id, classId }, { $set: values });
        if (!r.matchedCount)
          throw new AccessError("El examen ya no existe.", 404);
        return id;
      } else {
        const createdId = randomUUID();
        await exams.insertOne({ _id: createdId, classId, ...values });
        return createdId;
      }
    },
    async remove(userId: string, classId: string, id: string) {
      if (!(await owns(userId, classId)))
        throw new AccessError("Solo el profesor de esta clase puede editarla.");
      const r = await exams.deleteOne({ _id: id, classId });
      if (!r.deletedCount)
        throw new AccessError("El examen ya no existe.", 404);
    },
  };
}
