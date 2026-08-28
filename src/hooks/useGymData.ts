import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import * as studentsApi from '../data/api/students';
import * as eventsApi from '../data/api/events';
import * as recordsApi from '../data/api/records';
import { fetchGlobalLeaderboard } from '../data/api/globalLeaderboard';
import * as billingApi from '../data/api/billing';
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

  const updateStudentClass = useMutation({
    mutationFn: ({ studentId, classLabel }: { studentId: string; classLabel: string | null }) =>
      studentsApi.updateStudentClass(studentId, classLabel),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students', gymId] }),
  });

  return {
    students: query.data ?? [],
    isLoading: query.isLoading,
    addStudent: addStudent.mutateAsync,
    deleteStudent: deleteStudent.mutateAsync,
    updateStudentClass: updateStudentClass.mutateAsync,
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

export function useSubscription() {
  const { gym } = useAuth();
  const queryClient = useQueryClient();
  const gymId = gym?.id;

  const query = useQuery({
    queryKey: ['subscription', gymId],
    queryFn: billingApi.getMySubscription,
    enabled: !!gymId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['subscription', gymId] });

  const ensureSubscription = useMutation({
    mutationFn: billingApi.ensureSubscription,
    onSuccess: invalidate,
  });

  const confirmPayment = useMutation({
    mutationFn: billingApi.confirmPayment,
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['payments', gymId] });
    },
  });

  const cancelSubscription = useMutation({
    mutationFn: billingApi.cancelSubscription,
    onSuccess: invalidate,
  });

  return {
    subscription: query.data ?? null,
    isLoading: query.isLoading,
    ensureSubscription: ensureSubscription.mutateAsync,
    confirmPayment: confirmPayment.mutateAsync,
    cancelSubscription: cancelSubscription.mutateAsync,
  };
}

export function usePayments() {
  const { gym } = useAuth();
  const gymId = gym?.id;

  const query = useQuery({
    queryKey: ['payments', gymId],
    queryFn: billingApi.listPayments,
    enabled: !!gymId,
  });

  return { payments: query.data ?? [], isLoading: query.isLoading };
}

export function useGlobalLeaderboard() {
  // Viewing is public (no login required) -- only appearing in the results
  // is gated to BASIC+ gyms, enforced server-side in the RPC itself.
  const query = useQuery({
    queryKey: ['globalLeaderboard'],
    queryFn: fetchGlobalLeaderboard,
  });

  return { entries: query.data ?? [], isLoading: query.isLoading };
}
