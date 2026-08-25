import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import * as studentsApi from '../data/api/students';
import * as eventsApi from '../data/api/events';
import * as recordsApi from '../data/api/records';
import { fetchGlobalLeaderboard } from '../data/api/globalLeaderboard';
import { Student, EventMeta } from '../types';

export function useStudents() {
  const { gym } = useAuth();
  const queryClient = useQueryClient();
  const gymId = gym?.id;

  const query = useQuery({
    queryKey: ['students', gymId],
    queryFn: () => studentsApi.listStudents(gymId!),
    enabled: !!gymId,
  });

  const addStudent = useMutation({
    mutationFn: (student: Omit<Student, 'id'>) => studentsApi.createStudent(gymId!, student),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students', gymId] }),
  });

  const deleteStudent = useMutation({
    mutationFn: (studentId: string) => studentsApi.deleteStudent(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', gymId] });
      queryClient.invalidateQueries({ queryKey: ['records', gymId] });
    },
  });

  return {
    students: query.data ?? [],
    isLoading: query.isLoading,
    addStudent: addStudent.mutateAsync,
    deleteStudent: deleteStudent.mutateAsync,
  };
}

export function useEvents() {
  const { gym } = useAuth();
  const queryClient = useQueryClient();
  const gymId = gym?.id;

  const query = useQuery({
    queryKey: ['events', gymId],
    queryFn: () => eventsApi.listEvents(gymId!),
    enabled: !!gymId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['events', gymId] });

  const addCustomEvent = useMutation({
    mutationFn: (meta: EventMeta) => eventsApi.createEvent(gymId!, meta),
    onSuccess: invalidate,
  });

  const deleteCustomEvent = useMutation({
    mutationFn: (key: string) => eventsApi.deleteEvent(gymId!, key),
    onSuccess: invalidate,
  });

  const resetDefaultEvents = useMutation({
    mutationFn: () => eventsApi.resetEventsToDefault(gymId!),
    onSuccess: invalidate,
  });

  return {
    events: query.data ?? {},
    isLoading: query.isLoading,
    addCustomEvent: addCustomEvent.mutateAsync,
    deleteCustomEvent: deleteCustomEvent.mutateAsync,
    resetDefaultEvents: resetDefaultEvents.mutateAsync,
  };
}

export function useRecords() {
  const { gym } = useAuth();
  const queryClient = useQueryClient();
  const gymId = gym?.id;

  const query = useQuery({
    queryKey: ['records', gymId],
    queryFn: () => recordsApi.listRecords(gymId!),
    enabled: !!gymId,
  });

  const currentRecords = query.data ?? [];

  const batchSaveRecords = useMutation({
    mutationFn: (entries: recordsApi.BatchRecordEntry[]) =>
      recordsApi.batchSaveRecords(gymId!, currentRecords, entries),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['records', gymId] }),
  });

  const deleteRecord = useMutation({
    mutationFn: (recordId: string) => recordsApi.deleteRecord(recordId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['records', gymId] }),
  });

  return {
    records: currentRecords,
    isLoading: query.isLoading,
    batchSaveRecords: batchSaveRecords.mutateAsync,
    deleteRecord: deleteRecord.mutateAsync,
  };
}

export function useGlobalLeaderboard() {
  const { session } = useAuth();
  const query = useQuery({
    queryKey: ['globalLeaderboard'],
    queryFn: fetchGlobalLeaderboard,
    enabled: !!session,
  });

  return { entries: query.data ?? [], isLoading: query.isLoading };
}
