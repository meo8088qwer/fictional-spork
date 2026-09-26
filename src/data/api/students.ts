import { supabase } from '../../lib/supabaseClient';
import { Student } from '../../types';
import { throwOnDbError } from './errors';

function mapStudentRow(row: any): Student {
  return {
    id: row.id,
    studentNo: row.student_no,
    name: row.name,
    grade: row.grade,
    gender: row.gender,
    avatarColor: row.avatar_color,
    joinDate: row.join_date,
    notes: row.notes ?? undefined,
    classLabel: row.branch_name ?? undefined,
  };
}

export async function listStudents(gymId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapStudentRow);
}

function toStudentRow(gymId: string, student: Omit<Student, 'id'>) {
  return {
    gym_id: gymId,
    student_no: student.studentNo,
    name: student.name,
    grade: student.grade,
    gender: student.gender,
    avatar_color: student.avatarColor,
    join_date: student.joinDate,
    notes: student.notes ?? null,
    branch_name: student.classLabel ?? null,
  };
}

export async function createStudent(gymId: string, student: Omit<Student, 'id'>): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .insert(toStudentRow(gymId, student))
    .select('*')
    .single();
  throwOnDbError(error);
  return mapStudentRow(data);
}

// One statement, so the plan-limit trigger makes it all-or-nothing.
export async function createStudents(gymId: string, students: Omit<Student, 'id'>[]): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .insert(students.map((s) => toStudentRow(gymId, s)))
    .select('*');
  throwOnDbError(error);
  return (data ?? []).map(mapStudentRow);
}

export async function deleteStudent(studentId: string): Promise<void> {
  const { error } = await supabase.from('students').delete().eq('id', studentId);
  if (error) throw error;
}

export async function updateStudentClass(studentId: string, classLabel: string | null): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .update({ branch_name: classLabel })
    .eq('id', studentId)
    .select('*')
    .single();
  throwOnDbError(error);
  return mapStudentRow(data);
}
